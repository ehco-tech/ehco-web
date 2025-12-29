// src/app/[publicFigure]/page.tsx
import { Suspense } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/config/firebase';
import { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Loader2 } from 'lucide-react';
import HeroSection from '@/components/figure/HeroSection';
import BasicAndLinksSection from '@/components/figure/BasicAndLinksSection';
import PublicFigureContent from '@/components/figure/PublicFigureContent';
import CareerJourney from '@/components/figure/career/CareerJourney';
import DiscographySection from '@/components/figure/discography/DiscographySection';
import FilmographySection from '@/components/figure/filmography/FilmographySection';
import CurationContent from '@/components/curation/CurationContent';
import type { JsonLdObject } from '@/components/common/JsonLd';
import JsonLd from '@/components/common/JsonLd';
import { getArticlesByIds } from '@/lib/services/articles/article-service';
import { notFound } from 'next/navigation';
import { getSpotifyData } from '@/lib/api/spotify/data-reader';
import { getTMDbData } from '@/lib/api/tmdb/data-reader';
import PublicFigurePageWrapper from '@/components/figure/PublicFigurePageWrapper';
import ScrollNavigation from '@/components/figure/ScrollNavigation';

// --- IMPORTED TYPES ---
import {
    ApiContentResponse,
    CuratedEvent,
    TimelineContent,
    CurationData
} from '@/types/definitions';


// --- PAGE-SPECIFIC TYPES (EXPORTED FOR COMPONENTS) ---
export interface PublicFigureBase {
    id: string;
    name: string;
    name_kr: string;
    nationality: string;
    occupation: string[];
    profilePic?: string;
    companyUrl?: string;
    instagramUrl?: string;
    spotifyUrl?: string[];
    tmdbUrl?: string;
    youtubeUrl?: string;
    lastUpdated?: string;
    gender: string;
    company?: string;
    debutDate?: string;
    related_figures?: Record<string, number>;

    // Additional fields used in components
    yearsActive?: string;
    fandomName?: string;
    officialColors?: string;
    website?: string;
    instagramLink?: string;
    instagramFollowers?: string;
    spotifyMonthlyListeners?: string;
    youtubeLink?: string;
    youtubeSubscribers?: string;
    twitterLink?: string;
    twitterFollowers?: string;
    tiktokLink?: string;
    tiktokFollowers?: string;
    weverseLink?: string;
    berrizLink?: string;
    fansLink?: string;
    totalAwards?: string;
    tmdb_id?: number | null;
    tmdb_verified?: boolean;
    tmdb_verified_at?: string;
    tmdb_verified_name?: string;
    tmdb_also_known_as?: string[];
}

export interface IndividualPerson extends PublicFigureBase {
    is_group: false;
    birthDate?: string;
    chineseZodiac?: string;
    group?: string;
    school?: string[];
    zodiacSign?: string;
}

export interface GroupProfile extends PublicFigureBase {
    is_group: true;
    members?: IndividualPerson[];
    group?: string; // For unit figures
}

export type PublicFigure = IndividualPerson | GroupProfile;

// --- UI COMPONENTS ---

const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
        <div className="bg-white dark:bg-[#1d1d1f] p-6 rounded-lg flex items-center space-x-3">
            <Loader2 className="animate-spin text-slate-600 dark:text-white" size={24} />
            <span className="text-slate-600 dark:text-white font-medium">Loading...</span>
        </div>
    </div>
);


// --- NEXT.JS CONFIG ---

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
}

export async function generateMetadata({ params }: { params: Promise<{ publicFigure: string }> }): Promise<Metadata> {
    const resolvedParams = await params;
    try {
        const publicFigureData = await getPublicFigureData(resolvedParams.publicFigure);

        const primaryOccupation = publicFigureData.occupation[0] || '';
        const baseTitle = `${publicFigureData.name} (${publicFigureData.name_kr})`;
        const title = publicFigureData.is_group
            ? `${baseTitle} - K-Pop Group Profile & Timeline`
            : `${baseTitle} - ${primaryOccupation} Profile & Timeline`;

        const figureName = publicFigureData.name;
        const description = publicFigureData.is_group
            ? `Explore the complete profile for ${figureName}. Discover members, debut history, discography, and a real-time timeline of verified news on EHCO.`
            : `Who is ${figureName}? Get their official profile, full biography, career timeline, and the latest fact-checked news and updates on EHCO.`;

        return {
            title,
            description,
            keywords: [
                publicFigureData.name,
                publicFigureData.name_kr,
                `${publicFigureData.name} profile`,
                `${publicFigureData.name} timeline`,
                `${publicFigureData.name} facts`,
                `${publicFigureData.name} news`,
                ...publicFigureData.occupation.map(occ => `${publicFigureData.name} ${occ}`),
                `${publicFigureData.nationality} ${primaryOccupation}`,
                ...(publicFigureData.is_group
                    ? ['kpop group', 'korean idol group', 'kpop group profiles']
                    : ['kpop idol', 'korean celebrity', 'korean actor', 'korean singer'])
            ],
            alternates: { canonical: `https://ehco.ai/${resolvedParams.publicFigure}` },
            openGraph: {
                title: title,
                description,
                url: `https://ehco.ai/${resolvedParams.publicFigure}`,
                siteName: 'EHCO',
                type: 'profile',
                images: publicFigureData.profilePic ? [{
                    url: publicFigureData.profilePic,
                    width: 800,
                    height: 800,
                    alt: `${publicFigureData.name}'s profile picture`,
                }] : [],
            },
            twitter: {
                card: 'summary_large_image',
                title: title,
                description,
                images: publicFigureData.profilePic ? [publicFigureData.profilePic] : [],
            }
        }
    } catch (error) {
        return {
            title: 'Profile Not Found - EHCO',
            description: 'The profile you are looking for could not be found.',
        }
    }
}


// --- DATA FETCHING FUNCTIONS ---

async function getPublicFigureData(publicFigureSlug: string): Promise<PublicFigure> {
    const figuresRef = collection(db, 'selected-figures');

    // Handle special case for &team: both %26team and team should work
    let searchSlug = decodeURIComponent(publicFigureSlug.toLowerCase());

    // If someone accesses /%26team, we want to search for the 'team' slug in database
    // but if they access /team, we also want it to work for &team
    if (searchSlug === '&team') {
        searchSlug = 'team'; // Search for the existing 'team' slug in database
    }

    const q = query(figuresRef, where('slug', '==', searchSlug));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        throw new Error('Public figure not found');
    }

    const docSnap = querySnapshot.docs[0];

    const data = docSnap.data();
    const publicFigureData: Partial<PublicFigure> = {
        id: docSnap.id,
        name: data.name || '',
        name_kr: data.name_kr || '',
        gender: data.gender || '',
        nationality: data.nationality || '',
        occupation: data.occupation || [],
        is_group: Boolean(data.is_group),
        profilePic: data.profilePic || '',
        companyUrl: data.companyUrl || '',
        instagramUrl: data.instagramUrl || '',
        spotifyUrl: data.spotifyUrl || [],
        tmdbUrl: data.tmdbUrl || '',
        youtubeUrl: data.youtubeUrl || '',
        company: data.company || '',
        debutDate: data.debutDate || '',
        lastUpdated: data.lastUpdated || '',
        related_figures: data.related_figures || {},
        fandomName: data.fandomeName || '',
        officialColors: data.officialColors || '',
        instagramLink: data.instagramLink || '',
        instagramFollowers: data.instagramFollowers || '',
        spotifyMonthlyListeners: data.spotifyMonthlyListeners || '',
        youtubeLink: data.youtubeLink || '',
        youtubeSubscribers: data.youtubeSubscribers || '',
        twitterLink: data.twitterLink || '',
        twitterFollowers: data.twitterFollowers || '',
        tiktokLink: data.tiktokLink || '',
        tiktokFollowers: data.tiktokFollowers || '',
        weverseLink: data.weverseLink || '',
        berrizLink: data.berrizLink || '',
        fansLink: data.fansLink || '',
        totalAwards: data.totalAwards || '',
        tmdb_id: data.tmdb_id || null,
        tmdb_verified: data.tmdb_verified || false,
        tmdb_verified_at: data.tmdb_verified_at || '',
        tmdb_verified_name: data.tmdb_verified_name || '',
        tmdb_also_known_as: data.tmdb_also_known_as || [],
    };

    if (publicFigureData.is_group) {
        (publicFigureData as GroupProfile).members = data.members || [];
        // For unit figures, also populate the group field
        if (data.gender === 'unit') {
            (publicFigureData as GroupProfile).group = data.group || '';
        }
    } else {
        (publicFigureData as IndividualPerson).birthDate = data.birthDate || '';
        (publicFigureData as IndividualPerson).chineseZodiac = data.chineseZodiac || '';
        (publicFigureData as IndividualPerson).group = data.group || '';
        (publicFigureData as IndividualPerson).school = data.school || [];
        (publicFigureData as IndividualPerson).zodiacSign = data.zodiacSign || '';
    }

    if (!publicFigureData.name || !publicFigureData.gender || !publicFigureData.nationality) {
        throw new Error('Invalid public figure data');
    }

    return publicFigureData as PublicFigure;
}

async function getPublicFigureContent(publicFigureId: string): Promise<ApiContentResponse> {
    const headersList = await headers();
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = headersList.get('host') || 'localhost:3000';

    try {
        const contentResponse = await fetch(
            `${protocol}://${host}/api/public-figure-content/${encodeURIComponent(publicFigureId)}`,
            { cache: 'force-cache', next: { revalidate: 3600 } }
        );
        if (!contentResponse.ok) throw new Error('Failed to fetch content');
        return await contentResponse.json();
    } catch (error) {
        console.error('Error fetching public figure content:', error);
        return {
            main_overview: { id: 'main-overview', content: '', articleIds: [] },
            timeline_content: {
                data: {}
            }
        };
    }
}

async function getCurationData(publicFigureId: string): Promise<CurationData | null> {
    try {
        const figureRef = doc(db, 'selected-figures', publicFigureId);
        const figureDoc = await getDoc(figureRef);

        if (!figureDoc.exists()) {
            return null;
        }

        const data = figureDoc.data();
        const curationData = data.curation_data as CurationData | undefined;

        return curationData || null;
    } catch (error) {
        console.error('Error fetching curation data:', error);
        return null;
    }
}

// --- HELPER FUNCTIONS ---

/**
 * Count total number of events across all categories and subcategories
 */
function countTotalEvents(timelineData: TimelineContent['data']): number {
    let total = 0;

    Object.values(timelineData).forEach(mainCategory => {
        Object.values(mainCategory.subCategories).forEach(events => {
            total += events.length;
        });
    });

    return total;
}

// --- WRAPPER COMPONENTS ---

async function TimelineSection({
    timelineContent,
    uniqueArticleIds,
    figureId,
    figureName,
    figureNameKr,
    totalEventCount
}: {
    timelineContent: TimelineContent;
    uniqueArticleIds: string[];
    figureId: string;
    figureName: string;
    figureNameKr: string;
    totalEventCount: number;
}) {
    // Load ALL articles here - this component loads separately via Suspense
    const articles = await getArticlesByIds(uniqueArticleIds);
    const serializedArticles = JSON.parse(JSON.stringify(articles));

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold mb-6 text-key-color dark:text-key-color-dark">Career Timeline</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Comprehensive chronicle of {figureName}&apos;s journey to global stardom</p>
            <CareerJourney
                apiResponse={timelineContent}
                articles={serializedArticles}
                allArticleIds={uniqueArticleIds}
                figureId={figureId}
                figureName={figureName}
                figureNameKr={figureNameKr}
                totalEventCount={totalEventCount}
            />
        </div>
    );
}

async function DiscographySectionWrapper({
    artistName,
    figureId
}: {
    artistName: string;
    figureId: string
}) {
    try {
        // Simply read spotify_data from database - no API calls, no cache checking
        const spotifyData = await getSpotifyData(figureId);

        if (spotifyData) {
            return (
                <DiscographySection
                    albums={spotifyData.allAlbums}
                    artistAlbums={spotifyData.byArtist}
                    artistName={artistName}
                />
            );
        }

        // No data found in database
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Discography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Chart-topping albums and singles that defined a generation</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No discography data available for {artistName}.
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error loading Spotify discography:', error);
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Discography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Chart-topping albums and singles that defined a generation</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        Unable to load discography at this time.
                    </div>
                </div>
            </div>
        );
    }
}

interface FilmographySectionWrapperProps {
    figureId: string;
    personName: string;
}

async function FilmographySectionWrapper({
    figureId,
    personName
}: FilmographySectionWrapperProps) {
    try {
        // Simply read tmdb_data from database - no API calls, no cache checking
        const tmdbData = await getTMDbData(figureId);

        if (tmdbData) {
            return (
                <FilmographySection
                    cast={tmdbData.cast}
                    crew={tmdbData.crew}
                    personName={personName}
                />
            );
        }

        // No data found in database
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Filmography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No filmography data available for {personName}.
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error loading TMDb filmography:', error);
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Filmography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        Unable to load filmography at this time.
                    </div>
                </div>
            </div>
        );
    }
}

// --- MAIN CONTENT COMPONENT ---

async function PublicFigurePageContent({ publicFigureId }: { publicFigureId: string }) {
    // console.log('Parent component rendering at',new Date().toISOString());
    try {
        const publicFigureData = await getPublicFigureData(publicFigureId);
        const apiResponse = await getPublicFigureContent(publicFigureData.id);

        // Use Set from the start to avoid duplicate IDs and expensive filtering
        const allArticleIdsSet = new Set<string>();

        // Add main overview article IDs
        const mainOverviewIds = apiResponse.main_overview.articleIds || [];

        for (let i = 0; i < mainOverviewIds.length; i++) {
            const id = mainOverviewIds[i];
            if (typeof id === 'string' && id.length > 0) {
                allArticleIdsSet.add(id);
            }
        }

        // Manual iteration to avoid .flatMap() and .flat() which can cause stack overflow
        // Iterate through main categories
        const mainCategories = Object.values(apiResponse.timeline_content.data);

        for (let i = 0; i < mainCategories.length; i++) {
            const mainCatData = mainCategories[i];
            if (!mainCatData || typeof mainCatData !== 'object' || !('subCategories' in mainCatData)) {
                continue;
            }

            const subCategories = (mainCatData as { subCategories: Record<string, CuratedEvent[]> }).subCategories;
            const subCategoryValues = Object.values(subCategories);

            // Iterate through subcategories
            for (let j = 0; j < subCategoryValues.length; j++) {
                const eventList = subCategoryValues[j];
                if (!Array.isArray(eventList)) continue;

                // Iterate through events in each subcategory
                for (let k = 0; k < eventList.length; k++) {
                    const event = eventList[k];

                    // Collect source IDs from event.sources
                    if (event.sources && Array.isArray(event.sources)) {
                        for (let m = 0; m < event.sources.length; m++) {
                            const source = event.sources[m];
                            if (source && typeof source.id === 'string' && source.id.length > 0) {
                                allArticleIdsSet.add(source.id);
                            }
                        }
                    }

                    // Collect source IDs from timeline_points
                    if (event.timeline_points && Array.isArray(event.timeline_points)) {
                        for (let n = 0; n < event.timeline_points.length; n++) {
                            const point = event.timeline_points[n];
                            if (point && point.sourceIds && Array.isArray(point.sourceIds)) {
                                for (let p = 0; p < point.sourceIds.length; p++) {
                                    const id = point.sourceIds[p];
                                    if (typeof id === 'string' && id.length > 0) {
                                        allArticleIdsSet.add(id);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Convert Set to Array without spread operator to avoid stack overflow
        const uniqueArticleIds = Array.from(allArticleIdsSet);

        // Load initial batch of articles for modal (first 50%)
        // This ensures the modal can show immediately with data
        const initialBatchSize = Math.ceil(uniqueArticleIds.length / 2);
        const initialArticleIds = uniqueArticleIds.slice(0, initialBatchSize);
        const initialArticles = await getArticlesByIds(initialArticleIds);
        const serializedInitialArticles = JSON.parse(JSON.stringify(initialArticles));

        // Fetch Spotify artist names from database
        let spotifyArtistNames: string[] = [];
        if (publicFigureData.spotifyUrl && publicFigureData.spotifyUrl.length > 0) {
            try {
                const spotifyData = await getSpotifyData(publicFigureData.id);
                if (spotifyData) {
                    spotifyArtistNames = spotifyData.byArtist.map((artist: { artistName: string }) => artist.artistName);
                }
            } catch (error) {
                console.error('Error fetching Spotify artist names:', error);
            }
        }

        const schemaData = publicFigureData.is_group
            ? {
                "@context": "https://schema.org",
                "@type": "MusicGroup",
                name: publicFigureData.name,
                alternateName: publicFigureData.name_kr || null,
                nationality: publicFigureData.nationality,
                url: `https://ehco.ai/${publicFigureId}`,
                sameAs: [publicFigureData.instagramUrl, publicFigureData.spotifyUrl, publicFigureData.youtubeUrl].filter(Boolean) as string[],
                ...(publicFigureData.company ? { "memberOf": { "@type": "Organization", "name": publicFigureData.company } } : {}),
                ...(publicFigureData.debutDate ? { "foundingDate": publicFigureData.debutDate.split(':')[0].trim() } : {}),
                ...((publicFigureData as GroupProfile).members && (publicFigureData as GroupProfile).members!.length > 0 && {
                    "member": (publicFigureData as GroupProfile).members!.map(member => ({
                        "@type": "Person",
                        "birthDate": member.birthDate ? member.birthDate.split(':')[0].trim() : null,
                    }))
                }),
            } as JsonLdObject
            : {
                "@context": "https://schema.org",
                "@type": "Person",
                name: publicFigureData.name,
                alternateName: publicFigureData.name_kr || null,
                gender: publicFigureData.gender,
                nationality: publicFigureData.nationality,
                "jobTitle": publicFigureData.occupation.join(', '),
                url: `https://ehco.ai/${publicFigureId}`,
                sameAs: [publicFigureData.instagramUrl, publicFigureData.spotifyUrl, publicFigureData.youtubeUrl].filter(Boolean) as string[],
                ...(!publicFigureData.is_group && (publicFigureData as IndividualPerson).birthDate ? { "birthDate": (publicFigureData as IndividualPerson).birthDate!.split(':')[0].trim() } : {}),
                ...(!publicFigureData.is_group && (publicFigureData as IndividualPerson).group ? { "memberOf": { "@type": "MusicGroup", "name": (publicFigureData as IndividualPerson).group! } } : {}),
                ...(publicFigureData.company ? { "affiliation": { "@type": "Organization", "name": publicFigureData.company } } : {})
            } as JsonLdObject;

        // Fetch curation data
        const curationData = await getCurationData(publicFigureData.id);

        // Serialize all data before passing to client components
        const serializedPublicFigure = JSON.parse(JSON.stringify(publicFigureData));
        const serializedApiResponse = JSON.parse(JSON.stringify(apiResponse));
        const serializedCurationData = curationData ? JSON.parse(JSON.stringify(curationData)) : null;

        // Calculate total event count for tab ordering and display
        const totalEventCount = countTotalEvents(apiResponse.timeline_content.data);

        // Build tabs array conditionally based on available data
        // Order Timeline and Curation based on event count:
        // - If < 20 events: Curation first, then Timeline
        // - If >= 20 events: Timeline first, then Curation
        const tabs = [];

        if (totalEventCount < 20 && serializedCurationData) {
            // Curation first when there are few timeline events
            tabs.push({ id: 'curation', label: 'Curation' });
            tabs.push({ id: 'timeline', label: 'Timeline' });
        } else {
            // Timeline first when there are many events (or no curation data)
            tabs.push({ id: 'timeline', label: 'Timeline' });
            if (serializedCurationData) {
                tabs.push({ id: 'curation', label: 'Curation' });
            }
        }

        // Only add Discography tab if figure has Spotify URL
        if (serializedPublicFigure.spotifyUrl && serializedPublicFigure.spotifyUrl.length > 0) {
            tabs.push({ id: 'discography', label: 'Discography' });
        }

        // Only add Filmography tab if figure has TMDb ID
        if (serializedPublicFigure.tmdb_id) {
            tabs.push({ id: 'filmography', label: 'Filmography' });
        }

        return (
            <PublicFigurePageWrapper
                timelineData={serializedApiResponse.timeline_content.data}
                articles={serializedInitialArticles}
                figureName={serializedPublicFigure.name}
                figureId={serializedPublicFigure.id}
            >
                <div className="min-h-screen bg-gray-50 dark:bg-black">
                    <JsonLd data={schemaData} />
                    <ScrollNavigation />

                    {/* Hero Section */}
                    <HeroSection publicFigure={serializedPublicFigure} />

                    {/* Basic Information and Official Links - Always Visible */}
                    <BasicAndLinksSection
                        publicFigure={serializedPublicFigure}
                        spotifyArtistNames={spotifyArtistNames}
                    />

                    {/* Tab Navigation and Content */}
                    <PublicFigureContent
                        tabs={tabs}
                        activeTab={tabs[0].id}
                    >
                        {{
                            curation: serializedCurationData ? (
                                <CurationContent curationData={serializedCurationData} />
                            ) : (
                                <div className="max-w-7xl mx-auto px-4 py-8">
                                    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-12 border border-gray-200 dark:border-gray-700">
                                        <div className="text-center text-gray-500 dark:text-gray-400">
                                            <p className="text-lg">Curation content coming soon...</p>
                                        </div>
                                    </div>
                                </div>
                            ),
                            timeline: (
                                <Suspense fallback={
                                    <div className="max-w-7xl mx-auto px-4 py-8">
                                        <h2 className="text-2xl font-bold mb-6 text-key-color dark:text-key-color-dark">Career Timeline</h2>
                                        <p className="text-gray-600 dark:text-gray-300 mb-8">Comprehensive chronicle of {serializedPublicFigure.name}&apos;s journey to global stardom</p>
                                        <div className="flex items-center justify-center py-12">
                                            <div className="flex items-center space-x-3">
                                                <Loader2 className="animate-spin text-key-color dark:text-key-color-dark" size={24} />
                                                <span className="text-gray-600 dark:text-gray-300">Loading timeline...</span>
                                            </div>
                                        </div>
                                    </div>
                                }>
                                    <TimelineSection
                                        timelineContent={serializedApiResponse.timeline_content}
                                        uniqueArticleIds={uniqueArticleIds}
                                        figureId={serializedPublicFigure.id}
                                        figureName={serializedPublicFigure.name}
                                        figureNameKr={serializedPublicFigure.name_kr}
                                        totalEventCount={totalEventCount}
                                    />
                                </Suspense>
                            ),
                            discography: (
                                <DiscographySectionWrapper
                                    artistName={serializedPublicFigure.name}
                                    figureId={serializedPublicFigure.id}
                                />
                            ),
                            filmography: serializedPublicFigure.tmdb_id ? (
                                <FilmographySectionWrapper
                                    figureId={serializedPublicFigure.id}
                                    personName={serializedPublicFigure.name}
                                />
                            ) : undefined,
                        }}
                    </PublicFigureContent>
                </div>
            </PublicFigurePageWrapper>
        );
    } catch (error) {
        if (error instanceof Error && error.message === 'Public figure not found') {
            notFound();
        }
        throw error;
    }
}

// --- MAIN PAGE COMPONENT ---

export default async function PublicFigurePage({ params }: { params: Promise<{ publicFigure: string }> }) {
    const resolvedParams = await params;
    const publicFigureId = resolvedParams.publicFigure.toLowerCase();

    return (
        <Suspense fallback={<LoadingOverlay />}>
            <PublicFigurePageContent publicFigureId={publicFigureId} />
        </Suspense>
    );
}

// src/app/[publicFigure]/page.tsx
import { Suspense } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Loader2 } from 'lucide-react';
import HeroSection from '@/components/HeroSection';
import TabNavigation from '@/components/TabNavigation';
import OverviewSection from '@/components/OverviewSection';
import CareerJourney from '@/components/CareerJourney';
import DiscographySection from '@/components/DiscographySection';
import FilmographySection from '@/components/FilmographySection';
import type { JsonLdObject } from '@/components/JsonLd';
import JsonLd from '@/components/JsonLd';
import { getArticlesByIds } from '@/lib/article-service';
import { notFound } from 'next/navigation';
import { extractSpotifyArtistId, getArtistDiscography } from '@/lib/spotify';
import { getSpotifyDiscographyWithCache } from '@/lib/spotify-cache-service';
import { getTMDbFilmographyWithCache } from '@/lib/tmdb-cache-service';

// --- IMPORTED TYPES ---
import {
    ApiContentResponse,
    ArticleSummary,
    CuratedEvent,
    TimelinePoint,
    CuratedTimelineData
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

// Helper function to serialize Firestore data (convert Timestamps to strings)
function serializeFirestoreData<T>(data: T): T {
    if (data === null || data === undefined) {
        return data;
    }

    // Handle Firestore Timestamp objects
    if (data && typeof data === 'object' && 'seconds' in data && 'nanoseconds' in data) {
        return new Date((data as { seconds: number; nanoseconds: number }).seconds * 1000).toISOString() as T;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        return data.map(item => serializeFirestoreData(item)) as T;
    }

    // Handle objects
    if (typeof data === 'object') {
        const serialized: Record<string, unknown> = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                serialized[key] = serializeFirestoreData((data as Record<string, unknown>)[key]);
            }
        }
        return serialized as T;
    }

    // Return primitive values as-is
    return data;
}

async function getArticleSummaries(publicFigureId: string, articleIds: string[]): Promise<ArticleSummary[]> {
    if (articleIds.length === 0) return [];

    const headersList = await headers();
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const host = headersList.get('host') || 'localhost:3000';

    try {
        const response = await fetch(
            `${protocol}://${host}/api/article-summaries?publicFigure=${encodeURIComponent(publicFigureId)}&articleIds=${encodeURIComponent(articleIds.join(','))}`,
            { cache: 'force-cache', next: { revalidate: 3600 } }
        );

        if (!response.ok) return [];
        return await response.json();
    } catch (error) {
        console.error('Error fetching article summaries:', error);
        return [];
    }
}

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
        totalAwards: data.totalAwards || '',
        tmdb_id: data.tmdb_id || null,
        tmdb_verified: data.tmdb_verified || false,
        tmdb_verified_at: data.tmdb_verified_at || '',
        tmdb_verified_name: data.tmdb_verified_name || '',
        tmdb_also_known_as: data.tmdb_also_known_as || [],
    };

    if (publicFigureData.is_group) {
        (publicFigureData as GroupProfile).members = data.members || [];
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

async function getFiguresByIds(ids: string[]): Promise<Array<{ id: string; name: string; name_kr: string; profilePic?: string; }>> {
    if (!ids || ids.length === 0) {
        return [];
    }

    // NOTE: Firestore 'in' queries are limited to a maximum of 30 documents.
    // This is perfect for a "You Might Also Like" section.
    const collectionRef = collection(db, 'selected-figures');
    const q = query(collectionRef, where('__name__', 'in', ids));

    try {
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || '',
                name_kr: data.name_kr || '',
                profilePic: data.profilePic || '',
            };
        });
    } catch (error) {
        console.error("Error fetching figures by IDs:", error);
        return [];
    }
}

// --- WRAPPER COMPONENTS ---

async function DiscographySectionWrapper({
    spotifyUrl,
    artistName,
    figureId
}: {
    spotifyUrl?: string[];
    artistName: string;
    figureId: string
}) {
    if (!spotifyUrl || spotifyUrl.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Discography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Chart-topping albums and singles that defined a generation</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No Spotify profile linked for {artistName}.
                    </div>
                </div>
            </div>
        );
    }

    try {
        // Cache service handles all validation and ID extraction
        const discographyData = await getSpotifyDiscographyWithCache(figureId, spotifyUrl);

        return (
            <DiscographySection
                albums={discographyData.allAlbums}
                artistAlbums={discographyData.byArtist}
                artistName={artistName}
            />
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
    tmdbId?: number | null;
    tmdbVerified?: boolean;
}

async function FilmographySectionWrapper({
    figureId,
    personName,
    tmdbId,
    tmdbVerified
}: FilmographySectionWrapperProps) {
    try {
        // Check if TMDb ID exists
        if (!tmdbId) {
            return (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Filmography</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                        <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                            No TMDb profile configured for this figure.
                            <br />
                            <br />
                            For groups, please check individuals&apos; profile. <br />
                            For individuals, please check his or her groups&apos; profile.
                        </div>
                    </div>
                </div>
            );
        }

        // Fetch filmography using verified TMDb ID
        const filmography = await getTMDbFilmographyWithCache(
            figureId,
            tmdbId  // ✅ Just pass the ID
        );

        if (!filmography) {
            return (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Filmography</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                        <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                            Unable to load filmography at this time.
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <FilmographySection
                cast={filmography.cast}
                crew={filmography.crew}
                personName={personName}
            />
        );
    } catch (error) {
        console.error('Error loading TMDb filmography:', error);

        if (error instanceof Error && error.message.includes('TMDb ID required')) {
            return (
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Filmography</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                        <div className="text-center py-12">
                            <p className="text-yellow-600 dark:text-yellow-500 mb-2">⚠️ TMDb ID verification needed</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Please contact admin to verify TMDb profile.</p>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Filmography</h2>
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

        const allArticleIds: string[] = [...(apiResponse.main_overview.articleIds || [])];

        // All data is now v2_curated format
        const sourcesSet = new Set<string>();

        // The outer loop iterates over the main category object
        Object.values(apiResponse.timeline_content.data).forEach((mainCatData: unknown) => {
            // Access the .subCategories property
            if (mainCatData && typeof mainCatData === 'object' && 'subCategories' in mainCatData) {
                const subCategories = (mainCatData as { subCategories: Record<string, CuratedEvent[]> }).subCategories;
                Object.values(subCategories).forEach((eventList: CuratedEvent[]) => {
                    eventList.forEach((event: CuratedEvent) => {
                        // Check for event.sources
                        (event.sources || []).forEach((source) => {
                            if (source.id) sourcesSet.add(source.id);
                        });

                        // Check for timeline_points which might contain sourceIds
                        (event.timeline_points || []).forEach((point: TimelinePoint) => {
                            (point.sourceIds || []).forEach((id: string) => {
                                if (id) sourcesSet.add(id);
                            });
                        });
                    });
                });
            }
        });
        allArticleIds.push(...Array.from(sourcesSet));

        const uniqueArticleIds = allArticleIds.filter((id, index, self) => self.indexOf(id) === index);

        const relatedFiguresObject = publicFigureData.related_figures || {};

        const similarFigureIds = Object.entries(relatedFiguresObject)
            .sort(([, countA], [, countB]) => countB - countA)
            .map(([figureId]) => figureId)
            .slice(0, 2);

        const [articles, articleSummaries, similarProfiles] = await Promise.all([
            getArticlesByIds(uniqueArticleIds),
            getArticleSummaries(publicFigureData.id, uniqueArticleIds),
            getFiguresByIds(similarFigureIds)
        ]);

        // Fetch Spotify artist names if spotifyUrl exists
        let spotifyArtistNames: string[] = [];
        if (publicFigureData.spotifyUrl && publicFigureData.spotifyUrl.length > 0) {
            try {
                const discographyData = await getSpotifyDiscographyWithCache(
                    publicFigureData.id,
                    publicFigureData.spotifyUrl
                );
                spotifyArtistNames = discographyData.byArtist.map(artist => artist.artistName);
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

        // Serialize all data before passing to client components
        const serializedPublicFigure = JSON.parse(JSON.stringify(publicFigureData));
        const serializedApiResponse = JSON.parse(JSON.stringify(apiResponse));
        const serializedArticles = JSON.parse(JSON.stringify(articles));

        return (
            <div className="min-h-screen bg-gray-50 dark:bg-black">
                <JsonLd data={schemaData} />

                {/* Hero Section */}
                <HeroSection publicFigure={serializedPublicFigure} />

                {/* Sticky Tab Navigation */}
                <TabNavigation />

                {/* Content Sections */}
                <section id="overview">
                    <OverviewSection
                        publicFigure={serializedPublicFigure}
                        mainOverview={serializedApiResponse.main_overview}
                        spotifyArtistNames={spotifyArtistNames}
                    />
                </section>

                <section id="discography">
                    <DiscographySectionWrapper
                        spotifyUrl={serializedPublicFigure.spotifyUrl}
                        artistName={serializedPublicFigure.name}
                        figureId={serializedPublicFigure.id}
                    />
                </section>

                <section id="filmography">
                    <FilmographySectionWrapper
                        figureId={serializedPublicFigure.id}
                        personName={serializedPublicFigure.name}
                        tmdbId={serializedPublicFigure.tmdb_id}
                        tmdbVerified={serializedPublicFigure.tmdb_verified}
                    />
                </section>

                <section id="timeline">
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <h2 className="text-2xl font-bold mb-6 text-key-color dark:text-key-color-dark">Career Timeline</h2>
                        <p className="text-gray-600 dark:text-gray-300 mb-8">Comprehensive chronicle of {serializedPublicFigure.name}&apos;s journey to global stardom</p>
                        <CareerJourney
                            apiResponse={serializedApiResponse.timeline_content}
                            articles={serializedArticles}
                            figureId={serializedPublicFigure.id}
                            figureName={serializedPublicFigure.name}
                            figureNameKr={serializedPublicFigure.name_kr}
                        />
                    </div>
                </section>
            </div>
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
    const publicFigureId = (await params).publicFigure.toLowerCase();
    return (
        <Suspense fallback={<LoadingOverlay />}>
            <PublicFigurePageContent publicFigureId={publicFigureId} />
        </Suspense>
    );
}
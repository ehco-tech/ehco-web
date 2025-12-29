import { db } from "@/lib/config/firebase";
import { doc, getDoc, collection, getDocs, DocumentReference } from "firebase/firestore";
import { NextResponse } from "next/server";

// --- INTERFACES ---

interface CuratedEvent {
    event_title: string;
    event_summary: string;
    event_years: number[];
    primary_date: string;
    timeline_points: {
        date: string;
        description: string;
    }[];
    status: string;
    sources: string[];
}

interface SubCategoryMap {
    [subCategory: string]: CuratedEvent[];
}

interface CuratedTimelineData {
    [mainCategory: string]: {
        description: string;
        subCategories: {
            [subCategory: string]: CuratedEvent[];
        };
    };
}

// --- HELPER FUNCTIONS ---

const MAIN_CATEGORIES = [
    'Creative Works', 
    'Live & Broadcast', 
    'Public Relations', 
    'Personal Milestones', 
    'Incidents & Controversies'
];

const formatDisplayName = (id: string): string => 
    id.split('-')
      .map(word => word === '&' ? '&' : word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .replace(/\s&\s/g, ' & ');

// Combined function to fetch all wiki-content data in one go
async function fetchWikiContent(publicFigureRef: DocumentReference) {
    const wikiContentRef = collection(publicFigureRef, 'wiki-content');
    const wikiContentSnapshot = await getDocs(wikiContentRef);

    let mainOverview = { id: 'main-overview', content: "", articleIds: [] };
    const categoryDescriptions = new Map<string, string>();

    for (const doc of wikiContentSnapshot.docs) {
        const data = doc.data();
        
        if (doc.id === 'main-overview') {
            // Get the main overview
            mainOverview = {
                id: 'main-overview',
                content: data.content || "",
                articleIds: data.articleIds || []
            };
        } else {
            // Check if this is a main category document
            const formattedId = formatDisplayName(doc.id);
            if (MAIN_CATEGORIES.includes(formattedId)) {
                categoryDescriptions.set(formattedId, data.content || "");
            }
        }
    }

    return { mainOverview, categoryDescriptions };
}

// Fetch timeline event data from curated-timeline collection
async function fetchTimelineData(publicFigureRef: DocumentReference): Promise<Record<string, SubCategoryMap> | null> {
    const timelineCollectionRef = collection(publicFigureRef, 'curated-timeline');
    const timelineSnapshot = await getDocs(timelineCollectionRef);

    if (timelineSnapshot.empty) {
        return null;
    }

    const eventData: Record<string, SubCategoryMap> = {};
    for (const doc of timelineSnapshot.docs) {
        eventData[doc.id] = doc.data();
    }
    return eventData;
}

// --- MAIN GET HANDLER ---
export async function GET(
    request: Request,
    { params }: { params: Promise<{ publicFigure: string }> }
) {
    try {
        const { publicFigure } = await params;
        const publicFigureId = publicFigure.toLowerCase();
        const publicFigureRef = doc(db, 'selected-figures', publicFigureId);
        const publicFigureDoc = await getDoc(publicFigureRef);

        if (!publicFigureDoc.exists()) {
            return NextResponse.json({ error: 'Public figure not found' }, { status: 404 });
        }

        // Fetch both wiki content and timeline data in parallel
        const [wikiContent, timelineEventData] = await Promise.all([
            fetchWikiContent(publicFigureRef),
            fetchTimelineData(publicFigureRef)
        ]);

        if (!timelineEventData) {
            return NextResponse.json({ error: 'Timeline data not found' }, { status: 404 });
        }

        // Build the final data structure with descriptions merged in
        const finalCuratedData: CuratedTimelineData = {};

        for (const mainCategory in timelineEventData) {
            finalCuratedData[mainCategory] = {
                description: wikiContent.categoryDescriptions.get(mainCategory) || "",
                subCategories: timelineEventData[mainCategory]
            };
        }

        return NextResponse.json({
            main_overview: wikiContent.mainOverview,
            timeline_content: {
                data: finalCuratedData
            }
        });

    } catch (error) {
        console.error('Error fetching public figure content:', error);
        return NextResponse.json(
            { error: 'Failed to fetch public figure content' },
            { status: 500 }
        );
    }
}
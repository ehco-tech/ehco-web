// src/app/api/updates/route.ts
import { db } from "@/lib/config/firebase";
import { collection, getDocs, query, where, orderBy, limit, startAfter, QueryConstraint, Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";

interface TimelinePoint {
    date: string;
    description: string;
    sourceIds: string[];
}

interface UpdateDocument {
    id: string;
    // Figure info
    figureId: string;
    figureName: string;
    figureProfilePic?: string;
    // Event group info (for navigation)
    eventTitle: string;
    eventSummary: string;
    mainCategory: string;
    subcategory: string;
    eventYears: number[];
    // Specific timeline point (the actual update - PRIMARY FOCUS)
    eventPointDate: string;
    eventPointDescription: string;
    eventPointSourceIds: string[];
    // Publish date (for sorting by recency)
    publishDate: string;
    mostRecentSourceId: string;
    // All points (for navigation to full event)
    allTimelinePoints: TimelinePoint[];
    // Metadata (converted to milliseconds for API response)
    createdAt: number;
    lastUpdated: number;
}

interface UpdateResponse {
    updates: UpdateDocument[];
    nextCursor?: string;
    hasMore: boolean;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit_param = searchParams.get('limit') || '50';
        const figureId = searchParams.get('figureId'); // Optional filter by figure
        const category = searchParams.get('category'); // Optional filter by category
        const cursor = searchParams.get('cursor'); // For pagination (original)
        const before = searchParams.get('before'); // For pagination (timestamp-based)

        // Parse limit parameter (max 100 for performance)
        const updateLimit = Math.min(parseInt(limit_param), 100);

        // Build the query for recent-updates cache collection
        const recentUpdatesRef = collection(db, 'recent-updates');
        const constraints: QueryConstraint[] = [
            orderBy('lastUpdated', 'desc'),  // Sort by database update time for true recency
            limit(updateLimit + 1) // Fetch one extra to check if more exist
        ];

        // Add optional filters
        if (figureId) {
            constraints.unshift(where('figureId', '==', figureId));
        }

        if (category) {
            constraints.unshift(where('mainCategory', '==', category));
        }

        // Handle cursor-based pagination (support both 'cursor' and 'before' parameters)
        const paginationParam = before || cursor;
        
        if (paginationParam) {
            try {
                // Add where clause to get updates before this timestamp
                const timestamp = parseInt(paginationParam);
                constraints.push(where('lastUpdated', '<', Timestamp.fromMillis(timestamp)));
            } catch (error) {
                console.error('Invalid cursor/before parameter:', error);
            }
        }

        // Create and execute the query
        const q = query(recentUpdatesRef, ...constraints);
        const querySnapshot = await getDocs(q);

        // Process the results
        const updates: UpdateDocument[] = [];
        let hasMore = false;

        querySnapshot.docs.forEach((doc, index) => {
            // If we have more results than the requested limit, set hasMore to true
            if (index >= updateLimit) {
                hasMore = true;
                return; // Skip adding this document
            }

            const data = doc.data();
            updates.push({
                id: doc.id,
                figureId: data.figureId || '',
                figureName: data.figureName || '',
                figureProfilePic: data.figureProfilePic || '',
                eventTitle: data.eventTitle || '',
                eventSummary: data.eventSummary || '',
                mainCategory: data.mainCategory || '',
                subcategory: data.subcategory || '',
                eventYears: data.eventYears || [],
                eventPointDate: data.eventPointDate || '',
                eventPointDescription: data.eventPointDescription || '',
                eventPointSourceIds: data.eventPointSourceIds || [],
                publishDate: data.publishDate || '',  // Kept as metadata (article publish date)
                mostRecentSourceId: data.mostRecentSourceId || '',
                allTimelinePoints: data.allTimelinePoints || [],
                createdAt: data.createdAt?.toMillis() || Date.now(),
                lastUpdated: data.lastUpdated?.toMillis() || Date.now()
            });
        });

        // Create the response with pagination info
        const response: UpdateResponse = {
            updates,
            hasMore
        };

        // Add cursor for pagination if there are results
        if (updates.length > 0 && hasMore) {
            const lastUpdate = updates[updates.length - 1];
            response.nextCursor = lastUpdate.lastUpdated.toString();  // lastUpdated is already in milliseconds
        }

        return NextResponse.json(response);

    } catch (error) {
        console.error('Error fetching updates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch updates', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
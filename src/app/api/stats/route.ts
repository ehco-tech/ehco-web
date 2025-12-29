import { db } from "@/lib/config/firebase";
import { Timestamp } from "firebase-admin/firestore";
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

interface StatsCounters {
    totalFigures: number;
    totalFacts: number;
    totalArticles: number;
    lastUpdated?: Timestamp;
}

/**
 * GET /api/stats
 * 
 * Fetches the stats counters from Firestore (stats/counters document).
 * Returns totalFigures and totalFacts counts.
 * 
 * Response format:
 * {
 *   totalFigures: number,
 *   totalFacts: number,
 *   lastUpdated: timestamp (optional)
 * }
 */
export async function GET() {
    try {
        // Fetch the stats/counters document
        const statsDocRef = doc(db, 'stats', 'counters');
        const statsDoc = await getDoc(statsDocRef);

        if (!statsDoc.exists()) {
            // If stats document doesn't exist, return default values
            console.warn('Stats document not found. Returning default values.');
            return NextResponse.json({
                totalFigures: 0,
                totalFacts: 0,
                totalArticles: 0,
                error: 'Stats not initialized'
            }, { status: 404 });
        }

        const data = statsDoc.data() as StatsCounters;

        return NextResponse.json({
            totalFigures: data.totalFigures || 0,
            totalFacts: data.totalFacts || 0,
            totalArticles: data.totalArticles || 0,
            lastUpdated: data.lastUpdated
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch stats',
                totalFigures: 0,
                totalFacts: 0,
                totalArticles: 0
            },
            { status: 500 }
        );
    }
}
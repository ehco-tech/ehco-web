// src/app/api/spotify/refresh-cache/route.ts

import { NextResponse } from 'next/server';
import { refreshSpotifyCache, getSpotifyCacheInfo } from '@/lib/spotify-cache-service';
import { adminDb } from '@/lib/firebase-admin';

/**
 * API endpoint to manually refresh Spotify cache for a figure
 * 
 * Usage:
 * POST /api/spotify/refresh-cache
 * Body: { figureId: "blackpink" }
 * 
 * Returns: { success: true, albums: [...] }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { figureId } = body;

        if (!figureId) {
            return NextResponse.json(
                { error: 'figureId is required' },
                { status: 400 }
            );
        }

        // Get figure data to get spotifyUrl
        const figureRef = adminDb.collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        if (!figureDoc.exists) {
            return NextResponse.json(
                { error: 'Figure not found' },
                { status: 404 }
            );
        }

        const figureData = figureDoc.data();
        const spotifyUrl = figureData?.spotifyUrl;

        if (!spotifyUrl) {
            return NextResponse.json(
                { error: 'Figure does not have a Spotify URL' },
                { status: 400 }
            );
        }

        // Refresh the cache
        const albums = await refreshSpotifyCache(figureId, spotifyUrl);

        return NextResponse.json({
            success: true,
            figureId,
            albumCount: albums.length,
            timestamp: new Date().toISOString(),
            message: `Successfully refreshed Spotify data for ${figureData?.name || figureId}`
        });

    } catch (error) {
        console.error('Error refreshing Spotify cache:', error);
        return NextResponse.json(
            { error: 'Failed to refresh cache', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * Get cache status for a figure
 * 
 * Usage:
 * GET /api/spotify/refresh-cache?figureId=blackpink
 * 
 * Returns: { hasCachedData, lastUpdated, daysOld, isFresh }
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const figureId = searchParams.get('figureId');

        if (!figureId) {
            return NextResponse.json(
                { error: 'figureId query parameter is required' },
                { status: 400 }
            );
        }

        const cacheInfo = await getSpotifyCacheInfo(figureId);

        return NextResponse.json({
            figureId,
            ...cacheInfo
        });

    } catch (error) {
        console.error('Error getting cache info:', error);
        return NextResponse.json(
            { error: 'Failed to get cache info' },
            { status: 500 }
        );
    }
}

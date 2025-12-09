// src/app/api/cache/spotify/route.ts
// API route for updating Spotify cache in the background

import { NextRequest, NextResponse } from 'next/server';
import { refreshSpotifyCache } from '@/lib/spotify-cache-service';

/**
 * POST /api/cache/spotify
 * Updates Spotify cache for a figure
 * This uses Admin SDK for write operations
 *
 * Body: { figureId: string, spotifyUrl: string[] }
 */
export async function POST(request: NextRequest) {
    try {
        const { figureId, spotifyUrl } = await request.json();

        if (!figureId || !spotifyUrl) {
            return NextResponse.json(
                { error: 'figureId and spotifyUrl are required' },
                { status: 400 }
            );
        }

        // This will use Admin SDK to update cache
        await refreshSpotifyCache(figureId, spotifyUrl);

        return NextResponse.json({
            success: true,
            message: `Spotify cache updated for ${figureId}`
        });

    } catch (error) {
        console.error('Error updating Spotify cache:', error);
        return NextResponse.json(
            {
                error: 'Failed to update cache',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

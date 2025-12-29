// src/app/api/cache/tmdb/route.ts
// API route for updating TMDb cache in the background

import { NextRequest, NextResponse } from 'next/server';
import { refreshTMDbCache } from '@/lib/api/tmdb/cache';

/**
 * POST /api/cache/tmdb
 * Updates TMDb cache for a figure
 * This uses Admin SDK for write operations
 *
 * Body: { figureId: string, tmdbId: number }
 */
export async function POST(request: NextRequest) {
    try {
        const { figureId, tmdbId } = await request.json();

        if (!figureId || !tmdbId) {
            return NextResponse.json(
                { error: 'figureId and tmdbId are required' },
                { status: 400 }
            );
        }

        // This will use Admin SDK to update cache
        await refreshTMDbCache(figureId, tmdbId);

        return NextResponse.json({
            success: true,
            message: `TMDb cache updated for ${figureId}`
        });

    } catch (error) {
        console.error('Error updating TMDb cache:', error);
        return NextResponse.json(
            {
                error: 'Failed to update cache',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

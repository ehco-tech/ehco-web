// src/app/api/spotify/artist/[id]/route.ts

import { NextResponse } from 'next/server';
import { getArtistDiscography, getSpotifyArtist } from '@/lib/spotify';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: artistId } = await context.params;
        console.log(artistId);

        if (!artistId) {
            return NextResponse.json(
                { error: 'Artist ID is required' },
                { status: 400 }
            );
        }

        // Get artist info and discography in parallel
        const [artist, discography] = await Promise.all([
            getSpotifyArtist(artistId),
            getArtistDiscography(artistId)
        ]);
        console.log(artist);

        if (!artist) {
            return NextResponse.json(
                { error: 'Artist not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            artist,
            discography
        });

    } catch (error) {
        console.error('Error fetching Spotify artist data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch artist data' },
            { status: 500 }
        );
    }
}

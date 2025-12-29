// src/lib/spotify-data-reader.ts
// Simple database reader for Spotify data - no API calls, no cache checking

import { db } from '@/lib/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SpotifyAlbum } from '@/lib/api/spotify/client';

export interface ArtistAlbumData {
    artistId: string;
    artistName: string;
    albums: SpotifyAlbum[];
}

interface SpotifyCacheData {
    albums: SpotifyAlbum[];
    last_updated: string;
    artist_id: string;
    artist_name?: string;
    error?: string;
}

interface MultiArtistSpotifyCacheData {
    artists: SpotifyCacheData[];
    last_updated: string;
}

/**
 * Read Spotify data from database
 * Simply returns whatever is stored in spotify_data field
 * No cache freshness checks, no API fallbacks
 */
export async function getSpotifyData(
    figureId: string
): Promise<{ allAlbums: SpotifyAlbum[]; byArtist: ArtistAlbumData[] } | null> {
    try {
        const figureRef = doc(db, 'selected-figures', figureId);
        const figureDoc = await getDoc(figureRef);

        if (!figureDoc.exists()) {
            console.log(`Figure ${figureId} not found`);
            return null;
        }

        const data = figureDoc.data();
        const spotifyData = data?.spotify_data as MultiArtistSpotifyCacheData | SpotifyCacheData | undefined;

        if (!spotifyData) {
            console.log(`No Spotify data found for ${figureId}`);
            return null;
        }

        // Handle multi-artist data
        if ('artists' in spotifyData && spotifyData.artists) {
            const multiArtistData = spotifyData as MultiArtistSpotifyCacheData;

            const allAlbums: SpotifyAlbum[] = [];
            multiArtistData.artists.forEach(artistCache => {
                if (!artistCache.error && artistCache.albums) {
                    allAlbums.push(...artistCache.albums);
                }
            });

            const byArtist: ArtistAlbumData[] = multiArtistData.artists.map(cache => ({
                artistId: cache.artist_id,
                artistName: cache.artist_name || 'Unknown Artist',
                albums: cache.albums || []
            }));

            return { allAlbums, byArtist };
        }

        // Handle single artist data
        const singleArtistData = spotifyData as SpotifyCacheData;

        if (singleArtistData.error || !singleArtistData.albums) {
            console.log(`Spotify data has error or no albums for ${figureId}`);
            return null;
        }

        return {
            allAlbums: singleArtistData.albums,
            byArtist: [{
                artistId: singleArtistData.artist_id,
                artistName: singleArtistData.artist_name || 'Unknown Artist',
                albums: singleArtistData.albums
            }]
        };

    } catch (error) {
        console.error(`Error reading Spotify data for ${figureId}:`, error);
        return null;
    }
}

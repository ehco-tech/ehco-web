// src/lib/spotify-cache-reader.ts
// Client-side SDK functions for READING Spotify cache (no Admin SDK)

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { SpotifyAlbum } from '@/lib/spotify';

const CACHE_FIELD = 'spotify_data';
const CACHE_DURATION_DAYS = 7;

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

export interface ArtistAlbumData {
    artistId: string;
    artistName: string;
    albums: SpotifyAlbum[];
}

/**
 * Check if cached data is still fresh
 */
function isCacheFresh(lastUpdated: string): boolean {
    const cacheDate = new Date(lastUpdated);
    const now = new Date();
    const daysDiff = (now.getTime() - cacheDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff < CACHE_DURATION_DAYS;
}

/**
 * Read Spotify cache from Firestore using CLIENT SDK
 * Returns cached data if fresh, null if stale or missing
 * This function does NOT initialize Admin SDK
 */
export async function readSpotifyCache(
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
        const cachedData = data?.[CACHE_FIELD] as MultiArtistSpotifyCacheData | SpotifyCacheData | undefined;

        if (!cachedData || !cachedData.last_updated) {
            console.log(`No cache found for ${figureId}`);
            return null;
        }

        // Check if multi-artist cache
        if ('artists' in cachedData && cachedData.artists) {
            const multiArtistData = cachedData as MultiArtistSpotifyCacheData;

            // Check freshness
            if (!isCacheFresh(multiArtistData.last_updated)) {
                console.log(`Cache expired for ${figureId}`);
                return null;
            }

            console.log(`✅ Using fresh cached Spotify data for ${figureId} (client SDK)`);

            const allAlbums: SpotifyAlbum[] = [];
            multiArtistData.artists.forEach(artistCache => {
                if (!artistCache.error && artistCache.albums) {
                    allAlbums.push(...artistCache.albums);
                }
            });

            const byArtist: ArtistAlbumData[] = multiArtistData.artists.map(cache => ({
                artistId: cache.artist_id,
                artistName: cache.artist_name || 'Unknown Artist',
                albums: cache.albums
            }));

            return { allAlbums, byArtist };
        }

        // Single artist cache
        const singleArtistData = cachedData as SpotifyCacheData;

        if (!isCacheFresh(singleArtistData.last_updated)) {
            console.log(`Cache expired for ${figureId}`);
            return null;
        }

        if (singleArtistData.error || !singleArtistData.albums || singleArtistData.albums.length === 0) {
            console.log(`Cache has error or no albums for ${figureId}`);
            return null;
        }

        console.log(`✅ Using fresh cached Spotify data for ${figureId} (client SDK)`);

        return {
            allAlbums: singleArtistData.albums,
            byArtist: [{
                artistId: singleArtistData.artist_id,
                artistName: singleArtistData.artist_name || 'Unknown Artist',
                albums: singleArtistData.albums
            }]
        };

    } catch (error) {
        console.error(`Error reading Spotify cache for ${figureId}:`, error);
        return null;
    }
}

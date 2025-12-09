// src/lib/spotify-cache-service.ts

import { adminDb } from '@/lib/firebase-admin';
import {
    getArtistDiscography,
    extractSpotifyArtistId,
    getSpotifyArtist,
    getAlbumDetails,
    SpotifyAlbum
} from '@/lib/spotify';

// Configuration
const CACHE_DURATION_DAYS = 7; // Refresh cache after 7 days
const CACHE_FIELD = 'spotify_data';

interface SpotifyCacheData {
    albums: SpotifyAlbum[];
    last_updated: string; // ISO timestamp
    artist_id: string;
    artist_name?: string; // Artist name for identification
    error?: string; // Track if there was an error
}

// New interface for multi-artist cache
interface MultiArtistSpotifyCacheData {
    artists: SpotifyCacheData[]; // Array of cache data, one per artist
    last_updated: string;
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

export interface ArtistAlbumData {
    artistId: string;
    artistName: string;
    albums: SpotifyAlbum[];
}

/**
 * Get Spotify discography data for multiple artists with Firebase caching
 * Handles figures that have both solo and group work
 * Returns both combined albums and albums grouped by artist
 */
export async function getMultiArtistSpotifyDiscographyWithCache(
    figureId: string,
    spotifyUrls: string[]
): Promise<{ allAlbums: SpotifyAlbum[]; byArtist: ArtistAlbumData[] }> {

    // Handle empty array
    if (!spotifyUrls || spotifyUrls.length === 0) {
        console.log(`No Spotify URLs for ${figureId}`);
        return { allAlbums: [], byArtist: [] };
    }

    // Extract all artist IDs
    const artistIds = spotifyUrls
        .map(url => extractSpotifyArtistId(url))
        .filter((id): id is string => id !== null);

    if (artistIds.length === 0) {
        console.error(`No valid Spotify URLs for ${figureId}`);
        return { allAlbums: [], byArtist: [] };
    }

    try {
        const figureRef = adminDb.collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        const allAlbums: SpotifyAlbum[] = [];

        if (figureDoc.exists) {
            const data = figureDoc.data();
            const cachedData = data?.[CACHE_FIELD] as MultiArtistSpotifyCacheData | SpotifyCacheData | undefined;

            // Check if we have multi-artist cached data
            if (cachedData && 'artists' in cachedData && cachedData.artists && cachedData.last_updated) {
                const isFresh = isCacheFresh(cachedData.last_updated);

                // Check if cached data matches current artist IDs
                const cachedArtistIds = cachedData.artists.map(a => a.artist_id).sort();
                const currentArtistIds = [...artistIds].sort();
                const artistsMatch = JSON.stringify(cachedArtistIds) === JSON.stringify(currentArtistIds);

                if (isFresh && artistsMatch) {
                    console.log(`✅ Using cached multi-artist Spotify data for ${figureId}`);

                    // Combine all albums from all artists
                    cachedData.artists.forEach(artistCache => {
                        if (!artistCache.error && artistCache.albums) {
                            allAlbums.push(...artistCache.albums);
                        }
                    });

                    if (allAlbums.length > 0) {
                        // Build byArtist array from cache
                        const byArtist: ArtistAlbumData[] = cachedData.artists
                            .map(cache => ({
                                artistId: cache.artist_id,
                                artistName: cache.artist_name || 'Unknown Artist',
                                albums: cache.albums
                            }));

                        return { allAlbums, byArtist };
                    }
                } else {
                    console.log(`🔄 Cache expired or artists changed for ${figureId}`);
                }
            } else {
                console.log(`🆕 No valid multi-artist cache found for ${figureId}`);
            }
        }

        // Fetch fresh data for all artists
        console.log(`🌐 Fetching Spotify discography for ${artistIds.length} artist(s)...`);

        const artistCacheDataArray: SpotifyCacheData[] = [];

        for (const artistId of artistIds) {
            try {
                const [discography, artistInfo] = await Promise.all([
                    getArtistDiscography(artistId),
                    getSpotifyArtist(artistId)
                ]);

                if (discography.allAlbums && discography.allAlbums.length > 0) {
                    // Fetch full details for each album (including tracks with preview URLs)
                    console.log(`🎵 Fetching full details for ${discography.allAlbums.length} albums...`);
                    const albumDetailsPromises = discography.allAlbums.map(album =>
                        getAlbumDetails(album.id)
                    );
                    const albumsWithDetails = await Promise.all(albumDetailsPromises);

                    // Strip out available_markets from both albums and tracks before caching
                    const cleanedAlbums = albumsWithDetails
                        .filter((album): album is NonNullable<typeof album> => album !== null)
                        .map(album => {
                            const { available_markets, ...albumWithoutMarkets } = album as SpotifyAlbum & { available_markets?: string[] };

                            // Also strip available_markets from tracks if they exist
                            if (albumWithoutMarkets.tracks?.items) {
                                albumWithoutMarkets.tracks.items = albumWithoutMarkets.tracks.items.map(track => {
                                    const { available_markets, ...trackWithoutMarkets } = track as typeof track & { available_markets?: string[] };
                                    return trackWithoutMarkets;
                                });
                            }

                            return albumWithoutMarkets as SpotifyAlbum;
                        });

                    artistCacheDataArray.push({
                        albums: cleanedAlbums,
                        last_updated: new Date().toISOString(),
                        artist_id: artistId,
                        artist_name: artistInfo?.name || 'Unknown Artist'
                    });
                    allAlbums.push(...cleanedAlbums);
                    console.log(`📀 Fetched ${cleanedAlbums.length} albums with full track details for artist ${artistId} (${artistInfo?.name || 'Unknown'})`);
                } else {
                    // Cache error state for this artist
                    artistCacheDataArray.push({
                        albums: [],
                        last_updated: new Date().toISOString(),
                        artist_id: artistId,
                        artist_name: artistInfo?.name || 'Unknown Artist',
                        error: 'No albums found from Spotify API'
                    });
                    console.warn(`⚠️ No albums found for artist ${artistId}`);
                }
            } catch (error) {
                console.error(`Error fetching data for artist ${artistId}:`, error);
                // Continue with other artists even if one fails
                artistCacheDataArray.push({
                    albums: [],
                    last_updated: new Date().toISOString(),
                    artist_id: artistId,
                    artist_name: 'Unknown Artist',
                    error: `Failed to fetch: ${error}`
                });
            }
        }

        // Save multi-artist cache
        const multiArtistCacheData: MultiArtistSpotifyCacheData = {
            artists: artistCacheDataArray,
            last_updated: new Date().toISOString()
        };

        try {
            await figureRef.update({
                [CACHE_FIELD]: multiArtistCacheData
            });
            console.log(`💾 Saved multi-artist Spotify data to Firebase for ${figureId} (${allAlbums.length} total albums)`);
        } catch (error) {
            console.error(`Failed to save Spotify cache for ${figureId}:`, error);
        }

        // Build byArtist array from fresh data
        const byArtist: ArtistAlbumData[] = artistCacheDataArray
            .map(cache => ({
                artistId: cache.artist_id,
                artistName: cache.artist_name || 'Unknown Artist',
                albums: cache.albums
            }));

        return { allAlbums, byArtist };

    } catch (error) {
        console.error(`Error fetching Spotify data for ${figureId}:`, error);

        // Fallback: Try to return stale cache if available
        try {
            const figureRef = adminDb.collection('selected-figures').doc(figureId);
            const figureDoc = await figureRef.get();

            if (figureDoc.exists) {
                const data = figureDoc.data();
                const cachedData = data?.[CACHE_FIELD] as MultiArtistSpotifyCacheData | undefined;

                if (cachedData && 'artists' in cachedData && cachedData.artists) {
                    console.log(`⚠️ Spotify API failed, using stale multi-artist cache for ${figureId}`);
                    const staleAlbums: SpotifyAlbum[] = [];
                    cachedData.artists.forEach(artistCache => {
                        if (!artistCache.error && artistCache.albums) {
                            staleAlbums.push(...artistCache.albums);
                        }
                    });

                    const byArtist: ArtistAlbumData[] = cachedData.artists
                        .map(cache => ({
                            artistId: cache.artist_id,
                            artistName: cache.artist_name || 'Unknown Artist',
                            albums: cache.albums
                        }));

                    return { allAlbums: staleAlbums, byArtist };
                }
            }
        } catch (fallbackError) {
            console.error('Fallback to cache also failed:', fallbackError);
        }

        return { allAlbums: [], byArtist: [] };
    }
}

/**
 * Get Spotify discography data with Firebase caching
 * NOW SUPPORTS BOTH: single URL (string) OR multiple URLs (array)
 * 
 * Flow:
 * 1. Check if input is array or string
 * 2. If array, use multi-artist logic
 * 3. If string, use original single-artist logic
 * 4. Check Firebase for cached data
 * 5. If cache exists and is fresh, return it
 * 6. If cache is stale or missing, fetch from Spotify
 * 7. Save to Firebase and return
 */
export async function getSpotifyDiscographyWithCache(
    figureId: string,
    spotifyUrl: string[]
): Promise<{ allAlbums: SpotifyAlbum[]; byArtist: ArtistAlbumData[] }> {
    return getMultiArtistSpotifyDiscographyWithCache(figureId, spotifyUrl);
}

/**
 * Manually refresh Spotify data for a figure (admin function)
 * Forces a fresh fetch regardless of cache age
 * NOW SUPPORTS BOTH: single URL (string) OR multiple URLs (array)
 */
export async function refreshSpotifyCache(
    figureId: string,
    spotifyUrl: string | string[]
): Promise<SpotifyAlbum[]> {

    // Handle array of URLs (multi-artist)
    if (Array.isArray(spotifyUrl)) {
        const artistIds = spotifyUrl
            .map(url => extractSpotifyArtistId(url))
            .filter((id): id is string => id !== null);

        if (artistIds.length === 0) {
            throw new Error('No valid Spotify URLs provided');
        }

        console.log(`🔄 Force refreshing multi-artist Spotify data for ${figureId}...`);

        const artistCacheDataArray: SpotifyCacheData[] = [];
        const allAlbums: SpotifyAlbum[] = [];

        for (const artistId of artistIds) {
            try {
                const [discography, artistInfo] = await Promise.all([
                    getArtistDiscography(artistId),
                    getSpotifyArtist(artistId)
                ]);

                if (discography.allAlbums && discography.allAlbums.length > 0) {
                    // Fetch full details for each album (including tracks with preview URLs)
                    console.log(`🎵 Refreshing full details for ${discography.allAlbums.length} albums...`);
                    const albumDetailsPromises = discography.allAlbums.map(album =>
                        getAlbumDetails(album.id)
                    );
                    const albumsWithDetails = await Promise.all(albumDetailsPromises);

                    // Strip out available_markets from both albums and tracks before caching
                    const cleanedAlbums = albumsWithDetails
                        .filter((album): album is NonNullable<typeof album> => album !== null)
                        .map(album => {
                            const { available_markets, ...albumWithoutMarkets } = album as SpotifyAlbum & { available_markets?: string[] };

                            // Also strip available_markets from tracks if they exist
                            if (albumWithoutMarkets.tracks?.items) {
                                albumWithoutMarkets.tracks.items = albumWithoutMarkets.tracks.items.map(track => {
                                    const { available_markets, ...trackWithoutMarkets } = track as typeof track & { available_markets?: string[] };
                                    return trackWithoutMarkets;
                                });
                            }

                            return albumWithoutMarkets as SpotifyAlbum;
                        });

                    artistCacheDataArray.push({
                        albums: cleanedAlbums,
                        last_updated: new Date().toISOString(),
                        artist_id: artistId,
                        artist_name: artistInfo?.name
                    });
                    allAlbums.push(...cleanedAlbums);
                } else {
                    artistCacheDataArray.push({
                        albums: [],
                        last_updated: new Date().toISOString(),
                        artist_id: artistId,
                        artist_name: artistInfo?.name,
                        error: 'No albums found from Spotify API'
                    });
                }
            } catch (error) {
                console.error(`Error refreshing artist ${artistId}:`, error);
                throw error;
            }
        }

        const multiArtistCacheData: MultiArtistSpotifyCacheData = {
            artists: artistCacheDataArray,
            last_updated: new Date().toISOString()
        };

        const figureRef = adminDb.collection('selected-figures').doc(figureId);
        await figureRef.update({
            [CACHE_FIELD]: multiArtistCacheData
        });

        console.log(`✅ Force refresh complete for ${figureId} (${allAlbums.length} total albums)`);
        return allAlbums;
    }

    // Original single-artist logic
    const artistId = extractSpotifyArtistId(spotifyUrl);

    if (!artistId) {
        throw new Error('Invalid Spotify URL');
    }

    console.log(`🔄 Force refreshing Spotify data for ${figureId}...`);

    // Fetch fresh data from Spotify
    const discography = await getArtistDiscography(artistId);

    // Check if we got albums
    if (!discography.allAlbums || discography.allAlbums.length === 0) {
        console.warn(`⚠️ No albums found for artist ${artistId} (${figureId})`);

        // Cache the error state
        const errorCacheData: SpotifyCacheData = {
            albums: [],
            last_updated: new Date().toISOString(),
            artist_id: artistId,
            error: 'No albums found from Spotify API'
        };

        const figureRef = adminDb.collection('selected-figures').doc(figureId);
        await figureRef.update({
            [CACHE_FIELD]: errorCacheData
        });

        throw new Error('No albums found from Spotify API');
    }

    console.log(`📀 Fetched ${discography.allAlbums.length} albums from Spotify`);

    // Fetch full details for each album (including tracks with preview URLs)
    console.log(`🎵 Fetching full details for ${discography.allAlbums.length} albums...`);
    const albumDetailsPromises = discography.allAlbums.map(album =>
        getAlbumDetails(album.id)
    );
    const albumsWithDetails = await Promise.all(albumDetailsPromises);

    // Strip out available_markets from both albums and tracks before caching
    const cleanedAlbums = albumsWithDetails
        .filter((album): album is NonNullable<typeof album> => album !== null)
        .map(album => {
            const { available_markets, ...albumWithoutMarkets } = album as SpotifyAlbum & { available_markets?: string[] };

            // Also strip available_markets from tracks if they exist
            if (albumWithoutMarkets.tracks?.items) {
                albumWithoutMarkets.tracks.items = albumWithoutMarkets.tracks.items.map(track => {
                    const { available_markets, ...trackWithoutMarkets } = track as typeof track & { available_markets?: string[] };
                    return trackWithoutMarkets;
                });
            }

            return albumWithoutMarkets as SpotifyAlbum;
        });

    // Save to Firebase
    const cacheData: SpotifyCacheData = {
        albums: cleanedAlbums,
        last_updated: new Date().toISOString(),
        artist_id: artistId
    };

    const figureRef = adminDb.collection('selected-figures').doc(figureId);
    await figureRef.update({
        [CACHE_FIELD]: cacheData
    });

    console.log(`✅ Force refresh complete for ${figureId}`);

    return discography.allAlbums;
}

/**
 * Get cache info for a figure (useful for admin dashboard)
 */
export async function getSpotifyCacheInfo(figureId: string): Promise<{
    hasCachedData: boolean;
    lastUpdated?: string;
    daysOld?: number;
    isFresh?: boolean;
    artistId?: string;
    albumCount?: number;
    hasError?: boolean;
    errorMessage?: string;
    isMultiArtist?: boolean;
    artistCount?: number;
}> {
    try {
        const figureRef = adminDb.collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        if (!figureDoc.exists) {
            return { hasCachedData: false };
        }

        const data = figureDoc.data();
        const cachedData = data?.[CACHE_FIELD];

        if (!cachedData || !cachedData.last_updated) {
            return { hasCachedData: false };
        }

        const lastUpdatedDate = new Date(cachedData.last_updated);
        const daysOld = (new Date().getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24);

        // TYPE GUARD: Check if multi-artist cache
        if ('artists' in cachedData && cachedData.artists) {
            // Explicitly type as MultiArtistSpotifyCacheData
            const multiArtistData = cachedData as MultiArtistSpotifyCacheData;
            const totalAlbums = multiArtistData.artists.reduce((sum, artist) =>
                sum + (artist.albums?.length || 0), 0
            );

            return {
                hasCachedData: true,
                lastUpdated: multiArtistData.last_updated,
                daysOld: Math.floor(daysOld),
                isFresh: isCacheFresh(multiArtistData.last_updated),
                albumCount: totalAlbums,
                isMultiArtist: true,
                artistCount: multiArtistData.artists.length,
                hasError: multiArtistData.artists.some(a => !!a.error)
            };
        }

        // TypeScript now knows this is SpotifyCacheData (single artist)
        const singleArtistData = cachedData as SpotifyCacheData;
        return {
            hasCachedData: true,
            lastUpdated: singleArtistData.last_updated,
            daysOld: Math.floor(daysOld),
            isFresh: isCacheFresh(singleArtistData.last_updated),
            artistId: singleArtistData.artist_id,
            albumCount: singleArtistData.albums?.length || 0,
            hasError: !!singleArtistData.error,
            errorMessage: singleArtistData.error,
            isMultiArtist: false,
            artistCount: 1
        };
    } catch (error) {
        console.error('Error getting cache info:', error);
        return { hasCachedData: false };
    }
}

/**
 * Clear Spotify cache for a figure (admin function)
 */
export async function clearSpotifyCache(figureId: string): Promise<void> {
    const figureRef = adminDb.collection('selected-figures').doc(figureId);
    await figureRef.update({
        [CACHE_FIELD]: null
    });
    console.log(`🗑️ Cleared Spotify cache for ${figureId}`);
}
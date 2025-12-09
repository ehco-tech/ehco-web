// src/lib/tmdb-cache-service.ts

import { getAdminDb } from '@/lib/firebase-admin';
import {
    getPersonFilmography,
    getPersonDetails,
    TMDbFilmography,
    TMDbPerson
} from '@/lib/tmdb';

// Configuration
const CACHE_DURATION_DAYS = 30; // Refresh cache after 30 days
const CACHE_FIELD = 'tmdb_data';

interface TMDbCacheData {
    filmography: TMDbFilmography;
    last_updated: string; // ISO timestamp
    person_id: number;
    person_name: string; // Store the verified name from TMDb
    also_known_as: string[]; // Store alternate names for verification
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
 * Get TMDb filmography data with Firebase caching - REQUIRES VERIFIED TMDb ID
 * 
 * Flow:
 * 1. Check if tmdbId exists (throw error if not)
 * 2. Check Firebase for cached data
 * 3. If cache exists and is fresh, return it
 * 4. If cache is stale or missing, fetch from TMDb
 * 5. Save to Firebase and return
 * 
 * @param figureId - The Firestore document ID
 * @param tmdbId - REQUIRED verified TMDb person ID
 * @throws Error if tmdbId is not provided
 */
export async function getTMDbFilmographyWithCache(
    figureId: string,
    tmdbId: number | null | undefined
): Promise<TMDbFilmography | null> {

    // ✅ REQUIRE TMDb ID - no fallback to name search
    if (!tmdbId) {
        console.error(`❌ No TMDb ID provided for ${figureId}. Please verify TMDb ID first.`);
        throw new Error(`TMDb ID required for ${figureId}. Use admin verification tool to set TMDb ID.`);
    }

    try {
        // Step 1: Try to get cached data from Firebase (using Admin SDK)
        const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        if (figureDoc.exists) {
            const data = figureDoc.data();
            const cachedData = data?.[CACHE_FIELD] as TMDbCacheData | undefined;

            // Step 2: Check if cache exists, is fresh, AND matches the TMDb ID
            if (cachedData && cachedData.last_updated && cachedData.person_id === tmdbId) {
                const isFresh = isCacheFresh(cachedData.last_updated);

                if (isFresh) {
                    console.log(`✅ Using cached TMDb data for ${figureId} (${cachedData.person_name})`);
                    return cachedData.filmography;
                } else {
                    console.log(`🔄 TMDb cache expired for ${figureId}, fetching fresh data...`);
                }
            } else if (cachedData && cachedData.person_id !== tmdbId) {
                // TMDb ID changed - need to fetch new person's data
                console.log(`⚠️ TMDb ID changed for ${figureId} (${cachedData.person_id} → ${tmdbId}), fetching new data...`);
            } else {
                console.log(`🆕 No TMDb cache found for ${figureId}, fetching from TMDb...`);
            }
        }

        // Step 3: Fetch fresh data from TMDb API using the verified ID
        const filmography = await getPersonFilmography(tmdbId);
        const personDetails = await getPersonDetails(tmdbId);

        // Step 4: Save to Firebase with verification metadata
        const cacheData: TMDbCacheData = {
            filmography,
            last_updated: new Date().toISOString(),
            person_id: tmdbId,
            person_name: personDetails.name,
            also_known_as: personDetails.also_known_as
        };

        try {
            await figureRef.update({
                [CACHE_FIELD]: cacheData
            });
            console.log(`💾 Saved TMDb data for ${figureId} (${personDetails.name})`);
        } catch (error) {
            console.error(`Failed to save TMDb cache for ${figureId}:`, error);
            // Continue anyway - we still have the data to return
        }

        return filmography;

    } catch (error) {
        console.error(`Error fetching TMDb data for ${figureId}:`, error);

        // Fallback: Try to return stale cache if available
        try {
            const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
            const figureDoc = await figureRef.get();

            if (figureDoc.exists) {
                const data = figureDoc.data();
                const cachedData = data?.[CACHE_FIELD] as TMDbCacheData | undefined;

                if (cachedData && cachedData.filmography && cachedData.person_id === tmdbId) {
                    console.log(`⚠️ TMDb API failed, using stale cache for ${figureId}`);
                    return cachedData.filmography;
                }
            }
        } catch (fallbackError) {
            console.error('Fallback to TMDb cache also failed:', fallbackError);
        }

        return null;
    }
}

/**
 * Manually refresh TMDb data for a figure - REQUIRES VERIFIED TMDb ID
 * Forces a fresh fetch regardless of cache age
 * 
 * @param figureId - The Firestore document ID
 * @param tmdbId - REQUIRED verified TMDb person ID
 * @throws Error if tmdbId is not provided
 */
export async function refreshTMDbCache(
    figureId: string,
    tmdbId: number | null | undefined
): Promise<TMDbFilmography | null> {

    if (!tmdbId) {
        throw new Error(`TMDb ID required for ${figureId}`);
    }

    console.log(`🔄 Force refreshing TMDb data for ${figureId}...`);

    // Fetch fresh data from TMDb using verified ID
    const filmography = await getPersonFilmography(tmdbId);
    const personDetails = await getPersonDetails(tmdbId);

    // Save to Firebase
    const cacheData: TMDbCacheData = {
        filmography,
        last_updated: new Date().toISOString(),
        person_id: tmdbId,
        person_name: personDetails.name,
        also_known_as: personDetails.also_known_as
    };

    const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
    await figureRef.update({
        [CACHE_FIELD]: cacheData
    });

    console.log(`✅ TMDb force refresh complete for ${figureId} (${personDetails.name})`);

    return filmography;
}

/**
 * Get cache info for a figure (useful for admin dashboard)
 */
export async function getTMDbCacheInfo(figureId: string): Promise<{
    hasCachedData: boolean;
    lastUpdated?: string;
    daysOld?: number;
    isFresh?: boolean;
    personId?: number;
    personName?: string;
    alsoKnownAs?: string[];
    castCount?: number;
    crewCount?: number;
}> {
    try {
        const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        if (!figureDoc.exists) {
            return { hasCachedData: false };
        }

        const data = figureDoc.data();
        const cachedData = data?.[CACHE_FIELD] as TMDbCacheData | undefined;

        if (!cachedData || !cachedData.last_updated) {
            return { hasCachedData: false };
        }

        const lastUpdatedDate = new Date(cachedData.last_updated);
        const daysOld = (new Date().getTime() - lastUpdatedDate.getTime()) / (1000 * 60 * 60 * 24);

        return {
            hasCachedData: true,
            lastUpdated: cachedData.last_updated,
            daysOld: Math.floor(daysOld),
            isFresh: isCacheFresh(cachedData.last_updated),
            personId: cachedData.person_id,
            personName: cachedData.person_name,
            alsoKnownAs: cachedData.also_known_as,
            castCount: cachedData.filmography?.cast?.length || 0,
            crewCount: cachedData.filmography?.crew?.length || 0
        };
    } catch (error) {
        console.error('Error getting TMDb cache info:', error);
        return { hasCachedData: false };
    }
}

/**
 * Clear TMDb cache for a figure (admin function)
 */
export async function clearTMDbCache(figureId: string): Promise<void> {
    const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
    await figureRef.update({
        [CACHE_FIELD]: null
    });
    console.log(`🗑️ Cleared TMDb cache for ${figureId}`);
}

/**
 * Verify if cached data matches the current TMDb ID
 * Useful for detecting when TMDb IDs have been corrected
 */
export async function verifyCachedTMDbId(figureId: string, expectedTmdbId: number): Promise<{
    matches: boolean;
    cachedId?: number;
    cachedName?: string;
}> {
    try {
        const figureRef = getAdminDb().collection('selected-figures').doc(figureId);
        const figureDoc = await figureRef.get();

        if (!figureDoc.exists) {
            return { matches: false };
        }

        const data = figureDoc.data();
        const cachedData = data?.[CACHE_FIELD] as TMDbCacheData | undefined;

        if (!cachedData) {
            return { matches: false };
        }

        return {
            matches: cachedData.person_id === expectedTmdbId,
            cachedId: cachedData.person_id,
            cachedName: cachedData.person_name
        };
    } catch (error) {
        console.error('Error verifying cached TMDb ID:', error);
        return { matches: false };
    }
}
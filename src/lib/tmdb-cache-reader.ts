// src/lib/tmdb-cache-reader.ts
// Client-side SDK functions for READING TMDb cache (no Admin SDK)

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TMDbFilmography } from '@/lib/tmdb';

const CACHE_FIELD = 'tmdb_data';
const CACHE_DURATION_DAYS = 30;

interface TMDbCacheData {
    filmography: TMDbFilmography;
    last_updated: string;
    person_id: number;
    person_name: string;
    also_known_as: string[];
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
 * Read TMDb cache from Firestore using CLIENT SDK
 * Returns cached data if fresh and matches tmdbId, null if stale or missing
 * This function does NOT initialize Admin SDK
 */
export async function readTMDbCache(
    figureId: string,
    tmdbId: number | null | undefined
): Promise<TMDbFilmography | null> {
    if (!tmdbId) {
        console.log(`No TMDb ID provided for ${figureId}`);
        return null;
    }

    try {
        const figureRef = doc(db, 'selected-figures', figureId);
        const figureDoc = await getDoc(figureRef);

        if (!figureDoc.exists()) {
            console.log(`Figure ${figureId} not found`);
            return null;
        }

        const data = figureDoc.data();
        const cachedData = data?.[CACHE_FIELD] as TMDbCacheData | undefined;

        if (!cachedData || !cachedData.last_updated) {
            console.log(`No TMDb cache found for ${figureId}`);
            return null;
        }

        // Verify TMDb ID matches
        if (cachedData.person_id !== tmdbId) {
            console.log(`TMDb ID mismatch for ${figureId} (cached: ${cachedData.person_id}, requested: ${tmdbId})`);
            return null;
        }

        // Check freshness
        if (!isCacheFresh(cachedData.last_updated)) {
            console.log(`TMDb cache expired for ${figureId}`);
            return null;
        }

        console.log(`✅ Using fresh cached TMDb data for ${figureId} (${cachedData.person_name}) (client SDK)`);
        return cachedData.filmography;

    } catch (error) {
        console.error(`Error reading TMDb cache for ${figureId}:`, error);
        return null;
    }
}

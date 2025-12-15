// src/lib/tmdb-data-reader.ts
// Simple database reader for TMDb data - no API calls, no cache checking

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { TMDbCredit } from '@/lib/tmdb';

export interface TMDbFilmographyData {
    cast: TMDbCredit[];
    crew: TMDbCredit[];
}

interface FilmographyObject {
    cast: TMDbCredit[];
    crew: TMDbCredit[];
}

interface TMDbCacheData {
    filmography?: FilmographyObject;
    last_updated?: string;
    tmdb_id?: number;
    error?: string;
}

/**
 * Read TMDb filmography data from database
 * Structure: tmdb_data.filmography.cast and tmdb_data.filmography.crew
 * Simply returns whatever is stored - no cache freshness checks, no API fallbacks
 */
export async function getTMDbData(
    figureId: string
): Promise<TMDbFilmographyData | null> {
    try {
        const figureRef = doc(db, 'selected-figures', figureId);
        const figureDoc = await getDoc(figureRef);

        if (!figureDoc.exists()) {
            console.log(`Figure ${figureId} not found`);
            return null;
        }

        const data = figureDoc.data();
        const tmdbData = data?.tmdb_data as TMDbCacheData | undefined;

        if (!tmdbData) {
            console.log(`No TMDb data found for ${figureId}`);
            return null;
        }

        if (tmdbData.error) {
            console.log(`TMDb data has error for ${figureId}: ${tmdbData.error}`);
            return null;
        }

        // Access the filmography object nested inside tmdb_data
        const filmography = tmdbData.filmography;

        if (!filmography) {
            console.log(`No filmography object found in tmdb_data for ${figureId}`);
            return null;
        }

        if (!filmography.cast && !filmography.crew) {
            console.log(`TMDb filmography has no cast or crew for ${figureId}`);
            return null;
        }

        return {
            cast: filmography.cast || [],
            crew: filmography.crew || []
        };

    } catch (error) {
        console.error(`Error reading TMDb data for ${figureId}:`, error);
        return null;
    }
}

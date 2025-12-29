// src/lib/tmdb.ts

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Types for TMDb API responses
export interface TMDbPerson {
    id: number;
    name: string;
    also_known_as: string[];
    biography: string;
    birthday: string | null;
    deathday: string | null;
    gender: number; // 0: Not specified, 1: Female, 2: Male, 3: Non-binary
    place_of_birth: string | null;
    popularity: number;
    profile_path: string | null;
    known_for_department: string;
}

export interface TMDbCredit {
    id: number;
    title?: string; // For movies
    name?: string; // For TV shows
    original_title?: string;
    original_name?: string;
    release_date?: string; // For movies
    first_credit_air_date?: string; // For TV shows
    character?: string; // For acting credits
    job?: string; // For crew credits
    department?: string;
    episode_count?: number; // For TV shows
    media_type: 'movie' | 'tv';
    poster_path: string | null;
    backdrop_path: string | null;
    vote_average: number;
    vote_count: number;
    overview: string;
    genre_ids: number[];
    popularity: number;
}

export interface TMDbFilmography {
    cast: TMDbCredit[];
    crew: TMDbCredit[];
}

export interface TMDbSearchResult {
    id: number;
    name: string;
    known_for_department: string;
    profile_path: string | null;
    popularity: number;
    known_for: Array<{
        id: number;
        title?: string;
        name?: string;
        media_type: 'movie' | 'tv';
        poster_path: string | null;
    }>;
}

/**
 * Search for a person by name
 */
export async function searchPerson(query: string): Promise<TMDbSearchResult[]> {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const url = `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDb API error: ${response.status}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('Error searching person on TMDb:', error);
        throw error;
    }
}

/**
 * Get detailed person information by TMDb ID
 * THIS IS THE PRIMARY METHOD - always use verified TMDb IDs
 */
export async function getPersonDetails(personId: number): Promise<TMDbPerson> {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const url = `${TMDB_BASE_URL}/person/${personId}?api_key=${TMDB_API_KEY}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDb API error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching person details from TMDb:', error);
        throw error;
    }
}

/**
 * Get complete filmography by TMDb ID (combined movie and TV credits)
 * THIS IS THE PRIMARY METHOD - always use verified TMDb IDs
 */
export async function getPersonFilmography(personId: number): Promise<TMDbFilmography> {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const url = `${TMDB_BASE_URL}/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDb API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Sort credits by date (most recent first)
        const sortByDate = (a: TMDbCredit, b: TMDbCredit) => {
            const dateA = a.release_date || a.first_credit_air_date || '0';
            const dateB = b.release_date || b.first_credit_air_date || '0';
            return dateB.localeCompare(dateA);
        };

        return {
            cast: (data.cast || []).sort(sortByDate),
            crew: (data.crew || []).sort(sortByDate)
        };
    } catch (error) {
        console.error('Error fetching person filmography from TMDb:', error);
        throw error;
    }
}

/**
 * Get person's images (profile photos) by TMDb ID
 */
export async function getPersonImages(personId: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const url = `${TMDB_BASE_URL}/person/${personId}/images?api_key=${TMDB_API_KEY}`;

    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`TMDb API error: ${response.status}`);
        }

        const data = await response.json();
        return data.profiles || [];
    } catch (error) {
        console.error('Error fetching person images from TMDb:', error);
        throw error;
    }
}

/**
 * Helper function to get full image URL
 */
export function getImageUrl(path: string | null, size: 'w185' | 'w500' | 'original' = 'w500'): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
}

/**
 * Extract TMDb person ID from a TMDb URL
 * Example: https://www.themoviedb.org/person/60476-song-joong-ki -> 60476
 */
export function extractTMDbPersonId(url: string): number | null {
    if (!url) return null;
    
    // Match patterns like:
    // https://www.themoviedb.org/person/60476
    // https://www.themoviedb.org/person/60476-song-joong-ki
    // https://themoviedb.org/person/60476-song-joong-ki
    const match = url.match(/themoviedb\.org\/person\/(\d+)/);
    
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    
    return null;
}

/**
 * Search for person candidates by name - FOR ADMIN USE ONLY
 * Returns all search results for MANUAL verification
 * Should only be used in admin tools to find and verify the correct TMDb ID
 * 
 * NEVER use this for automatic data fetching in production
 */
export async function findPersonCandidates(name: string, koreanName?: string): Promise<TMDbSearchResult[]> {
    try {
        // First try searching with the Korean name (more accurate for K-celebs)
        let results: TMDbSearchResult[] = [];
        
        if (koreanName) {
            results = await searchPerson(koreanName);
        }
        
        // If no results with Korean name, try English name
        if (results.length === 0 && name) {
            results = await searchPerson(name);
        }
        
        return results;
    } catch (error) {
        console.error('Error finding person candidates:', error);
        return [];
    }
}
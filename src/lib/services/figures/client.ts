// src/lib/services/figures/client.ts
// Client-side figures fetching (via API routes)

import { PublicFigure } from './types';

/**
 * Fetch top figures from API
 * Used in: Homepage, search suggestions, etc.
 */
export async function getTopFigures(limit: number = 10): Promise<PublicFigure[]> {
    try {
        const response = await fetch('/api/public-figures/top');
        if (!response.ok) {
            throw new Error('Failed to fetch figures');
        }
        const data = await response.json();
        return data.slice(0, limit);
    } catch (error) {
        console.error('Error fetching top figures:', error);
        return [];
    }
}

/**
 * Fetch all figures from API
 * Used in: All figures page
 */
export async function getAllFigures(): Promise<PublicFigure[]> {
    try {
        const response = await fetch('/api/public-figures');
        if (!response.ok) {
            throw new Error('Failed to fetch figures');
        }
        const data = await response.json();

        // The API returns { publicFigures: [...], totalCount, ... }
        if (data.publicFigures && Array.isArray(data.publicFigures)) {
            return data.publicFigures;
        } else {
            console.error('API did not return publicFigures array:', data);
            return [];
        }
    } catch (error) {
        console.error('Error fetching all figures:', error);
        return [];
    }
}

/**
 * Fetch specific figures by their IDs
 * Used in: User favorites, recommendations, etc.
 * Tries POST endpoint first, falls back to name-based search
 */
export async function getFiguresByIds(figureIds: string[]): Promise<PublicFigure[]> {
    try {
        if (figureIds.length === 0) {
            return [];
        }

        // Try the efficient POST endpoint first
        try {
            const response = await fetch('/api/figures', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ figureIds }),
            });

            if (response.ok) {
                const figures = await response.json();
                if (figures.length > 0) {
                    return figures;
                }
            }
        } catch (postError) {
            console.log('POST method failed, trying fallback:', postError);
        }

        // If POST failed or returned no results, try name-based search
        const searchResults = [];

        for (const figureId of figureIds) {
            try {
                const response = await fetch(`/api/figures?name=${encodeURIComponent(figureId)}`);
                if (response.ok) {
                    const results = await response.json();
                    searchResults.push(...results);
                }
            } catch (searchError) {
                console.log(`Name search failed for ${figureId}:`, searchError);
            }
        }

        // Remove duplicates
        const uniqueResults = searchResults.filter((figure, index, self) =>
            index === self.findIndex(f => f.id === figure.id)
        );

        return uniqueResults;

    } catch (error) {
        console.error('Error in getFiguresByIds:', error);
        return [];
    }
}

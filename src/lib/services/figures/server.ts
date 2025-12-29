// src/lib/services/figures/server.ts
// Server-side figures fetching (direct Firestore access)
// Use these ONLY in Server Components, API routes, or server actions

import { db } from "@/lib/config/firebase";
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from "firebase/firestore";
import { PublicFigure, FigureId, FiguresResult } from './types';

/**
 * Fetch all figure IDs for sitemap generation
 * Used in: sitemap.xml generation
 * Server-side only
 */
export async function fetchAllFigureIds(): Promise<FigureId[]> {
    try {
        const figuresQuery = query(collection(db, 'selected-figures'), orderBy('name'));
        const querySnapshot = await getDocs(figuresQuery);

        // We only need the ID for the sitemap
        const figureIds = querySnapshot.docs.map(doc => ({ id: doc.id }));

        console.log(`Successfully fetched ${figureIds.length} figure IDs for sitemap.`);
        return figureIds;

    } catch (error) {
        console.error("Error fetching figure IDs from Firestore:", error);
        return []; // Return an empty array on error
    }
}

/**
 * Fetch initial page of figures from Firestore
 * Used in: Server-rendered all-figures page
 * Server-side only
 */
export async function fetchInitialFigures(pageSize: number = 18): Promise<FiguresResult> {
    try {
        const collectionRef = collection(db, 'selected-figures');

        // Fetch only the first page of data for initial load
        const firestoreQuery = query(
            collectionRef,
            orderBy('name'),
            firestoreLimit(pageSize)
        );

        const snapshot = await getDocs(firestoreQuery);

        const figures: PublicFigure[] = snapshot.docs.map(doc => {
            const data = doc.data();

            // Parse occupation array
            const occupations: string[] = [];
            if (data.occupation && Array.isArray(data.occupation)) {
                data.occupation.forEach((occ: string) => {
                    const splitOccs = occ.split(' / ').map((part: string) => part.trim());
                    occupations.push(...splitOccs);
                });
            }

            return {
                id: doc.id,
                name: data.name || '',
                name_kr: data.name_kr,
                profilePic: data.profilePic || '',
                occupation: occupations,
                gender: data.gender || '',
                categories: data.categories || [],
                group: data.group || ''
            };
        });

        // Get the actual total count from the database
        const totalCount = await getFiguresCount();

        return {
            figures,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize)
        };
    } catch (error) {
        console.error('Error fetching initial figures:', error);
        return {
            figures: [],
            totalCount: 0,
            totalPages: 0
        };
    }
}

/**
 * Get total count of figures in database
 * Used in: Stats, analytics
 * Server-side only
 */
export async function getFiguresCount(): Promise<number> {
    try {
        const collectionRef = collection(db, 'selected-figures');
        const snapshot = await getDocs(query(collectionRef));
        return snapshot.size;
    } catch (error) {
        console.error('Error getting figures count:', error);
        return 0;
    }
}

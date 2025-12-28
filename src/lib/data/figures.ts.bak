// Server-side data fetching for figures
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit as firestoreLimit } from "firebase/firestore";

export interface Figure {
    id: string;
    name: string;
    profilePic?: string;
    occupation?: string[];
    gender?: string;
    categories?: string[];
    group?: string;
}

interface FiguresResult {
    figures: Figure[];
    totalCount: number;
    totalPages: number;
}

// Fetch figures directly from Firestore on the server
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

        const figures: Figure[] = snapshot.docs.map(doc => {
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
                profilePic: data.profilePic || '',
                occupation: occupations,
                gender: data.gender || '',
                categories: data.categories || [],
                group: data.group || ''
            };
        });

        // For total count, we'll get it from a separate lightweight query
        // Or we can get it from the API call later
        // For now, we'll return approximate values
        return {
            figures,
            totalCount: 260, // Hardcoded for now, will be updated by client
            totalPages: Math.ceil(260 / pageSize)
        };
    } catch (error) {
        console.error('Error fetching initial figures:', error);
        // Return empty result on error
        return {
            figures: [],
            totalCount: 0,
            totalPages: 0
        };
    }
}

// Optimized function to get just the count
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

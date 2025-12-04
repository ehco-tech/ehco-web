// src/hooks/useFigureProfile.ts
'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FigureProfile {
    profilePic?: string;
    name?: string;
}

interface UseFigureProfileReturn {
    profilePic?: string;
    loading: boolean;
    error: string | null;
}

/**
 * Hook to fetch a figure's profile picture by figureId
 * Uses in-memory caching to avoid redundant fetches
 */
export function useFigureProfile(figureId: string): UseFigureProfileReturn {
    const [profilePic, setProfilePic] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!figureId) {
            setLoading(false);
            return;
        }

        // Check cache first
        const cached = figureProfileCache.get(figureId);
        if (cached) {
            setProfilePic(cached.profilePic);
            setLoading(false);
            return;
        }

        const fetchFigureProfile = async () => {
            try {
                setLoading(true);
                setError(null);

                const figureRef = doc(db, 'selected-figures', figureId);
                const figureSnap = await getDoc(figureRef);

                if (figureSnap.exists()) {
                    const data = figureSnap.data() as FigureProfile;
                    const profilePicUrl = data.profilePic;

                    // Cache the result
                    figureProfileCache.set(figureId, { profilePic: profilePicUrl });

                    setProfilePic(profilePicUrl);
                } else {
                    setError('Figure not found');
                }
            } catch (err) {
                console.error('Error fetching figure profile:', err);
                setError('Failed to fetch figure profile');
            } finally {
                setLoading(false);
            }
        };

        fetchFigureProfile();
    }, [figureId]);

    return { profilePic, loading, error };
}

/**
 * Hook to fetch multiple figure profiles at once
 * More efficient when you need multiple profile pictures
 */
export function useFigureProfiles(figureIds: string[]): Record<string, UseFigureProfileReturn> {
    const [profiles, setProfiles] = useState<Record<string, UseFigureProfileReturn>>({});

    useEffect(() => {
        if (!figureIds.length) {
            setProfiles({});
            return;
        }

        const fetchProfiles = async () => {
            const results: Record<string, UseFigureProfileReturn> = {};

            // Check cache first and mark what needs fetching
            const idsToFetch: string[] = [];
            figureIds.forEach(id => {
                const cached = figureProfileCache.get(id);
                if (cached) {
                    results[id] = { profilePic: cached.profilePic, loading: false, error: null };
                } else {
                    results[id] = { profilePic: undefined, loading: true, error: null };
                    idsToFetch.push(id);
                }
            });

            // Update with cached results immediately
            setProfiles({ ...results });

            // Fetch uncached profiles
            if (idsToFetch.length > 0) {
                await Promise.all(
                    idsToFetch.map(async (id) => {
                        try {
                            const figureRef = doc(db, 'selected-figures', id);
                            const figureSnap = await getDoc(figureRef);

                            if (figureSnap.exists()) {
                                const data = figureSnap.data() as FigureProfile;
                                const profilePicUrl = data.profilePic;

                                // Cache the result
                                figureProfileCache.set(id, { profilePic: profilePicUrl });

                                results[id] = { profilePic: profilePicUrl, loading: false, error: null };
                            } else {
                                results[id] = { profilePic: undefined, loading: false, error: 'Figure not found' };
                            }
                        } catch (err) {
                            console.error(`Error fetching profile for ${id}:`, err);
                            results[id] = { profilePic: undefined, loading: false, error: 'Failed to fetch' };
                        }
                    })
                );

                setProfiles({ ...results });
            }
        };

        fetchProfiles();
    }, [figureIds.join(',')]); // Use join to create stable dependency

    return profiles;
}

/**
 * In-memory cache for figure profiles
 * This prevents redundant fetches during the same session
 */
const figureProfileCache = new Map<string, FigureProfile>();

/**
 * Clear the figure profile cache
 * Useful if you need to refresh profile data
 */
export function clearFigureProfileCache() {
    figureProfileCache.clear();
}

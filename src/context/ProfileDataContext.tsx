// src/context/ProfileDataContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile } from '@/lib/services/users/user-service';
import { getUserFavorites, FavoriteItem } from '@/lib/services/favorites/favorites-service';
import { getUserScrappedEvents, ScrappedEventItem } from '@/lib/services/scraping/scrapping-service';
import { getArticlesByIds } from '@/lib/services/articles/article-service';
import { getFiguresByIds, PublicFigure } from '@/lib/services/figures';
import { getNotificationPreferences, updateNotificationPreferences, NotificationPreferences } from '@/lib/services/notifications/notification-service';
import { Article } from '@/types/definitions';

interface UserProfile {
    nickname: string;
    email: string;
    profilePicture?: string;
    // Add any other fields that are part of your user profile
}

interface TimelinePoint {
    sourceIds?: string[];
    date: string;
    description: string;
    sources?: { id?: string }[];
    // is_description_compacted_v2: boolean;
}

// Define the shape of the data in our context
interface ProfileDataContextType {
    userProfile: UserProfile | null;
    favorites: FavoriteItem[];
    scrappedEvents: ScrappedEventItem[];
    articles: Article[];
    figureData: Map<string, PublicFigure>;
    notificationPreferences: NotificationPreferences | null;
    isLoading: boolean;
    isRouteLoading: boolean; // New: For route transition loading
    setFavorites: React.Dispatch<React.SetStateAction<FavoriteItem[]>>;
    setScrappedEvents: React.Dispatch<React.SetStateAction<ScrappedEventItem[]>>;
    setNotificationPreferences: React.Dispatch<React.SetStateAction<NotificationPreferences | null>>;
    setRouteLoading: React.Dispatch<React.SetStateAction<boolean>>; // New: Control route loading
}

// Create the context with a default value
const ProfileDataContext = createContext<ProfileDataContextType | undefined>(undefined);

// Create the Provider component
export function ProfileDataProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [scrappedEvents, setScrappedEvents] = useState<ScrappedEventItem[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [figureData, setFigureData] = useState<Map<string, PublicFigure>>(new Map());
    const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRouteLoading, setIsRouteLoading] = useState(false); // New state for route loading
    const [previousPathname, setPreviousPathname] = useState<string>('');

    // Handle route changes for loading overlay
    useEffect(() => {
        if (previousPathname && previousPathname !== pathname) {
            // Don't show loading overlay for tab switches within the profile page
            const isProfilePage = pathname.startsWith('/profile');
            const wasPreviouslyProfilePage = previousPathname.startsWith('/profile');

            // Only show loading if navigating TO or FROM profile page, not between tabs
            if (isProfilePage && wasPreviouslyProfilePage) {
                // Both are profile pages, so this is a tab switch - no loading
                setPreviousPathname(pathname);
                return;
            }

            setIsRouteLoading(true);

            // Set a timeout to hide loading after navigation completes
            const timer = setTimeout(() => {
                setIsRouteLoading(false);
            }, 300); // Adjust timing as needed

            return () => clearTimeout(timer);
        }
        setPreviousPathname(pathname);
    }, [pathname, previousPathname]);

    useEffect(() => {
        // Only fetch if the user is available and data hasn't been fetched yet
        if (user && isLoading) {
            const loadAllProfileData = async () => {
                try {
                    // Fetch everything in parallel for performance
                    const [profileData, userFavorites, userScrappedEvents, notifPreferences] = await Promise.all([
                        getUserProfile(user.uid),
                        getUserFavorites(user.uid),
                        getUserScrappedEvents(user.uid),
                        getNotificationPreferences(user.uid)
                    ]);

                    setUserProfile(profileData);
                    setFavorites(userFavorites);
                    setScrappedEvents(userScrappedEvents);
                    setNotificationPreferences(notifPreferences);

                    // --- Logic to get articles and figures from scrapped events ---
                    const allSourceIds = new Set<string>();
                    userScrappedEvents.forEach(scrappedEvent => {
                        const timelinePoints = scrappedEvent.eventGroup?.timeline_points || [];
                        console.log(timelinePoints);
                        timelinePoints.forEach((point: TimelinePoint) => {
                            console.log(point);
                            const sourceIds = point.sourceIds 
                                // ||
                                // (point.sources?.map((source: { id?: string }) => source.id).filter(Boolean)) ||
                                // [];
                            sourceIds?.forEach((id: string) => allSourceIds.add(id));
                        });
                    });

                    if (allSourceIds.size > 0) {
                        const articlesData = await getArticlesByIds(Array.from(allSourceIds));
                        setArticles(articlesData);
                    }

                    const uniqueFigureIds = new Set<string>(userScrappedEvents.map(e => e.figureId));
                    if (uniqueFigureIds.size > 0) {
                        const figures = await getFiguresByIds(Array.from(uniqueFigureIds));
                        if (Array.isArray(figures)) {
                            const figureMap = new Map<string, PublicFigure>();
                            figures.forEach(figure => figureMap.set(figure.id, figure));
                            setFigureData(figureMap);
                        }
                    }
                    // --- End of logic ---

                } catch (error) {
                    console.error("Failed to load profile data:", error);
                } finally {
                    setIsLoading(false); // Set loading to false after all fetches are done
                }
            };

            loadAllProfileData();
        }
    }, [user, isLoading]);

    const value = {
        userProfile,
        favorites,
        scrappedEvents,
        articles,
        figureData,
        notificationPreferences,
        isLoading,
        isRouteLoading, // New: Expose route loading state
        setFavorites, // Pass the setter so children can update state (e.g., remove a favorite)
        setScrappedEvents,
        setNotificationPreferences,
        setRouteLoading: setIsRouteLoading, // New: Allow manual control of route loading
    };

    return (
        <ProfileDataContext.Provider value={value}>
            {children}
        </ProfileDataContext.Provider>
    );
}

// Create a custom hook for easy consumption
export function useProfileData() {
    const context = useContext(ProfileDataContext);
    if (context === undefined) {
        throw new Error('useProfileData must be used within a ProfileDataProvider');
    }
    return context;
}
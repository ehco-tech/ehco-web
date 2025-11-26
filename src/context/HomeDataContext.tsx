'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types matching the home page
interface FeaturedUpdate {
  eventTitle: string;
  eventSummary: string;
  eventPointDescription: string;
  eventPointDate: string;
  mainCategory: string;
  subcategory: string;
  lastUpdated?: number;
}

interface PublicFigure {
  id: string;
  name: string;
  name_kr?: string;
  profilePic?: string;
  occupation?: string[];
  nationality?: string;
  gender?: string;
  company?: string;
  stats?: {
    totalFacts: number;
    totalSources: number;
  };
  featuredUpdate?: FeaturedUpdate;
}

interface TrendingUpdate {
  id: string;
  title: string;
  user: {
    initials: string;
    profilePic?: string;
    name?: string;
  };
  description: string;
  timeAgo: string;
  source?: string;
  verified: boolean;
  figureId: string;
  eventTitle: string;
}

interface StatsData {
  totalFigures: number;
  totalFacts: number;
}

interface CachedHomeData {
  featuredFigures: PublicFigure[];
  trendingUpdates: TrendingUpdate[];
  stats: StatsData;
  timestamp: number;
}

interface HomeDataContextType {
  cachedData: CachedHomeData | null;
  setCachedData: (data: CachedHomeData) => void;
  isCacheValid: () => boolean;
  clearCache: () => void;
}

const HomeDataContext = createContext<HomeDataContextType | undefined>(undefined);

const CACHE_KEY = 'ehco_home_data_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// Load initial cache synchronously to avoid flash
const loadInitialCache = (): CachedHomeData | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CachedHomeData;
      return parsed;
    }
  } catch (error) {
    console.error('Error loading cached home data:', error);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEY);
    }
  }
  return null;
};

export function HomeDataProvider({ children }: { children: ReactNode }) {
  const [cachedData, setCachedDataState] = useState<CachedHomeData | null>(() => {
    return loadInitialCache();
  });

  // Check if cache is still valid (less than 1 hour old) - memoized to prevent re-renders
  const isCacheValid = useCallback((): boolean => {
    if (!cachedData) {
      return false;
    }
    const now = Date.now();
    const age = now - cachedData.timestamp;
    const isValid = age < CACHE_DURATION;
    return isValid;
  }, [cachedData]);

  // Set cached data and persist to localStorage - memoized to prevent re-renders
  const setCachedData = useCallback((data: CachedHomeData) => {
    try {
      setCachedDataState(data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving cached home data:', error);
    }
  }, []);

  // Clear cache - memoized to prevent re-renders
  const clearCache = useCallback(() => {
    setCachedDataState(null);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  return (
    <HomeDataContext.Provider
      value={{
        cachedData,
        setCachedData,
        isCacheValid,
        clearCache,
      }}
    >
      {children}
    </HomeDataContext.Provider>
  );
}

export function useHomeData() {
  const context = useContext(HomeDataContext);
  if (context === undefined) {
    throw new Error('useHomeData must be used within a HomeDataProvider');
  }
  return context;
}

// src/types/home.ts
// Type definitions for home page components

export type AlgoliaPublicFigure = {
    objectID: string;
    name?: string;
    name_kr?: string;
    profilePic?: string;
    _highlightResult?: {
        name?: {
            value: string;
            matchLevel: string;
            matchedWords: string[];
        };
        name_kr?: {
            value: string;
            matchLevel: string;
            matchedWords: string[];
        };
    };
}

export interface PublicFigure {
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
    featuredUpdate?: {
        eventTitle: string;
        eventSummary: string;
        eventPointDescription: string;
        eventPointDate: string;
        mainCategory: string;
        subcategory: string;
        lastUpdated?: number;
    };
}

export type FeaturedFigure = PublicFigure;

export type TrendingUpdate = {
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
};

export interface UpdateDocument {
    id: string;
    figureId: string;
    figureName: string;
    figureProfilePic?: string;
    eventTitle: string;
    eventSummary: string;
    mainCategory: string;
    subcategory: string;
    eventYears: number[];
    eventPointDate: string;
    eventPointDescription: string;
    eventPointSourceIds: string[];
    publishDate: string;
    mostRecentSourceId: string;
    allTimelinePoints: {
        date: string;
        description: string;
        sourceIds: string[];
    }[];
    createdAt: number;
    lastUpdated: number;
}

export interface HomeStats {
    totalFigures: number;
    totalFacts: number;
}

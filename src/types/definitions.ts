// This file will be the single source of truth for our shared types.

// --- SHARED INTERFACES ---

// For Curation Data
export interface QuickFact {
    text: string;
    badge: 'verified' | 'community' | 'self-reported' | null;
}

export interface CurationParagraph {
    text: string; // Text with inline markers like "Some text[FN:1] more text[FN:2]"
}

export interface CurationArticle {
    title: string;
    paragraphs: CurationParagraph[];
}

export interface CurationFootnote {
    number: number;
    text: string;
    url: string;
}

export interface CurationData {
    title: string;
    subtitle: string;
    lastEdited: string;
    quickFacts: QuickFact[];
    articles: CurationArticle[];
    footnotes: CurationFootnote[];
}

// For Curated Timeline Data
export interface TimelinePoint {
    date: string;
    description: string;
    sourceIds?: string[];
    sources?: { id?: string }[];
}

export interface CuratedEvent {
    event_title: string;
    event_summary: string;
    event_years: number[];
    primary_date: string;
    timeline_points: TimelinePoint[];
    status: string;
    sources: { id?: string }[];
}

export interface CuratedTimelineData {
    [mainCategory: string]: {
        description: string;
        subCategories: {
            [subCategory: string]: CuratedEvent[];
        };
    };
}

// Main Overview
export interface MainOverview {
    id: string;
    content: string;
    articleIds: string[];
}

// API Response Structure (simplified - no more schema versioning)
export interface TimelineContent {
    data: CuratedTimelineData;
}

export interface ApiContentResponse {
    main_overview: MainOverview;
    timeline_content: TimelineContent;
}

// For Articles & Summaries
export interface Article {
    id: string;
    link: string;
    subTitle: string;
    title: string;
    body: string;
    source: string;
    sendDate: string;
    imageUrls: string[];
}

export interface ArticleSummary {
    id: string;
    event_contents?: Record<string, string>;
    subCategory?: string;
    category?: string;
    content?: string;
    title?: string;
}

// ============================================================================
// DEPRECATED - Keeping these temporarily for reference, but they're no longer used
// Remove these once you've confirmed everything works
// ============================================================================

// For v1 Legacy Data (DEPRECATED)
export interface WikiContentItem {
    id: string;
    category: string;
    subcategory?: string;
    content: string;
    articleIds: string[];
}

export interface LegacyWikiData {
    categoryContent: WikiContentItem[];
}

export interface V1TimelineContent {
    schema_version: 'v1_legacy';
    data: LegacyWikiData;
}

export interface V2TimelineContent {
    schema_version: 'v2_curated';
    data: CuratedTimelineData;
}

// Old type that included both v1 and v2 (DEPRECATED)
// export type TimelineContent = V1TimelineContent | V2TimelineContent;
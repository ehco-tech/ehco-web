// src/lib/utils/timelineUtils.ts

import { CuratedEvent, Article, CuratedTimelineData } from '@/types/definitions';

/**
 * Check if an event matches the search query
 */
export const eventMatchesSearch = (
    event: CuratedEvent,
    query: string,
    articles?: Article[]
): boolean => {
    if (!query.trim()) return true;

    const searchLower = query.toLowerCase();

    // Search in event title
    if (event.event_title?.toLowerCase().includes(searchLower)) return true;

    // Search in event summary
    if (event.event_summary?.toLowerCase().includes(searchLower)) return true;

    // Search in timeline points (date and description)
    if (event.timeline_points?.some(point =>
        point.date?.toLowerCase().includes(searchLower) ||
        point.description?.toLowerCase().includes(searchLower)
    )) return true;

    // Search in event years
    if (event.event_years?.some((year: number) =>
        year.toString().includes(query)
    )) return true;

    // Search in primary date
    if (event.primary_date?.toLowerCase().includes(searchLower)) return true;

    // Search in related article sources
    if (event.sources && articles) {
        const sourceIds = event.sources.map(s => s.id).filter(Boolean);
        const relatedArticles = articles.filter(article =>
            sourceIds.includes(article.id)
        );
        if (relatedArticles.some(article =>
            article.title?.toLowerCase().includes(searchLower) ||
            article.subTitle?.toLowerCase().includes(searchLower) ||
            article.body?.toLowerCase().includes(searchLower)
        )) return true;
    }

    return false;
};

/**
 * Get count of events in a category that match filters
 */
export const getCategoryCount = (
    category: string,
    timelineData: CuratedTimelineData,
    activeYear: string | null,
    debouncedSearchQuery: string,
    articles?: Article[]
): number => {
    if (!timelineData[category]) return 0;
    return Object.values(timelineData[category].subCategories).reduce(
        (total, events) => {
            const filteredEvents = events.filter(event => {
                const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery, articles);
                return matchesYear && matchesSearch;
            });
            return total + filteredEvents.length;
        },
        0
    );
};

/**
 * Get count of events in a subcategory that match filters
 */
export const getSubCategoryCount = (
    mainCategory: string,
    subCategory: string,
    timelineData: CuratedTimelineData,
    activeYear: string | null,
    debouncedSearchQuery: string,
    articles?: Article[]
): number => {
    if (subCategory === 'All Events') {
        return getCategoryCount(mainCategory, timelineData, activeYear, debouncedSearchQuery, articles);
    }
    if (!timelineData[mainCategory] || !timelineData[mainCategory].subCategories[subCategory]) {
        return 0;
    }
    const events = timelineData[mainCategory].subCategories[subCategory];
    const filteredEvents = events.filter(event => {
        const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
        const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery, articles);
        return matchesYear && matchesSearch;
    });
    return filteredEvents.length;
};

/**
 * Get filtered event count for current selection
 */
export const getFilteredEventCount = (
    timelineData: CuratedTimelineData,
    activeMainCategory: string,
    activeSubCategory: string,
    activeYear: string | null,
    debouncedSearchQuery: string,
    articles?: Article[]
): number => {
    if (!timelineData[activeMainCategory]) return 0;

    const categoryData = timelineData[activeMainCategory];
    let total = 0;

    if (activeSubCategory === 'All Events') {
        // Count all events in main category
        Object.values(categoryData.subCategories).forEach(events => {
            const filteredEvents = events.filter(event => {
                const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery, articles);
                return matchesYear && matchesSearch;
            });
            total += filteredEvents.length;
        });
    } else {
        // Count events in specific subcategory
        const events = categoryData.subCategories[activeSubCategory] || [];
        const filteredEvents = events.filter(event => {
            const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
            const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery, articles);
            return matchesYear && matchesSearch;
        });
        total += filteredEvents.length;
    }

    return total;
};

/**
 * Get all available years from timeline data
 */
export const getAvailableYears = (timelineData: CuratedTimelineData): number[] => {
    const years = new Set<number>();

    Object.values(timelineData).forEach(mainCategory => {
        Object.values(mainCategory.subCategories).forEach(events => {
            events.forEach(event => {
                event.event_years?.forEach(year => years.add(year));
            });
        });
    });

    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
};

/**
 * Find category and subcategory containing a specific event by slug
 */
export const findEventLocation = (
    timelineData: CuratedTimelineData,
    eventSlug: string
): { mainCategory: string | null; subCategory: string | null } => {
    let foundMainCategory: string | null = null;
    let foundSubCategory: string | null = null;

    Object.entries(timelineData).forEach(([mainCat, mainCatData]) => {
        Object.entries(mainCatData.subCategories).forEach(([subCat, events]) => {
            const hasEvent = events.some(event => {
                const slug = event.event_title
                    .toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^\w-]+/g, '');
                return slug === eventSlug;
            });

            if (hasEvent) {
                foundMainCategory = mainCat;
                foundSubCategory = subCat;
            }
        });
    });

    return { mainCategory: foundMainCategory, subCategory: foundSubCategory };
};

// src/components/CareerJourneyRefactored.tsx
'use client';

import React, { useState, useMemo } from 'react';
import CuratedTimelineView from '../../timeline/CuratedTimelineView';
import TimelineFilters from './TimelineFilters';
import { useProgressiveArticles } from '@/hooks/useProgressiveArticles';
import { useTimelineFilters } from '@/hooks/useTimelineFilters';
import { useHashScroll } from '@/hooks/useHashScroll';
import {
    eventMatchesSearch,
    getCategoryCount,
    getSubCategoryCount,
    getFilteredEventCount,
    getAvailableYears
} from '@/lib/utils/timelineUtils';
import {
    CuratedTimelineData,
    Article,
    CuratedEvent,
} from '@/types/definitions';

// --- INTERFACES ---
interface ApiResponse {
    data: CuratedTimelineData;
}

interface CareerJourneyProps {
    apiResponse: ApiResponse;
    articles: Article[];
    allArticleIds: string[];
    figureId: string;
    figureName: string;
    figureNameKr: string;
    totalEventCount: number;
}

// --- CONSTANTS ---
const MAIN_CATEGORIES = [
    'Creative Works',
    'Live & Broadcast',
    'Public Relations',
    'Personal Milestones',
    'Incidents & Controversies'
];

const ORDERED_SUB_CATEGORIES: { [key: string]: string[] } = {
    "Creative Works": ["Music", "Film & TV", "Publications & Art", "Awards & Honors"],
    "Live & Broadcast": ["Concerts & Tours", "Fan Events", "Broadcast Appearances"],
    "Public Relations": ["Media Interviews", "Endorsements & Ambassadors", "Social & Digital"],
    "Personal Milestones": ["Relationships & Family", "Health & Service", "Education & Growth"],
    "Incidents & Controversies": ["Legal & Scandal", "Accidents & Emergencies", "Public Backlash"]
};

// --- COMPONENT ---
const CareerJourney: React.FC<CareerJourneyProps> = ({
    apiResponse,
    articles: initialArticles,
    allArticleIds,
    figureId,
    figureName,
    figureNameKr,
    totalEventCount
}) => {
    const timelineData = apiResponse.data;

    // Use progressive loading to fetch remaining articles
    const { articles, isLoading: isLoadingArticles, progress } = useProgressiveArticles({
        initialArticles,
        allArticleIds,
        figureId,
        batchSize: 500,
        enabled: allArticleIds.length > initialArticles.length
    });

    // Use timeline filters hook
    const {
        activeMainCategory,
        activeSubCategory,
        activeYear,
        searchQuery,
        debouncedSearchQuery,
        scrollPositionRef,
        handleMainCategoryChange,
        handleSubCategoryChange,
        handleYearClick,
        handleSearchChange,
        clearSearch,
        availableSubCategories
    } = useTimelineFilters({
        timelineData,
        mainCategories: MAIN_CATEGORIES,
        orderedSubCategories: ORDERED_SUB_CATEGORIES
    });

    // Use hash scroll hook
    useHashScroll({
        timelineData,
        setActiveMainCategory: handleMainCategoryChange,
        setActiveSubCategory: handleSubCategoryChange
    });

    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(true);

    // Get available categories and their event counts
    const availableCategories = MAIN_CATEGORIES.filter(cat => timelineData[cat]);

    // Get all available years from the data
    const availableYears = useMemo(() => getAvailableYears(timelineData), [timelineData]);

    // Helper functions for filter counts
    const handleGetCategoryCount = (category: string): number =>
        getCategoryCount(category, timelineData, activeYear, debouncedSearchQuery, articles);

    const handleGetSubCategoryCount = (mainCategory: string, subCategory: string): number =>
        getSubCategoryCount(mainCategory, subCategory, timelineData, activeYear, debouncedSearchQuery, articles);

    const filteredEventCount = getFilteredEventCount(
        timelineData,
        activeMainCategory,
        activeSubCategory,
        activeYear,
        debouncedSearchQuery,
        articles
    );

    // Event handlers that preserve scroll position
    const handleMainCategoryClick = (category: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleMainCategoryChange(category);
    };

    const handleSubCategoryClick = (subCat: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubCategoryChange(subCat);
    };

    // Create properly formatted filtered data
    const filteredTimelineData = useMemo((): CuratedTimelineData => {
        const filterEvents = (events: CuratedEvent[]) => {
            return events.filter(event => {
                const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery, articles);
                return matchesYear && matchesSearch;
            });
        };

        // If no filters applied, return full data
        if (!activeYear && !debouncedSearchQuery && activeMainCategory === 'Creative Works' && activeSubCategory === 'All Events') {
            return timelineData;
        }

        // If specific subcategory is selected
        if (activeSubCategory !== 'All Events' && timelineData[activeMainCategory]) {
            const mainCategoryData = timelineData[activeMainCategory];
            const filteredEvents = filterEvents(mainCategoryData.subCategories[activeSubCategory] || []);

            return {
                [activeMainCategory]: {
                    description: mainCategoryData.description,
                    subCategories: {
                        [activeSubCategory]: filteredEvents
                    }
                }
            } as CuratedTimelineData;
        }

        // If specific main category but "All Events" for subcategory
        if (activeSubCategory === 'All Events' && timelineData[activeMainCategory]) {
            const mainCategoryData = timelineData[activeMainCategory];
            const filteredSubCategories: { [key: string]: CuratedEvent[] } = {};

            Object.entries(mainCategoryData.subCategories).forEach(([subCat, events]) => {
                const filtered = filterEvents(events);
                if (filtered.length > 0) {
                    filteredSubCategories[subCat] = filtered;
                }
            });

            return {
                [activeMainCategory]: {
                    description: mainCategoryData.description,
                    subCategories: filteredSubCategories
                }
            } as CuratedTimelineData;
        }

        // Fallback: return empty object with proper type
        return {} as CuratedTimelineData;
    }, [timelineData, activeMainCategory, activeSubCategory, activeYear, debouncedSearchQuery, articles]);

    return (
        <div className="w-full">
            <TimelineFilters
                isFilterOpen={isFilterOpen}
                setIsFilterOpen={setIsFilterOpen}
                searchQuery={searchQuery}
                handleSearchChange={handleSearchChange}
                clearSearch={clearSearch}
                availableYears={availableYears}
                activeYear={activeYear}
                handleYearClick={handleYearClick}
                availableCategories={availableCategories}
                activeMainCategory={activeMainCategory}
                handleMainCategoryClick={handleMainCategoryClick}
                getCategoryCount={handleGetCategoryCount}
                availableSubCategories={availableSubCategories}
                activeSubCategory={activeSubCategory}
                handleSubCategoryClick={handleSubCategoryClick}
                getSubCategoryCount={handleGetSubCategoryCount}
                totalEventCount={totalEventCount}
                filteredEventCount={filteredEventCount}
                debouncedSearchQuery={debouncedSearchQuery}
            />

            {/* Timeline Content */}
            <CuratedTimelineView
                data={filteredTimelineData}
                articles={articles}
                figureId={figureId}
                figureName={figureName}
                figureNameKr={figureNameKr}
                activeMainCategory={activeMainCategory}
                activeSubCategory={activeSubCategory}
                activeYear={activeYear}
                searchQuery={debouncedSearchQuery}
            />
        </div>
    );
};

export default React.memo(CareerJourney);

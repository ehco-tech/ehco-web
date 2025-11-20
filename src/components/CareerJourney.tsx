'use client';

import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import CuratedTimelineView from './CuratedTimelineView';

// --- INTERFACES ---
import {
    CuratedTimelineData,
    Article,
    CuratedEvent,
} from '@/types/definitions';

interface ApiResponse {
    data: CuratedTimelineData;
}

interface CareerJourneyProps {
    apiResponse: ApiResponse;
    articles: Article[];
    figureId: string;
    figureName: string;
    figureNameKr: string;
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
    articles,
    figureId,
    figureName,
    figureNameKr
}) => {
    const timelineData = apiResponse.data;
    const [activeMainCategory, setActiveMainCategory] = useState<string>('Creative Works');
    const [activeSubCategory, setActiveSubCategory] = useState<string>('All Events');
    const [activeYear, setActiveYear] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

    // Store scroll position that should be maintained
    const scrollPositionRef = useRef<number | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get available categories and their event counts
    const availableCategories = MAIN_CATEGORIES.filter(cat => timelineData[cat]);

    // Get all available years from the data
    const availableYears = useMemo(() => {
        const years = new Set<number>();

        Object.values(timelineData).forEach(mainCategory => {
            Object.values(mainCategory.subCategories).forEach(events => {
                events.forEach(event => {
                    event.event_years?.forEach(year => years.add(year));
                });
            });
        });

        return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
    }, [timelineData]);

    // Helper function to check if event matches search query
    const eventMatchesSearch = (event: CuratedEvent, query: string): boolean => {
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

    const getCategoryCount = (category: string): number => {
        if (!timelineData[category]) return 0;
        return Object.values(timelineData[category].subCategories).reduce(
            (total, events) => total + events.length,
            0
        );
    };

    const getSubCategoryCount = (mainCategory: string, subCategory: string): number => {
        if (subCategory === 'All Events') {
            return getCategoryCount(mainCategory);
        }
        if (!timelineData[mainCategory] || !timelineData[mainCategory].subCategories[subCategory]) {
            return 0;
        }
        return timelineData[mainCategory].subCategories[subCategory].length;
    };

    const getFilteredEventCount = (): number => {
        if (!timelineData[activeMainCategory]) return 0;

        const categoryData = timelineData[activeMainCategory];
        let total = 0;

        if (activeSubCategory === 'All Events') {
            // Count all events in main category
            Object.values(categoryData.subCategories).forEach(events => {
                const filteredEvents = events.filter(event => {
                    const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                    const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery);
                    return matchesYear && matchesSearch;
                });
                total += filteredEvents.length;
            });
        } else {
            // Count events in specific subcategory
            const events = categoryData.subCategories[activeSubCategory] || [];
            const filteredEvents = events.filter(event => {
                const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery);
                return matchesYear && matchesSearch;
            });
            total += filteredEvents.length;
        }

        return total;
    };

    const totalEventCount = availableCategories.reduce(
        (total, cat) => total + getCategoryCount(cat),
        0
    );

    // Get available subcategories for the active main category
    const availableSubCategories = useMemo(() => {
        if (!timelineData[activeMainCategory]) return ['All Events'];

        const categoryData = timelineData[activeMainCategory];
        const orderedSubs = ORDERED_SUB_CATEGORIES[activeMainCategory] || [];

        return ['All Events', ...orderedSubs.filter(subCat =>
            categoryData.subCategories[subCat] &&
            categoryData.subCategories[subCat].length > 0
        )];
    }, [timelineData, activeMainCategory]);

    // CRITICAL: Restore scroll position after every render
    useLayoutEffect(() => {
        if (scrollPositionRef.current !== null) {
            window.scrollTo(0, scrollPositionRef.current);
            scrollPositionRef.current = null;
        }
    });

    // Debounce search query for better performance
    useLayoutEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 300); // 300ms debounce

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    // Reset subcategory when main category changes
    const handleMainCategoryChange = (category: string) => {
        scrollPositionRef.current = window.scrollY;
        setActiveMainCategory(category);
        setActiveSubCategory('All Events');
    };

    // Handle year filter click
    const handleYearClick = (year: string | null) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        scrollPositionRef.current = window.scrollY;
        setActiveYear(year);
    };

    const handleMainCategoryClick = (category: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        handleMainCategoryChange(category);
    };

    const handleSubCategoryClick = (subCat: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        scrollPositionRef.current = window.scrollY;
        setActiveSubCategory(subCat);
    };

    // Handle search input change
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        scrollPositionRef.current = window.scrollY;
        setSearchQuery(e.target.value);
    };

    // Clear search
    const clearSearch = () => {
        scrollPositionRef.current = window.scrollY;
        setSearchQuery('');
    };

    // Create properly formatted filtered data that matches CuratedTimelineData type
    const filteredTimelineData = useMemo((): CuratedTimelineData => {
        const filterEvents = (events: CuratedEvent[]) => {
            return events.filter(event => {
                const matchesYear = !activeYear || event.event_years?.includes(parseInt(activeYear));
                const matchesSearch = eventMatchesSearch(event, debouncedSearchQuery);
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
            {/* Header with Filter Toggle */}
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button"
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300"
                >
                    <Filter size={18} />
                    <span>Filters</span>
                    {isFilterOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
            </div>

            {/* Collapsible Filter Box */}
            {isFilterOpen && (
                <div className="bg-white dark:bg-[#1d1d1f] border border-gray-200 dark:border-gray-700 rounded-xl p-6 mb-6 shadow-sm">
                    <div className="mb-4">
                        {/* Search Bar at Top */}
                        <div className="mb-4 relative">
                            <input
                                type="text"
                                placeholder="Search events..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-key-color dark:focus:ring-key-color-dark focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    aria-label="Clear search"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Year Filters on Separate Line */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <button
                                type='button'
                                onClick={handleYearClick(null)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!activeYear
                                    ? 'bg-key-color dark:bg-key-color-dark text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                All Years
                            </button>
                            {availableYears.map(year => (
                                <button
                                    type='button'
                                    key={year}
                                    onClick={handleYearClick(year.toString())}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeYear === year.toString()
                                        ? 'bg-key-color dark:bg-key-color-dark text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>

                        {/* Category Section */}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Browse by Category</h3>

                        {/* Main Category Pills */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {availableCategories.map((category) => (
                                <button
                                    type='button'
                                    key={category}
                                    onClick={handleMainCategoryClick(category)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeMainCategory === category
                                        ? 'bg-key-color dark:bg-key-color-dark text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {category} ({getCategoryCount(category)})
                                </button>
                            ))}
                        </div>

                        {/* Subcategory Pills - Only show if a main category is selected */}
                        {activeMainCategory && availableSubCategories.length > 1 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">Subcategories</h4>
                                <div className="flex flex-wrap gap-2">
                                    {availableSubCategories.map((subCat) => (
                                        <button
                                            type='button'
                                            key={subCat}
                                            onClick={handleSubCategoryClick(subCat)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeSubCategory === subCat
                                                ? 'bg-key-color dark:bg-key-color-dark text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {subCat} {subCat !== 'All Events' && `(${getSubCategoryCount(activeMainCategory, subCat)})`}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Total Events: <strong className="text-gray-900 dark:text-white">{totalEventCount}</strong></span>
                        <span>•</span>
                        <span>Showing: <strong className="text-gray-900 dark:text-white">{getFilteredEventCount()} events</strong></span>
                        <span>•</span>
                        <span>
                            {activeMainCategory}
                            {activeSubCategory !== 'All Events' && ` › ${activeSubCategory}`}
                            {activeYear && ` › ${activeYear}`}
                            {debouncedSearchQuery && ` › "${debouncedSearchQuery}"`}
                        </span>
                    </div>
                </div>
            )}

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
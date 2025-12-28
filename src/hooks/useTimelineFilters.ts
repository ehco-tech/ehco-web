// src/hooks/useTimelineFilters.ts
'use client';

import { useState, useRef, useLayoutEffect, useMemo } from 'react';
import { CuratedTimelineData } from '@/types/definitions';

interface UseTimelineFiltersProps {
    timelineData: CuratedTimelineData;
    mainCategories: string[];
    orderedSubCategories: { [key: string]: string[] };
}

interface UseTimelineFiltersReturn {
    activeMainCategory: string;
    activeSubCategory: string;
    activeYear: string | null;
    searchQuery: string;
    debouncedSearchQuery: string;
    scrollPositionRef: React.MutableRefObject<number | null>;
    handleMainCategoryChange: (category: string) => void;
    handleSubCategoryChange: (subCat: string) => void;
    handleYearClick: (year: string | null) => (e: React.MouseEvent) => void;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearSearch: () => void;
    availableSubCategories: string[];
}

export const useTimelineFilters = ({
    timelineData,
    mainCategories,
    orderedSubCategories
}: UseTimelineFiltersProps): UseTimelineFiltersReturn => {
    // Initialize filters - check localStorage first for persisted filters
    const getInitialFilters = () => {
        if (typeof window === 'undefined') {
            return { mainCategory: 'Creative Works', subCategory: 'All Events' };
        }

        try {
            const savedFilters = localStorage.getItem('timelineFilters');
            if (savedFilters) {
                const parsed = JSON.parse(savedFilters);
                // Only use saved filters if they're recent (within last 5 minutes)
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                    return {
                        mainCategory: parsed.mainCategory || 'Creative Works',
                        subCategory: parsed.subCategory || 'All Events'
                    };
                }
            }
        } catch (error) {
            console.error('Error reading timeline filters from localStorage:', error);
        }
        return { mainCategory: 'Creative Works', subCategory: 'All Events' };
    };

    const initialFilters = getInitialFilters();
    const [activeMainCategory, setActiveMainCategory] = useState<string>(initialFilters.mainCategory);
    const [activeSubCategory, setActiveSubCategory] = useState<string>(initialFilters.subCategory);
    const [activeYear, setActiveYear] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

    // Store scroll position that should be maintained
    const scrollPositionRef = useRef<number | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // CRITICAL: Restore scroll position after every render
    useLayoutEffect(() => {
        if (scrollPositionRef.current !== null) {
            window.scrollTo(0, scrollPositionRef.current);
            scrollPositionRef.current = null;
        }
    });

    // Reset subcategory when main category changes
    const handleMainCategoryChange = (category: string) => {
        scrollPositionRef.current = window.scrollY;
        setActiveMainCategory(category);
        setActiveSubCategory('All Events');

        // Persist to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('timelineFilters', JSON.stringify({
                mainCategory: category,
                subCategory: 'All Events',
                timestamp: Date.now()
            }));
        }
    };

    // Handle subcategory change
    const handleSubCategoryChange = (subCat: string) => {
        scrollPositionRef.current = window.scrollY;
        setActiveSubCategory(subCat);

        // Persist to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('timelineFilters', JSON.stringify({
                mainCategory: activeMainCategory,
                subCategory: subCat,
                timestamp: Date.now()
            }));
        }
    };

    // Handle year filter click
    const handleYearClick = (year: string | null) => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        scrollPositionRef.current = window.scrollY;
        setActiveYear(year);
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

    // Get available subcategories for the active main category
    const availableSubCategories = useMemo(() => {
        if (!timelineData[activeMainCategory]) return ['All Events'];

        const categoryData = timelineData[activeMainCategory];
        const orderedSubs = orderedSubCategories[activeMainCategory] || [];

        return ['All Events', ...orderedSubs.filter(subCat =>
            categoryData.subCategories[subCat] &&
            categoryData.subCategories[subCat].length > 0
        )];
    }, [timelineData, activeMainCategory, orderedSubCategories]);

    return {
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
    };
};

// src/components/career/TimelineFilters.tsx
'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react';

interface TimelineFiltersProps {
    isFilterOpen: boolean;
    setIsFilterOpen: (isOpen: boolean) => void;
    searchQuery: string;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    clearSearch: () => void;
    availableYears: number[];
    activeYear: string | null;
    handleYearClick: (year: string | null) => (e: React.MouseEvent) => void;
    availableCategories: string[];
    activeMainCategory: string;
    handleMainCategoryClick: (category: string) => (e: React.MouseEvent) => void;
    getCategoryCount: (category: string) => number;
    availableSubCategories: string[];
    activeSubCategory: string;
    handleSubCategoryClick: (subCat: string) => (e: React.MouseEvent) => void;
    getSubCategoryCount: (mainCategory: string, subCategory: string) => number;
    totalEventCount: number;
    filteredEventCount: number;
    debouncedSearchQuery: string;
}

const TimelineFilters: React.FC<TimelineFiltersProps> = ({
    isFilterOpen,
    setIsFilterOpen,
    searchQuery,
    handleSearchChange,
    clearSearch,
    availableYears,
    activeYear,
    handleYearClick,
    availableCategories,
    activeMainCategory,
    handleMainCategoryClick,
    getCategoryCount,
    availableSubCategories,
    activeSubCategory,
    handleSubCategoryClick,
    getSubCategoryCount,
    totalEventCount,
    filteredEventCount,
    debouncedSearchQuery
}) => {
    return (
        <>
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
                        <span>Showing: <strong className="text-gray-900 dark:text-white">{filteredEventCount} events</strong></span>
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
        </>
    );
};

export default TimelineFilters;

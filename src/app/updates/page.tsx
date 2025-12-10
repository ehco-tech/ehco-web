'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Loader2, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import UpdateCard from '@/components/UpdateCard';

// Types
type VerificationStatus = 'all' | '✓ Verified' | '? Reviewed' | '! Disputed';

// Interface matching the API response from /api/updates
interface UpdateDocument {
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

interface Update {
    id: string;
    figureId: string;
    figureName: string;
    figureInitials: string;
    figureProfilePic?: string;
    eventTitle: string;
    eventSummary: string;
    eventPointDescription: string;
    eventPointSourceIds: string[];
    lastUpdated: number;
    verificationStatus: '✓ Verified' | '? Reviewed' | '! Disputed';
    mainCategory: string;
    subcategory?: string;
    industry: string[];
    sourceLink?: string;
    color?: string;
}

export default function UpdatesPage() {
    // State
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Filters
    const [verificationFilter, setVerificationFilter] = useState<VerificationStatus>('all');
    const [categoryFilter, setCategoryFilter] = useState('All Categories');
    const [timeFilter, setTimeFilter] = useState('All Time');

    // Load more
    const [loadingMore, setLoadingMore] = useState(false);  // Loading state for pagination
    const [hasMore, setHasMore] = useState(true);           // Whether more items exist
    const [currentPage, setCurrentPage] = useState(1);      // Current page number
    const [lastTimestamp, setLastTimestamp] = useState<number | null>(null);

    const ITEMS_PER_PAGE = 20;  // Items per page constant

    // Helper function to transform updates
    const transformUpdate = (update: UpdateDocument): Update => ({
        id: update.id,
        figureId: update.figureId,
        figureName: update.figureName || 'Unknown',
        figureInitials: getInitials(update.figureName),
        figureProfilePic: update.figureProfilePic,
        eventTitle: update.eventTitle || 'Update',
        eventSummary: update.eventSummary || 'No description available',
        eventPointDescription: update.eventPointDescription || 'No description available',
        lastUpdated: update.lastUpdated,
        verificationStatus: '✓ Verified',
        mainCategory: update.mainCategory || 'General',
        subcategory: update.subcategory,
        industry: [],
        eventPointSourceIds: update.eventPointSourceIds,
        color: getColorForCategory(update.mainCategory)
    });

    // Fetch updates
    useEffect(() => {
        const fetchUpdates = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/updates?limit=${ITEMS_PER_PAGE}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch updates');
                }

                const data = await response.json();
                // console.log('Initial fetch data:', data); // Debug log

                const formattedUpdates: Update[] = data.updates.map(transformUpdate);

                setUpdates(formattedUpdates);
                setHasMore(data.hasMore || false);

                // Set the last timestamp for cursor-based pagination
                if (formattedUpdates.length > 0) {
                    setLastTimestamp(formattedUpdates[formattedUpdates.length - 1].lastUpdated);
                }
            } catch (err) {
                console.error('Error fetching updates:', err);
                setError('Failed to load updates');
            } finally {
                setLoading(false);
            }
        };

        fetchUpdates();
    }, []);

    // Load more function
    const loadMoreUpdates = async () => {
        if (loadingMore || !hasMore || !lastTimestamp) {
            // console.log('Skipping load more:', { loadingMore, hasMore, lastTimestamp }); // Debug
            return;
        }

        try {
            setLoadingMore(true);

            // console.log('Loading more with timestamp:', lastTimestamp); // Debug

            // Use lastTimestamp as cursor for pagination
            const response = await fetch(
                `/api/updates?limit=${ITEMS_PER_PAGE}&before=${lastTimestamp}`
            );

            if (!response.ok) {
                throw new Error('Failed to load more updates');
            }

            const data = await response.json();
            // console.log('Load more data:', data); // Debug log

            const newUpdates: Update[] = data.updates.map(transformUpdate);

            // console.log('Transformed updates:', {
            //     count: newUpdates.length,
            //     ids: newUpdates.map(u => u.id)
            // }); // Debug

            // Filter out any duplicates based on ID
            const existingIds = new Set(updates.map(u => u.id));
            const uniqueNewUpdates = newUpdates.filter(u => !existingIds.has(u.id));

            // console.log('Unique updates:', {
            //     original: newUpdates.length,
            //     unique: uniqueNewUpdates.length,
            //     filtered: newUpdates.length - uniqueNewUpdates.length
            // }); // Debug

            if (uniqueNewUpdates.length > 0) {
                // Append new updates to existing ones
                setUpdates(prev => {
                    const updated = [...prev, ...uniqueNewUpdates];
                    // console.log('Total updates after append:', updated.length); // Debug
                    return updated;
                });

                // Update last timestamp
                const newLastTimestamp = uniqueNewUpdates[uniqueNewUpdates.length - 1].lastUpdated;
                // console.log('Updating last timestamp:', { old: lastTimestamp, new: newLastTimestamp }); // Debug
                setLastTimestamp(newLastTimestamp);

                // Use hasMore from API response
                setHasMore(data.hasMore || false);
                // console.log('Has more from API:', data.hasMore); // Debug
            } else {
                // No new unique updates, we've reached the end
                // console.log('No unique updates, ending pagination'); // Debug
                setHasMore(false);
            }
        } catch (err) {
            console.error('Error loading more updates:', err);
            // Don't show error, just stop loading
            setHasMore(false);
        } finally {
            setLoadingMore(false);
        }
    };


    // Helper functions
    const getInitials = (name: string | undefined): string => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const getColorForCategory = (category: string): string => {
        const colors: { [key: string]: string } = {
            'Career': '#d10041',
            'Music': '#ec4899',
            'Contract': '#f97316',
            'Tour': '#a855f7',
            'Collaboration': '#3b82f6',
            'Personal': '#10b981'
        };
        return colors[category] || '#d10041';
    };

    const formatTimeAgo = (timestamp: Timestamp | Date | string | number): string => {
        let date: Date;

        if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
            date = new Date(timestamp.toMillis());
        } else if (typeof timestamp === 'string') {
            date = new Date(timestamp);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return 'recently';
        }

        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffWeeks = Math.floor(diffDays / 7);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (diffSecs < 10) return 'a few moments ago';
        if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
        if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
        return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
    };

    // Filter updates
    const filteredUpdates = updates.filter((update) => {
        if (verificationFilter !== 'all' && update.verificationStatus !== verificationFilter) {
            return false;
        }

        if (categoryFilter !== 'All Categories' && update.mainCategory !== categoryFilter) {
            return false;
        }

        const updateTime = new Date(update.lastUpdated).getTime();
        const now = new Date().getTime();
        const timeDiff = now - updateTime;

        switch (timeFilter) {
            case 'Last 24 Hours':
                if (timeDiff > 24 * 60 * 60 * 1000) return false;
                break;
            case 'Last 7 Days':
                if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
                break;
            case 'Last 30 Days':
                if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
                break;
            case 'All Time':
                break;
        }

        return true;
    });

    // Get unique categories and industries
    const categories = ['All Categories', ...new Set(updates.map(u => u.mainCategory))];

    // Count active filters
    const activeFiltersCount =
        (verificationFilter !== 'all' ? 1 : 0) +
        (categoryFilter !== 'All Categories' ? 1 : 0) +
        (timeFilter !== 'All Time' ? 1 : 0);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black">
            {/* Hero Section */}
            <section className="pt-20 pb-10 text-center">
                <div className="max-w-4xl mx-auto px-4">
                    <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">All Updates</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                        Real-time verified information across all public figures
                    </p>
                    {/* Live Feed Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-pink-50 dark:bg-pink-900/20 rounded-full mb-6">
                        <div className="relative">
                            {/* Pulsating outer ring */}
                            <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                            {/* Static red dot */}
                            <div className="relative w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">Live Feed</span>
                    </div>
                </div>
            </section>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Collapsible Filters */}
                <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8 overflow-hidden">
                    {/* Filter Header - Always Visible */}
                    <button
                        onClick={() => setFiltersOpen(!filtersOpen)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Filter className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Filters</h2>
                            {activeFiltersCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold bg-key-color text-white rounded-full">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {activeFiltersCount > 0 && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                                    {activeFiltersCount} active
                                </span>
                            )}
                            {filtersOpen ? (
                                <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            )}
                        </div>
                    </button>

                    {/* Filter Content - Collapsible */}
                    <div
                        className={`transition-all duration-300 ease-in-out ${filtersOpen
                            ? 'max-h-[800px] opacity-100'
                            : 'max-h-0 opacity-0 overflow-hidden'
                            }`}
                    >
                        <div className="px-6 pb-6 border-t border-gray-200 dark:border-gray-800">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                                {/* Verification Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                        Verification Status
                                    </label>
                                    <div className="space-y-2">
                                        {(['all', '✓ Verified', '? Reviewed', '! Disputed'] as const).map((status) => (
                                            <label key={status} className="flex items-center cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="verification"
                                                    value={status}
                                                    checked={verificationFilter === status}
                                                    onChange={(e) => setVerificationFilter(e.target.value as VerificationStatus)}
                                                    className="w-4 h-4 text-key-color border-gray-300 focus:ring-key-color cursor-pointer"
                                                />
                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                                                    {status === 'all' ? 'All' : status}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                        Category
                                    </label>
                                    <select
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="w-full md:w-[80%] px-3 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent bg-white dark:bg-[#1d1d1f] dark:text-white appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 0.5rem center',
                                            backgroundSize: '1.5em 1.5em'
                                        }}
                                    >
                                        {categories.map((category) => (
                                            <option key={category} value={category}>
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Time Range */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                                        Time Range
                                    </label>
                                    <select
                                        value={timeFilter}
                                        onChange={(e) => setTimeFilter(e.target.value)}
                                        className="w-full md:w-[80%] px-3 py-2.5 pr-10 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent bg-white dark:bg-[#1d1d1f] dark:text-white appearance-none cursor-pointer"
                                        style={{
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 0.5rem center',
                                            backgroundSize: '1.5em 1.5em'
                                        }}
                                    >
                                        <option>Last 24 Hours</option>
                                        <option>Last 7 Days</option>
                                        <option>Last 30 Days</option>
                                        <option>All Time</option>
                                    </select>
                                </div>
                            </div>

                            {/* Clear All Filters Button */}
                            {activeFiltersCount > 0 && (
                                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                                    <button
                                        onClick={() => {
                                            setVerificationFilter('all');
                                            setCategoryFilter('All Categories');
                                            setTimeFilter('Last 24 Hours');
                                        }}
                                        className="text-sm font-medium text-key-color hover:text-red-700 transition-colors"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Updates List */}
                <div className="space-y-5">
                    {loading ? (
                        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-16 text-center">
                            <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4 text-key-color" />
                            <p className="text-gray-500 dark:text-gray-400">Loading updates...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-16 text-center">
                            <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-key-color text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredUpdates.length > 0 ? (
                        filteredUpdates.map((update) => (
                            <UpdateCard key={update.id} update={update} formatTimeAgo={formatTimeAgo} />
                        ))
                    ) : (
                        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-16 text-center">
                            <div className="text-gray-400 mb-3">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No updates found</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters to see more results</p>
                        </div>
                    )}
                </div>

                {/* Load More Button */}
                {!loading && !error && filteredUpdates.length > 0 && hasMore && (
                    <div className="mt-10 text-center">
                        <button
                            onClick={loadMoreUpdates}
                            disabled={loadingMore}
                            className="px-8 py-3 bg-white dark:bg-[#1d1d1f] border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-semibold hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                'Load More Updates'
                            )}
                        </button>
                    </div>
                )}

                {/* End of results message */}
                {!loading && !error && filteredUpdates.length > 0 && !hasMore && (
                    <div className="mt-10 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">You&apos;ve reached the end of the updates</p>
                    </div>
                )}
            </main>
        </div>
    );
}
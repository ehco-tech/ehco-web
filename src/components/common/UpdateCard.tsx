// Alternative UpdateCard Component using existing /api/articles/batch endpoint
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, ExternalLink, Calendar, Loader2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { createUrlSlug } from '@/lib/utils/slugify';

interface Article {
    id: string;
    subTitle: string;
    body: string;
    source: string;
    link: string;
    imageUrls: string[];
    imageCaptions: string[];
    sendDate: string;
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

interface UpdateCardProps {
    update: Update;
    formatTimeAgo: (timestamp: Timestamp | Date | string | number) => string;
}

// Slugify function for creating URL-friendly hash anchors
const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w-]+/g, ''); // Remove all non-word chars

export default function UpdateCardBatch({ update, formatTimeAgo }: UpdateCardProps) {
    const [showSources, setShowSources] = useState(false);
    const [sources, setSources] = useState<Article[]>([]);
    const [loadingSources, setLoadingSources] = useState(false);
    const [sourcesError, setSourcesError] = useState<string | null>(null);
    const [imageError, setImageError] = useState(false);

    const getVerificationBadge = (status: string) => {
        switch (status) {
            case '✓ Verified':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        ✓ Verified
                    </span>
                );
            case '? Reviewed':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                        ? Reviewed
                    </span>
                );
            case '! Disputed':
                return (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                        ! Disputed
                    </span>
                );
            default:
                return null;
        }
    };

    const handleViewSources = async () => {
        if (!showSources && sources.length === 0 && update.eventPointSourceIds.length > 0) {
            // Fetch sources using the batch API
            setLoadingSources(true);
            setSourcesError(null);

            try {
                const response = await fetch('/api/articles/batch', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        articleIds: update.eventPointSourceIds,
                        figureId: update.id, // Optional: for monitoring
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to fetch sources');
                }

                const articles = await response.json();
                // console.log(articles);
                setSources(articles || []);

                if (!articles || articles.length === 0) {
                    setSourcesError('No sources found');
                }
            } catch (error) {
                console.error('Error fetching sources:', error);
                setSourcesError(error instanceof Error ? error.message : 'Failed to load sources');
            } finally {
                setLoadingSources(false);
            }
        }

        setShowSources(!showSources);
    };

    const truncateText = (text: string, maxLength: number = 150) => {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';

        try {
            // Check if it's already a valid date format (contains separators)
            if (dateString.includes('-') || dateString.includes('/')) {
                const date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            }

            // Handle YYYY, YYYYMM, YYYYMMDD formats (strings with only digits)
            const cleanString = dateString.replace(/\D/g, ''); // Remove non-digits

            if (cleanString.length === 4) {
                // YYYY format - just year
                return cleanString;
            } else if (cleanString.length === 6) {
                // YYYYMM format
                const year = cleanString.substring(0, 4);
                const month = cleanString.substring(4, 6);
                const date = new Date(`${year}-${month}-01`);

                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short'
                    });
                }
                return `${year}-${month}`;
            } else if (cleanString.length === 8) {
                // YYYYMMDD format (e.g., "20251105")
                const year = cleanString.substring(0, 4);
                const month = cleanString.substring(4, 6);
                const day = cleanString.substring(6, 8);
                const date = new Date(`${year}-${month}-${day}`);

                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
                return `${year}-${month}-${day}`;
            }

            // Fallback: return original string
            return dateString;
        } catch {
            return dateString;
        }
    };

    return (
        <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            {update.figureProfilePic && !imageError ? (
                                <Link href={`/${createUrlSlug(update.figureName)}`}>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        <Image
                                            src={update.figureProfilePic}
                                            alt={update.figureName}
                                            width={48}
                                            height={48}
                                            className="object-cover w-full h-full"
                                            onError={() => setImageError(true)}
                                        />
                                    </div>
                                </Link>
                            ) : update.figureProfilePic && imageError ? (
                                <Link href={`/${createUrlSlug(update.figureName)}`}>
                                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                                        <Image
                                            src="/images/default-profile.png"
                                            alt={update.figureName}
                                            width={48}
                                            height={48}
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                </Link>
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-lg">
                                    {update.figureInitials}
                                </div>
                            )}
                        </div>

                        {/* Figure Info */}
                        <div className="flex-1">
                            <Link href={`/${createUrlSlug(update.figureName)}`}>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{update.figureName}</h3>
                            </Link>
                            <div className="flex items-center flex-wrap gap-2 mt-2">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatTimeAgo(update.lastUpdated)}
                                </span>
                                {getVerificationBadge(update.verificationStatus)}
                                {update.subcategory && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                        {update.subcategory}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Update Content - Clickable */}
                <Link
                    href={`/${update.figureId}?event=${slugify(update.eventTitle)}&modal=true#${slugify(update.eventTitle)}`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer mt-2"
                >
                    {/* Update Title */}
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                        {update.eventTitle}
                    </h4>

                    {/* Update Description */}
                    <p className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                        {update.eventPointDescription}
                    </p>
                </Link>
            </div>

            {/* Footer with Source Button */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#2c2c2e]">
                {update.eventPointSourceIds && update.eventPointSourceIds.length > 0 && (
                    <button
                        onClick={handleViewSources}
                        className="flex items-center gap-2 text-sm font-medium text-key-color hover:text-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-key-color focus:ring-offset-2 rounded"
                    >
                        <span>
                            View {update.eventPointSourceIds.length} Source
                            {update.eventPointSourceIds.length > 1 ? 's' : ''}
                        </span>
                        {showSources ? (
                            <ChevronUp className="w-4 h-4" />
                        ) : (
                            <ChevronDown className="w-4 h-4" />
                        )}
                    </button>
                )}
            </div>

            {/* Sources Dropdown */}
            {showSources && (
                <div className="border-t border-gray-200 dark:border-gray-800 dark:border-t-gray-700">
                    <div className="px-6 py-4 bg-gray-50 dark:bg-[#2c2c2e]">
                        {loadingSources ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="animate-spin w-6 h-6 text-key-color" />
                                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading sources...</span>
                            </div>
                        ) : sourcesError ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-red-600 dark:text-red-400">{sourcesError}</p>
                                <button
                                    onClick={() => {
                                        setSources([]);
                                        setSourcesError(null);
                                        handleViewSources();
                                    }}
                                    className="mt-2 text-sm text-key-color hover:text-red-700 font-medium"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : sources.length === 0 ? (
                            <div className="text-center py-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">No sources available</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sources.map((source, index) => (
                                    <div
                                        key={source.id}
                                        className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
                                    >
                                        <div className="flex gap-4">
                                            {/* Source Image */}
                                            {source.imageUrls && source.imageUrls.length > 0 && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                                                        <Image
                                                            src={source.imageUrls[0]}
                                                            alt={source.imageCaptions?.[0] || source.subTitle || 'Article image'}
                                                            width={96}
                                                            height={96}
                                                            unoptimized
                                                            className="object-cover w-full h-full"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Source Content */}
                                            <div className="flex-1 min-w-0">
                                                {/* Source Number Badge */}
                                                <span className="inline-block px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded mb-2">
                                                    Source {index + 1}
                                                </span>

                                                {/* Source Title */}
                                                {source.subTitle && (
                                                    <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                                                        {source.subTitle}
                                                    </h5>
                                                )}

                                                {/* Source Body Preview */}
                                                {source.body && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                                                        {truncateText(source.body)}
                                                    </p>
                                                )}

                                                {/* Source Metadata */}
                                                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                                                    {source.source && (
                                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                                            {source.source}
                                                        </span>
                                                    )}
                                                    {source.sendDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {formatDate(source.sendDate)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Source Link */}
                                                {source.link && (
                                                    <a
                                                        href={source.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-sm font-medium text-key-color hover:text-red-700 hover:underline transition-colors"
                                                    >
                                                        Read Full Article
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Image Caption */}
                                        {source.imageUrls &&
                                            source.imageUrls.length > 0 &&
                                            source.imageCaptions &&
                                            source.imageCaptions.length > 0 &&
                                            source.imageCaptions[0] && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2 pl-0 sm:pl-28">
                                                    {source.imageCaptions[0]}
                                                </p>
                                            )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
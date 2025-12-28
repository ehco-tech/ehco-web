'use client';

import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Calendar } from 'lucide-react';
import { CuratedEvent, Article, TimelinePoint } from '@/types/definitions';
import HighlightedText from './HighlightedText';

interface EventModalProps {
    event: CuratedEvent;
    articles: Article[];
    isOpen: boolean;
    onClose: () => void;
    onViewInTimeline: () => void;
    figureName: string;
    mainCategory: string;
    subCategory: string;
}

// --- HELPER FUNCTIONS ---
const formatTimelineDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parts.length > 1 ? parseInt(parts[1]) - 1 : 0;
    const day = parts.length > 2 ? parseInt(parts[2]) : 1;
    const date = new Date(Date.UTC(year, month, day));
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', timeZone: 'UTC' };
    if (parts.length > 1) options.month = 'long';
    if (parts.length > 2) options.day = 'numeric';
    return date.toLocaleDateString('en-US', options);
};

const formatArticleDate = (dateString: string | undefined): string => {
    if (!dateString || dateString.length !== 8) return dateString || '';
    try {
        const year = parseInt(dateString.substring(0, 4));
        const month = parseInt(dateString.substring(4, 6)) - 1;
        const day = parseInt(dateString.substring(6, 8));
        const date = new Date(Date.UTC(year, month, day));
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        });
    } catch {
        return dateString || '';
    }
};

const sortTimelinePoints = (points: TimelinePoint[]): TimelinePoint[] => {
    const parseDate = (dateStr: string) => ({
        year: parseInt(dateStr.split('-')[0]),
        month: dateStr.split('-').length > 1 ? parseInt(dateStr.split('-')[1]) : 1,
        day: dateStr.split('-').length > 2 ? parseInt(dateStr.split('-')[2]) : 1,
        specificity: dateStr.split('-').length
    });
    return [...points].sort((a, b) => {
        const aDateIsValid = a.date && typeof a.date === 'string';
        const bDateIsValid = b.date && typeof b.date === 'string';

        if (!aDateIsValid && !bDateIsValid) return 0;
        if (!aDateIsValid) return 1;
        if (!bDateIsValid) return -1;

        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        if (dateA.year !== dateB.year) return dateB.year - dateA.year;
        if (dateA.specificity === 1 && dateB.specificity > 1) return -1;
        if (dateB.specificity === 1 && dateA.specificity > 1) return 1;
        if (dateA.month !== dateB.month) return dateB.month - dateA.month;
        if (dateA.specificity !== dateB.specificity) return dateA.specificity - dateB.specificity;
        return dateB.day - dateA.day;
    });
};

const EventModal: React.FC<EventModalProps> = ({
    event,
    articles,
    isOpen,
    onClose,
    onViewInTimeline,
    figureName,
    mainCategory,
    subCategory
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [eventArticles, setEventArticles] = useState<Article[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);

    // Sort timeline points
    const sortedTimelinePoints = sortTimelinePoints(event.timeline_points || []);

    // Fetch event articles when modal opens
    useEffect(() => {
        if (!isOpen) return;

        const fetchEventArticles = async () => {
            // Get all unique article IDs from the event
            const eventArticleIds = new Set<string>();

            // Add from event sources
            event.sources?.forEach(source => {
                if (source.id) eventArticleIds.add(source.id);
            });

            // Add from timeline points
            event.timeline_points?.forEach(point => {
                point.sourceIds?.forEach(id => {
                    if (id) eventArticleIds.add(id);
                });
                point.sources?.forEach(source => {
                    if (source.id) eventArticleIds.add(source.id);
                });
            });

            const articleIdsArray = Array.from(eventArticleIds);

            // First, try to use articles from props
            const articlesMap = new Map(articles.map(article => [article.id, article]));
            const availableArticles = articleIdsArray
                .map(id => articlesMap.get(id))
                .filter(Boolean) as Article[];

            // If we have all articles, use them
            if (availableArticles.length === articleIdsArray.length) {
                const sorted = availableArticles.sort((a, b) => {
                    if (!a.sendDate) return 1;
                    if (!b.sendDate) return -1;
                    return b.sendDate.localeCompare(a.sendDate);
                });
                setEventArticles(sorted);
                return;
            }

            // Otherwise, fetch missing articles
            setIsLoadingSources(true);
            try {
                const response = await fetch('/api/articles/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ articleIds: articleIdsArray })
                });

                if (response.ok) {
                    const fetchedArticles = await response.json();
                    const sorted = fetchedArticles.sort((a: Article, b: Article) => {
                        if (!a.sendDate) return 1;
                        if (!b.sendDate) return -1;
                        return b.sendDate.localeCompare(a.sendDate);
                    });
                    setEventArticles(sorted);
                } else {
                    // Fallback to available articles
                    setEventArticles(availableArticles);
                }
            } catch (error) {
                console.error('Error fetching event articles:', error);
                // Fallback to available articles
                setEventArticles(availableArticles);
            } finally {
                setIsLoadingSources(false);
            }
        };

        fetchEventArticles();
    }, [isOpen, event, articles]);

    // Handle modal animations
    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        }
    }, [isOpen]);

    // Close on escape key and handle scroll locking
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);

            // Wait for auto-scroll to complete, then lock scroll
            setTimeout(() => {
                // Get scrollbar width to prevent layout shift
                const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

                // Lock scroll and compensate for scrollbar
                document.body.style.overflow = 'hidden';
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }, 400); // Wait for auto-scroll (300ms) + a bit extra
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);

            // Restore scroll
            document.body.style.overflow = 'unset';
            document.body.style.paddingRight = '0px';
        };
    }, [isOpen]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 200); // Wait for animation
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${
                isVisible ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
            }`}
            onClick={handleClose}
        >
            <div
                className={`relative w-full max-w-4xl max-h-[90vh] mx-4 bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 ${
                    isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-[#1d1d1f] border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-key-color/10 text-key-color dark:bg-key-color/20 dark:text-key-color">
                                    {mainCategory}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    {subCategory}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                {event.event_title}
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Latest update for {figureName}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="flex-shrink-0 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 py-6">
                    {/* Event Summary */}
                    {event.event_summary && (
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Summary</h3>
                            <p className="text-gray-900 dark:text-white leading-relaxed">
                                {event.event_summary}
                            </p>
                        </div>
                    )}

                    {/* Timeline Points */}
                    {sortedTimelinePoints.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Timeline</h3>
                            <div className="space-y-4">
                                {sortedTimelinePoints.map((point, index) => (
                                    <div key={index} className="flex gap-4">
                                        {/* Date */}
                                        <div className="flex-shrink-0 w-32">
                                            <div className="flex items-center gap-2 text-sm font-medium text-key-color dark:text-key-color">
                                                <Calendar className="w-4 h-4" />
                                                {formatTimelineDate(point.date)}
                                            </div>
                                        </div>
                                        {/* Description */}
                                        <div className="flex-1 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
                                            <p className="text-gray-900 dark:text-white leading-relaxed">
                                                <HighlightedText text={point.description} searchQuery="" />
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sources */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                            Sources {!isLoadingSources && eventArticles.length > 0 && `(${eventArticles.length})`}
                        </h3>
                        {isLoadingSources ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-key-color rounded-full animate-spin"></div>
                                    <span className="text-sm">Loading sources...</span>
                                </div>
                            </div>
                        ) : eventArticles.length > 0 ? (
                            <div className="space-y-3">
                                {eventArticles.map((article) => (
                                    <a
                                        key={article.id}
                                        href={article.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-key-color dark:hover:border-key-color hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                        {article.source}
                                                    </span>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                                        {formatArticleDate(article.sendDate)}
                                                    </span>
                                                </div>
                                                <h4 className="font-medium text-gray-900 dark:text-white mb-1 group-hover:text-key-color dark:group-hover:text-key-color transition-colors line-clamp-2">
                                                    {article.title}
                                                </h4>
                                                {article.subTitle && (
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                        {article.subTitle}
                                                    </p>
                                                )}
                                            </div>
                                            <ExternalLink className="w-4 h-4 flex-shrink-0 text-gray-400 group-hover:text-key-color dark:group-hover:text-key-color transition-colors" />
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                                No sources available for this event
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-[#1d1d1f] border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={handleClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={onViewInTimeline}
                            className="px-6 py-2 text-sm font-medium bg-key-color hover:bg-red-700 text-white rounded-full transition-colors"
                        >
                            View in Full Timeline
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventModal;

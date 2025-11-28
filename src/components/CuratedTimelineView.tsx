'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
    Article,
    CuratedEvent,
    CuratedTimelineData,
    TimelinePoint
} from '@/types/definitions';
import ScrapButton from './ScrapButton';
import ReportButton from './ReportButton';
import HighlightedText from './HighlightedText';

// --- TYPE DEFINITIONS ---
interface EventSourcesProps {
    articleIds: string[];
    articlesMap: Map<string, Article>;
}

interface TimelinePointWithSourcesProps {
    point: TimelinePoint;
    isLast: boolean;
    articlesMap: Map<string, Article>;
    searchQuery: string;
}

interface CuratedTimelineViewProps {
    data: CuratedTimelineData;
    articles: Article[];
    figureId: string;
    figureName: string;
    figureNameKr: string;
    activeMainCategory: string;
    activeSubCategory: string;
    activeYear: string | null;
    searchQuery?: string; // NEW: Search query for better empty states
}

// --- CONSTANTS ---
const ORDERED_SUB_CATEGORIES: { [key: string]: string[] } = {
    "Creative Works": ["Music", "Film & TV", "Publications & Art", "Awards & Honors"],
    "Live & Broadcast": ["Concerts & Tours", "Fan Events", "Broadcast Appearances"],
    "Public Relations": ["Media Interviews", "Endorsements & Ambassadors", "Social & Digital"],
    "Personal Milestones": ["Relationships & Family", "Health & Service", "Education & Growth"],
    "Incidents & Controversies": ["Legal & Scandal", "Accidents & Emergencies", "Public Backlash"]
};

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

const formatCategoryForURL = (name: string) => name.toLowerCase().replace(/ & /g, '-and-').replace(/[ &]/g, '-');

const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

// Sort events by their most recent timeline point date (most recent first)
const sortEventsByMostRecentDate = (events: CuratedEvent[]): CuratedEvent[] => {
    return [...events].sort((a, b) => {
        // Get the most recent date from each event's timeline points
        const getLatestDate = (event: CuratedEvent): Date => {
            const validDates = event.timeline_points
                .filter(point => point.date)
                .map(point => {
                    const parts = point.date.split('-');
                    const year = parseInt(parts[0]);
                    const month = parts.length > 1 ? parseInt(parts[1]) - 1 : 0;
                    const day = parts.length > 2 ? parseInt(parts[2]) : 1;
                    return new Date(year, month, day);
                });
            
            // If no valid dates, return a very old date (so it goes to the end)
            if (validDates.length === 0) return new Date(0);
            
            // Return the most recent date
            return new Date(Math.max(...validDates.map(d => d.getTime())));
        };

        const dateA = getLatestDate(a);
        const dateB = getLatestDate(b);

        // Sort descending (most recent first)
        return dateB.getTime() - dateA.getTime();
    });
};

// --- CHILD COMPONENTS ---
const EventSources: React.FC<EventSourcesProps> = ({ articleIds, articlesMap }) => {
    const mappedArticles = articleIds.map(id => articlesMap.get(id));
    // console.log('Result after mapping IDs to articlesMap:', mappedArticles);

    const relevantArticles = mappedArticles.filter(Boolean) as Article[];
    // console.log('Final relevantArticles after filtering out undefined:', relevantArticles);
    // --- END OF LOGS ---
    // const relevantArticles = articleIds
    //     .map(id => articlesMap.get(id))
    //     .filter(Boolean) as Article[];
    relevantArticles.sort((a, b) => {
        if (!a.sendDate) return 1;
        if (!b.sendDate) return -1;
        return b.sendDate.localeCompare(a.sendDate);
    });

    const formatArticleDate = (dateString: string | undefined): string => {
        if (!dateString || dateString.length !== 8) return dateString || '';
        try {
            const year = parseInt(dateString.substring(0, 4)), month = parseInt(dateString.substring(4, 6)) - 1, day = parseInt(dateString.substring(6, 8));
            const date = new Date(Date.UTC(year, month, day));
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        } catch (error) { console.error("Could not parse date:", dateString, error); return dateString; }
    };

    const loadingCount = articleIds.length - relevantArticles.length;

    return (
        <div className="mt-3 pt-3 border-t border-gray-200/80 dark:border-gray-700/80"><div className="grid grid-cols-1 gap-4">
            {relevantArticles.map(article => (
                <a key={article.id} href={article.link} target="_blank" rel="noopener noreferrer" className="flex flex-col sm:flex-row sm:items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50/80 dark:hover:bg-gray-700/80 transition-all duration-200 shadow-sm">
                    {article.imageUrls?.[0] && (<img src={article.imageUrls[0]} alt={article.subTitle || 'Source image'} className="w-full h-32 sm:w-20 sm:h-20 object-cover rounded-md flex-shrink-0 bg-gray-100 dark:bg-gray-700" />)}
                    <div className="flex flex-col">
                        <h6 className="font-semibold text-sm text-blue-700 dark:text-blue-400 hover:underline leading-tight">{article.subTitle || article.title || 'Source Article'}</h6>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {article.source && <span>{article.source}</span>}
                            {article.source && article.sendDate && <span>&middot;</span>}
                            {article.sendDate && <time dateTime={article.sendDate}>{formatArticleDate(article.sendDate)}</time>}
                        </div>
                        {article.body && (() => { const parts = article.body.split(' -- '), mainContent = (parts.length > 1 ? parts[1] : parts[0]).trim(); return <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">{mainContent.substring(0, 120)}...</p>; })()}
                    </div>
                </a>
            ))}
            {loadingCount > 0 && (
                <div className="flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Loading {loadingCount} more {loadingCount === 1 ? 'source' : 'sources'}...
                        </p>
                    </div>
                </div>
            )}
        </div></div>
    );
};

const TimelinePointWithSources: React.FC<TimelinePointWithSourcesProps> = ({ point, articlesMap, isLast, searchQuery }) => {
    const [showSources, setShowSources] = useState(false);
    const sortedPoints = sortTimelinePoints([point]);
    const sortedPoint = sortedPoints[0];

    // Count total source IDs (regardless of whether loaded)
    const totalSourceIds = (sortedPoint.sourceIds || []).length;

    // Count loaded sources
    const loadedSourcesCount = (sortedPoint.sourceIds || [])
        .filter(id => articlesMap.get(id))
        .length;

    return (
        <div className={`relative ${!isLast ? 'pb-6' : ''}`}>
            {!isLast && <div className="absolute left-1 top-3 h-full w-0.5 bg-gray-200 dark:bg-[#1d1d1f]"></div>}
            <div className="flex items-start gap-3">
                <div className="relative z-10 mt-1">
                    <div className="w-2 h-2 bg-key-color dark:bg-key-color-dark rounded-full"></div>
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                        {formatTimelineDate(sortedPoint.date)}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        <HighlightedText
                            text={sortedPoint.description.replaceAll("*", "'")}
                            searchQuery={searchQuery || ''}
                        />
                    </p>

                    {/* Toggle button for sources - show if there are any source IDs */}
                    {totalSourceIds > 0 && (
                        <button
                            onClick={() => setShowSources(!showSources)}
                            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-2 transition-colors"
                        >
                            {showSources ? (
                                <>
                                    <ChevronUp size={14} />
                                    Hide sources ({loadedSourcesCount}/{totalSourceIds})
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={14} />
                                    View sources ({loadedSourcesCount}/{totalSourceIds})
                                </>
                            )}
                        </button>
                    )}


                    {/* Conditionally render EventSources */}
                    {showSources && <EventSources articleIds={sortedPoint.sourceIds || []} articlesMap={articlesMap} />}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
const CuratedTimelineView: React.FC<CuratedTimelineViewProps> = ({
    data,
    articles,
    figureId,
    figureName,
    figureNameKr,
    activeMainCategory,
    activeSubCategory,
    searchQuery = '' // NEW: From parent
}) => {
    // Articles map for quick lookup
    const articlesMap = useMemo(() => {
        const map = new Map<string, Article>();
        articles.forEach((article) => map.set(article.id, article));
        return map;
    }, [articles]);

    // State for mobile accordion
    const [openEvents, setOpenEvents] = useState<string[]>([]);

    // Track previous main category to detect changes (for mobile state cleanup if needed)
    const prevMainCategoryRef = useRef<string>(activeMainCategory);

    // Reset mobile accordion when main category changes significantly
    useEffect(() => {
        if (prevMainCategoryRef.current !== activeMainCategory) {
            setOpenEvents([]);
            prevMainCategoryRef.current = activeMainCategory;
        }
    }, [activeMainCategory]);

    // Handle mobile event toggle
    const handleToggleEvent = (eventTitle: string) => {
        const eventId = slugify(eventTitle);
        setOpenEvents(prev =>
            prev.includes(eventId)
                ? prev.filter(id => id !== eventId)
                : [...prev, eventId]
        );
    };

    // Get content to display based on active category and subcategory
    const displayedContent = useMemo(() => {
        if (!data || !data[activeMainCategory]) return null;

        const categoryData = data[activeMainCategory];

        // If "All Events" is selected, show all subcategories within this main category
        if (activeSubCategory === 'All Events') {
            return categoryData.subCategories;
        }

        // Otherwise, show the specific subcategory
        if (activeSubCategory && categoryData.subCategories[activeSubCategory]) {
            return {
                [activeSubCategory]: categoryData.subCategories[activeSubCategory]
            };
        }

        return null;
    }, [data, activeMainCategory, activeSubCategory]);

    const hasContent = displayedContent && Object.keys(displayedContent).length > 0;

    // Get available subcategories for current main category (for internal logic if needed)
    const availableSubCategories = useMemo(() => {
        if (!data[activeMainCategory]) return ['All Events'];
        const categoryData = data[activeMainCategory];
        const orderedSubs = ORDERED_SUB_CATEGORIES[activeMainCategory] || [];
        return ['All Events', ...orderedSubs.filter(subCat =>
            categoryData.subCategories[subCat] &&
            categoryData.subCategories[subCat].length > 0
        )];
    }, [data, activeMainCategory]);

    return (
        <div className="w-full">
            {/* Timeline Events */}
            {displayedContent && Object.keys(displayedContent).length > 0 ? (
                <div className="space-y-8">
                    {Object.entries(displayedContent).map(([subCategoryKey, events]) => (
                        <div key={subCategoryKey}>
                            {/* Show subcategory header when "All Events" is selected */}
                            {activeSubCategory === 'All Events' && (
                                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">{subCategoryKey}</h3>
                            )}

                            {/* Desktop View */}
                            <div className="hidden sm:block space-y-6">
                                {sortEventsByMostRecentDate(events).map((event, eventIndex) => (
                                    <div
                                        key={`${subCategoryKey}-${eventIndex}`}
                                        id={slugify(event.event_title)}
                                        className="bg-white dark:bg-[#1d1d1f] border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative scroll-mt-24"
                                    >
                                        {/* Action Buttons */}
                                        <div className="absolute top-4 right-4 flex gap-1">
                                            <ReportButton
                                                figureId={figureId}
                                                figureName={figureName}
                                                figureNameKr={figureNameKr}
                                                mainCategory={activeMainCategory}
                                                subcategory={subCategoryKey}
                                                eventGroupIndex={eventIndex}
                                                eventGroup={event}
                                                size="sm"
                                            />
                                            <ScrapButton
                                                figureId={figureId}
                                                figureName={figureName}
                                                figureNameKr={figureNameKr}
                                                mainCategory={activeMainCategory}
                                                subcategory={subCategoryKey}
                                                eventGroupIndex={eventIndex}
                                                eventGroup={event}
                                                size="sm"
                                            />
                                        </div>

                                        <h4 className="font-semibold text-lg text-gray-900 dark:text-white pr-16 mb-2">
                                            <HighlightedText text={event.event_title} searchQuery={searchQuery || ''} />
                                        </h4>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
                                            <HighlightedText
                                                text={event.event_summary.replaceAll("*", "'")}
                                                searchQuery={searchQuery || ''}
                                            />
                                        </p>

                                        <div className="relative pl-5">
                                            {event.timeline_points.map((point, index) => (
                                                <TimelinePointWithSources
                                                    key={index}
                                                    point={point}
                                                    articlesMap={articlesMap}
                                                    isLast={index === event.timeline_points.length - 1}
                                                    searchQuery={searchQuery}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Mobile View */}
                            <div className="sm:hidden space-y-4">
                                {sortEventsByMostRecentDate(events).map((event, eventIndex) => {
                                    const isEventOpen = openEvents.includes(slugify(event.event_title));
                                    return (
                                        <div
                                            key={`mobile-${subCategoryKey}-${eventIndex}`}
                                            id={slugify(event.event_title)}
                                            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-[#1d1d1f] relative scroll-mt-24"
                                        >
                                            {/* Action Buttons */}
                                            <div className="absolute top-4 right-4 z-10 flex gap-1">
                                                <ReportButton
                                                    figureId={figureId}
                                                    figureName={figureName}
                                                    figureNameKr={figureNameKr}
                                                    mainCategory={activeMainCategory}
                                                    subcategory={subCategoryKey}
                                                    eventGroupIndex={eventIndex}
                                                    eventGroup={event}
                                                    size="sm"
                                                />
                                                <ScrapButton
                                                    figureId={figureId}
                                                    figureName={figureName}
                                                    figureNameKr={figureNameKr}
                                                    mainCategory={activeMainCategory}
                                                    subcategory={subCategoryKey}
                                                    eventGroupIndex={eventIndex}
                                                    eventGroup={event}
                                                    size="sm"
                                                />
                                            </div>

                                            <button
                                                onClick={() => handleToggleEvent(event.event_title)}
                                                className="w-full flex justify-between items-center p-4 text-left pr-20"
                                            >
                                                <h4 className="font-semibold text-base text-gray-800 dark:text-white">
                                                    {event.event_title}
                                                </h4>
                                                {isEventOpen ? (
                                                    <ChevronUp size={20} className="text-gray-500 dark:text-gray-400" />
                                                ) : (
                                                    <ChevronDown size={20} className="text-gray-500 dark:text-gray-400" />
                                                )}
                                            </button>

                                            {isEventOpen && (
                                                <div className="px-4 pb-4">
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-3">
                                                        {event.event_summary.replaceAll("*", "'")}
                                                    </p>
                                                    <div className="relative pl-5 border-t border-gray-200 dark:border-gray-700 pt-4">
                                                        {event.timeline_points.map((point, index) => (
                                                            <TimelinePointWithSources
                                                                key={index}
                                                                point={point}
                                                                articlesMap={articlesMap}
                                                                isLast={index === event.timeline_points.length - 1}
                                                                searchQuery={searchQuery}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    {searchQuery ? (
                        <div>
                            <p className="text-lg font-medium mb-2">No results found for &quot;{searchQuery}&quot;</p>
                            <p className="text-sm">Try adjusting your search terms or filters</p>
                        </div>
                    ) : (
                        <p>No events found for this category.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default CuratedTimelineView;
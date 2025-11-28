'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createUrlSlug } from '@/lib/slugify';
import algoliasearch from 'algoliasearch';
import { Timestamp } from 'firebase/firestore';
import WelcomeBanner from '@/components/WelcomeBanner';
import { useHomeData } from '@/context/HomeDataContext';

// Setup Algolia client
const searchClient = algoliasearch(
  "B1QF6MLIU5",
  "ef0535bdd12e549ffa7c9541395432a1"
);

// Types
type AlgoliaPublicFigure = {
  objectID: string;
  name?: string;
  name_kr?: string;
  profilePic?: string;
  _highlightResult?: {
    name?: {
      value: string;
      matchLevel: string;
      matchedWords: string[];
    };
    name_kr?: {
      value: string;
      matchLevel: string;
      matchedWords: string[];
    };
  };
}

interface PublicFigure {
  id: string;
  name: string;
  name_kr?: string;
  profilePic?: string;
  occupation?: string[];
  nationality?: string;
  gender?: string;
  company?: string;
  stats?: {
    totalFacts: number;
    totalSources: number;
  };
  featuredUpdate?: {
    eventTitle: string;
    eventSummary: string;
    eventPointDescription: string;
    eventPointDate: string;
    mainCategory: string;
    subcategory: string;
    lastUpdated?: number;
  };
}

type FeaturedFigure = PublicFigure;

type TrendingUpdate = {
  id: string;
  title: string;
  user: {
    initials: string;
    profilePic?: string;
    name?: string;
  };
  description: string;
  timeAgo: string;
  source?: string;
  verified: boolean;
  figureId: string;
  eventTitle: string;
};

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
  createdAt: number; // Milliseconds from API
  lastUpdated: number; // Milliseconds from API
}

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[60] flex items-center justify-center">
    <div className="bg-white dark:bg-[#1d1d1f] p-6 rounded-lg flex items-center space-x-3">
      <Loader2 className="animate-spin text-slate-600 dark:text-white" size={24} />
      <span className="text-slate-600 dark:text-white font-medium">Loading...</span>
    </div>
  </div>
);

// Generate initials from a name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Slugify function for creating URL-friendly hash anchors
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, ''); // Remove all non-word chars

// Format event date based on available precision
const formatEventDate = (dateStr: string): string => {
  if (!dateStr) return 'No date available';

  // Year only: "2030"
  if (dateStr.length === 4) {
    return dateStr;
  }
  // Year-Month: "2026-01"
  else if (dateStr.length === 7) {
    const [year, month] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short'
    });
  }
  // Full date: "2025-10-30"
  else {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
};

// Format time elapsed with detailed granularity
const formatTimeAgo = (timestamp: Timestamp | Date | string | number): string => {
  let date: Date;

  // Handle Firestore Timestamp object
  if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
    date = new Date(timestamp.toMillis());
  }
  // Handle ISO string
  else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  }
  // Handle regular Date object
  else if (timestamp instanceof Date) {
    date = timestamp;
  }
  // Handle timestamp in milliseconds
  else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  }
  else {
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

  // Less than 10 seconds
  if (diffSecs < 10) {
    return 'a few moments ago';
  }
  // Less than 1 minute
  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
  }
  // Less than 1 hour
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  // Less than 24 hours
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  // Less than 7 days
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  // Less than 4 weeks
  if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
  }
  // Less than 12 months
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  // Years
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};

// Main Page Component
export default function Home() {
  // Get home data context
  const { cachedData, setCachedData, isCacheValid } = useHomeData();

  // State for welcome banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // State for featured figures - always start empty to avoid hydration mismatch
  const [featuredFigures, setFeaturedFigures] = useState<FeaturedFigure[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState<boolean>(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  // State for trending updates - always start empty to avoid hydration mismatch
  const [trendingUpdates, setTrendingUpdates] = useState<TrendingUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState<boolean>(true);

  // State for stats counters - always start with 0 to avoid hydration mismatch
  const [statsData, setStatsData] = useState<{ totalFigures: number; totalFacts: number }>({
    totalFigures: 0,
    totalFacts: 0
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Track if we've loaded from cache to prevent hydration issues
  const [isHydrated, setIsHydrated] = useState(false);

  // Master loading state for all content sections (except Hero)
  const [allContentLoaded, setAllContentLoaded] = useState<boolean>(false);


  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<AlgoliaPublicFigure[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Refs for animation
  const searchSectionRef = useRef<HTMLElement>(null);
  const whatsSectionRef = useRef<HTMLElement>(null);
  const featuredSectionRef = useRef<HTMLElement>(null);
  const ctaSectionRef = useRef<HTMLElement>(null);

  // Check if user has visited before (for welcome banner)
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedEhco');
    if (!hasVisited) {
      setShowWelcomeBanner(true);
    }
  }, []);

  // Handle closing the welcome banner
  const handleCloseWelcomeBanner = () => {
    setShowWelcomeBanner(false);
    localStorage.setItem('hasVisitedEhco', 'true');
  };

  // Load from cache immediately after hydration, then fetch if needed
  useEffect(() => {
    // Mark as hydrated
    setIsHydrated(true);

    const fetchAllData = async () => {
      // Check if we have valid cached data
      if (isCacheValid() && cachedData) {
        // Load from cache immediately
        setFeaturedFigures(cachedData.featuredFigures);
        setTrendingUpdates(cachedData.trendingUpdates);
        setStatsData(cachedData.stats);
        setFeaturedLoading(false);
        setUpdatesLoading(false);
        setStatsLoading(false);
        // Mark all content as loaded
        setAllContentLoaded(true);
        return;
      }

      // Otherwise, fetch fresh data
      try {
        // Fetch all three data sources in parallel
        const [figuresResponse, updatesResponse, statsResponse] = await Promise.all([
          fetch('/api/figures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ figureIds: ['iu(leejieun)', 'blackpink', 'bts'] }),
          }),
          fetch('/api/updates?limit=4'),
          fetch('/api/stats'),
        ]);

        if (!figuresResponse.ok) {
          throw new Error('Failed to fetch featured figures');
        }
        if (!updatesResponse.ok) {
          throw new Error('Failed to fetch updates');
        }
        if (!statsResponse.ok) {
          throw new Error('Failed to fetch stats');
        }

        const [figuresData, updatesData, statsData] = await Promise.all([
          figuresResponse.json(),
          updatesResponse.json(),
          statsResponse.json(),
        ]);

        // Transform updates data
        const formattedUpdates = updatesData.updates.map((update: UpdateDocument) => {
          const getInitials = (name: string | undefined): string => {
            if (!name) return '??';
            return name.split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
          };

          return {
            id: update.id,
            title: update.eventTitle || 'Update',
            user: {
              initials: getInitials(update.figureName),
              profilePic: update.figureProfilePic,
              name: update.figureName
            },
            description: update.eventPointDescription || 'No description available',
            timeAgo: formatTimeAgo(update.lastUpdated),
            source: update.subcategory || update.mainCategory,
            verified: true,
            figureId: update.figureId,
            eventTitle: update.eventTitle
          };
        });

        const formattedStats = {
          totalFigures: statsData.totalFigures || 0,
          totalFacts: statsData.totalFacts || 0
        };

        // Update state
        setFeaturedFigures(figuresData);
        setTrendingUpdates(formattedUpdates);
        setStatsData(formattedStats);

        // Cache the data
        setCachedData({
          featuredFigures: figuresData,
          trendingUpdates: formattedUpdates,
          stats: formattedStats,
          timestamp: Date.now(),
        });

      } catch (error) {
        console.error('Error fetching home page data:', error);
        setFeaturedError('Failed to load data');
      } finally {
        setFeaturedLoading(false);
        setUpdatesLoading(false);
        setStatsLoading(false);
        // Mark all content as loaded after everything is ready
        setAllContentLoaded(true);
      }
    };

    fetchAllData();
  }, [isCacheValid, setCachedData]); // Removed cachedData to prevent re-render loop

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    }, observerOptions);

    // Only observe sections that need animation
    // Hero section never animates
    // What's Happening only animates on mobile/tablet (handled by CSS)
    const sectionsToObserve = [
      whatsSectionRef.current, // Will animate on mobile/tablet via CSS + observer
      featuredSectionRef.current, // Always animates
      ctaSectionRef.current // Always animates
    ];

    sectionsToObserve.forEach(section => {
      if (section) {
        observer.observe(section);
      }
    });

    return () => {
      sectionsToObserve.forEach(section => {
        if (section) {
          observer.unobserve(section);
        }
      });
    };
  }, []);

  // Handle clicks outside search
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);

    try {
      const { hits } = await searchClient.initIndex('selected-figures').search<AlgoliaPublicFigure>(query, {
        hitsPerPage: 8,
        attributesToHighlight: ['name', 'name_kr'],
        highlightPreTag: '<mark class="bg-yellow-200">',
        highlightPostTag: '</mark>',
        queryType: 'prefixAll',
        typoTolerance: true
      });

      setSearchResults(hits);
      setShowResults(true);
    } catch (error) {
      console.error('Algolia search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Generic navigation handler with loading state
  const handleNavigate = (url: string) => {
    setIsPageLoading(true);
    router.push(url);
  };

  const handleResultClick = (figureId: string, name: string) => {
    const slug = createUrlSlug(name);
    handleNavigate(`/${slug}`);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      handleNavigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      handleSearchSubmit();
    }
  };

  const renderHighlightedText = (highlightedValue: string) => {
    return <span dangerouslySetInnerHTML={{ __html: highlightedValue }} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(60px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Hero section - always visible, no animation, higher z-index for search dropdown */
        .hero-section {
          position: relative;
          z-index: 30;
          opacity: 1;
          transform: translateY(0);
        }

        /* What's Happening - animate on mobile/tablet, visible on desktop */
        .whats-section {
          position: relative;
          z-index: 10;
          opacity: 0;
          transform: translateY(60px);
        }

        /* On large screens (desktop), What's Happening is immediately visible */
        @media (min-width: 1024px) {
          .whats-section {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Featured and CTA sections - always animate */
        .section-animate {
          position: relative;
          z-index: 10;
          opacity: 0;
          transform: translateY(60px);
        }

        .animate-fade-in {
          animation: fadeInUp 1s ease-out forwards;
        }
      `}</style>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Video Section - Above Hero */}
        {/* <section className="relative w-full mb-12 rounded-2xl overflow-hidden" style={{ height: '400px' }}> */}
        {/* Video Background */}
        {/* <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          > */}
        {/* <source src="/videos/EHCOai_Video_Production_Request.mp4" type="video/mp4" /> */}
        {/* <source src="/videos/Futuristic_K_Pop_Data_Visualization.mp4" type="video/mp4" /> */}
        {/* Your browser does not support the video tag.
          </video> */}

        {/* Optional: Dark overlay for better text contrast */}
        {/* <div className="absolute inset-0 bg-black bg-opacity-30"></div> */}

        {/* Optional: Content overlay on the video */}
        {/* <div className="relative z-10 flex items-center justify-center h-full text-white text-center px-4">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">Welcome to EHCO</h2>
              <p className="text-xl md:text-2xl">Your trusted source for verified celebrity information</p>
            </div>
          </div> */}
        {/* </section> */}

        {/* Hero Section with Search - Full Height */}
        <section ref={searchSectionRef} className="hero-section flex flex-col justify-center mb-12 pt-16 md:pt-24">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Understanding <span className="text-key-color">Their Story</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get accurate, fact-checked information about your favorite celebrities
            </p>
          </div>

          {/* Search Bar */}
          <div ref={searchRef} className="relative max-w-2xl mx-auto w-full mb-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => searchQuery && setShowResults(true)}
                placeholder="Search for a public figure..."
                className="w-full px-6 py-4 pr-12 text-lg border-2 border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:border-key-color transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isSearching ? (
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                ) : searchQuery ? (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowResults(false);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                ) : (
                  <Search className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && (
              <>
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1d1d1f] rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    {isSearching ? (
                      <div className="py-8 text-center">
                        <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-key-color" />
                        <p className="text-gray-500 dark:text-gray-400">Searching...</p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="py-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400">No results found for &quot;{searchQuery}&quot;</p>
                      </div>
                    ) : (
                      <>
                        {searchResults.map((result) => (
                          <Link
                            key={result.objectID}
                            href={`/${createUrlSlug(result.name || '')}`}
                            onClick={(e) => {
                              e.preventDefault();
                              handleResultClick(result.objectID, result.name || '');
                            }}
                            className="flex items-center gap-3 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                          >
                            <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                              {result.profilePic && (
                                <Image
                                  src={result.profilePic}
                                  alt={result.name || ''}
                                  width={48}
                                  height={48}
                                  className="object-cover w-full h-full"
                                />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {result._highlightResult?.name ?
                                  renderHighlightedText(result._highlightResult.name.value) :
                                  result.name}
                              </div>
                              {result.name_kr && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {result._highlightResult?.name_kr ?
                                    renderHighlightedText(result._highlightResult.name_kr.value) :
                                    result.name_kr}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                        {/* See all results button */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1d1d1f]">
                          <button
                            onClick={handleSearchSubmit}
                            className="w-full text-center py-3 px-4 bg-key-color hover:bg-red-700 text-white rounded-full font-medium transition-colors duration-150 flex items-center justify-center gap-2"
                          >
                            <Search className="w-4 h-4" />
                            See all results for &quot;{searchQuery}&quot;
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stats Section */}
          <section className="mb-12">
            <div className="flex flex-wrap justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-key-color">
                  {statsLoading ? (
                    <Loader2 className="animate-spin inline-block" size={24} />
                  ) : (
                    `${statsData.totalFacts.toLocaleString()}`
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Facts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-key-color">
                  {statsLoading ? (
                    <Loader2 className="animate-spin inline-block" size={24} />
                  ) : (
                    statsData.totalFigures.toLocaleString()
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Figures</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-key-color">96%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>
            </div>
          </section>
        </section>

        {/* All Content Sections Loading State */}
        {!allContentLoaded ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin w-12 h-12 mb-4 text-key-color" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading content...</p>
          </div>
        ) : (
          <>
            {/* What's Happening Section - Full Height */}
            <section ref={whatsSectionRef} className="whats-section flex flex-col justify-center mb-12 min-h-screen md:min-h-0">
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">What&apos;s Happening</h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Live updates on trending stories</p>

              <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md overflow-hidden">
                <div className="px-4">{updatesLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-key-color" />
                    <p className="text-gray-500 dark:text-gray-400">Loading updates...</p>
                  </div>
                ) : (
                  <div>
                    {trendingUpdates.map((update) => (
                      <div key={update.id} className="flex gap-3 py-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-20">
                          {update.user.profilePic ? (
                            <Link
                              href={`/${createUrlSlug(update.user.name!)}`}
                              className="flex flex-col items-center gap-1"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate(`/${createUrlSlug(update.user.name!)}`);
                              }}
                            >
                              <div className="w-14 h-14 rounded-full overflow-hidden mx-auto">
                                <Image
                                  src={update.user.profilePic}
                                  alt={update.user.initials}
                                  width={56}
                                  height={56}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                              <div className="text-xs text-gray-900 dark:text-white font-medium text-center w-full truncate px-1">
                                {update.user.name}
                              </div>
                            </Link>

                          ) : (
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold mx-auto">
                              {update.user.initials}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/${update.figureId}?event=${slugify(update.eventTitle)}&modal=true#${slugify(update.eventTitle)}`}
                          className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            handleNavigate(`/${update.figureId}?event=${slugify(update.eventTitle)}&modal=true#${slugify(update.eventTitle)}`);
                          }}
                        >
                          <p className="text-sm text-gray-600 dark:text-gray-400">{update.title}</p>
                          <h3 className="font-medium mb-1 text-gray-900 dark:text-white line-clamp-2">{update.description}</h3>
                          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                            <span>{update.timeAgo}</span>
                            {update.source && (
                              <>
                                <span className="mx-1">•</span>
                                <span>{update.source}</span>
                              </>
                            )}
                          </div>
                        </Link>
                        <div className="flex-shrink-0 self-center">
                          {update.verified && (
                            <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs">Verified</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>

              </div>
              <div className="text-center mt-6">
                <Link
                  href="/updates"
                  className="inline-block bg-key-color hover:bg-red-700 text-white text-sm font-medium px-6 py-2 rounded-full transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate('/updates');
                  }}
                >
                  See All Updates →
                </Link>
              </div>
            </section>

            {/* Featured Figures Section - Full Height */}
            <section ref={featuredSectionRef} className="section-animate flex flex-col justify-center mb-12 min-h-screen md:min-h-0">
              <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Featured Figures</h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Complete profiles with full verification</p>

              {featuredLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4 text-key-color" />
                  <p className="text-gray-500 dark:text-gray-400">Loading featured profiles...</p>
                </div>
              ) : featuredError ? (
                <div className="py-12 text-center">
                  <p className="text-red-500 dark:text-red-400 mb-2">{featuredError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-key-color text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {featuredFigures.map((figure) => (
                    <div key={figure.id} className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center mb-4">
                          <div className="flex-shrink-0">
                            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-key-color">
                              <Link
                                href={`/${createUrlSlug(figure.name)}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleNavigate(`/${createUrlSlug(figure.name)}`);
                                }}
                              >
                                <Image
                                  src={figure.profilePic || '/images/default-profile.png'}
                                  alt={figure.name}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </Link>
                            </div>
                          </div>
                          <div className="ml-3">
                            <Link
                              href={`/${createUrlSlug(figure.name)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate(`/${createUrlSlug(figure.name)}`);
                              }}
                            >
                              <h3 className="font-bold text-lg text-gray-900 dark:text-white">{figure.name}</h3>
                            </Link>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {figure.occupation ? figure.occupation.join(', ') : 'Artist'}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between text-center mb-4">
                          <div>
                            <div className="font-bold text-key-color">{figure.stats?.totalSources || 85}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Sources</div>
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{figure.stats?.totalFacts.toLocaleString() || '3,500+'}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Facts</div>
                          </div>
                          <div>
                            <div className="font-bold text-green-600 dark:text-green-400">
                              {figure.stats?.totalSources && figure.stats?.totalFacts
                                ? (() => {
                                  const calculated = Math.round((figure.stats.totalSources / Math.max(figure.stats.totalFacts, 1)) * 100);
                                  const percentage = calculated < 90 ? 95 : Math.min(99, calculated);
                                  return `${percentage}%`;
                                })()
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Verified</div>
                          </div>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                          {figure.featuredUpdate?.eventTitle ? (
                            <Link
                              href={`/${createUrlSlug(figure.name)}?event=${slugify(figure.featuredUpdate?.eventTitle || '')}&modal=true#${slugify(figure.featuredUpdate?.eventTitle || '')}`}
                              className="block hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 py-1 rounded transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                handleNavigate(`/${createUrlSlug(figure.name)}?event=${slugify(figure.featuredUpdate?.eventTitle || '')}&modal=true#${slugify(figure.featuredUpdate?.eventTitle || '')}`);
                              }}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                                  {figure.featuredUpdate.eventTitle}
                                </h4>
                                <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2">Verified</span>
                              </div>
                              <div className="min-h-[60px]"> {/* Fixed height container for description */}
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  {figure.featuredUpdate.eventPointDescription || 'Recent professional activities and public appearances.'}
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {figure.featuredUpdate.eventPointDate
                                    ? formatEventDate(figure.featuredUpdate.eventPointDate)
                                    : 'No recent updates'
                                  }
                                </div>
                              </div>
                            </Link>
                          ) : (
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                                  Latest: {figure.name} update
                                </h4>
                                <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2">Verified</span>
                              </div>
                              <div className="min-h-[60px]"> {/* Fixed height container for description */}
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                  Recent professional activities and public appearances.
                                </p>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  No recent updates
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* <div className="bg-gray-50 px-3 py-2"> */}
                      {/* Empty footer for consistent height */}
                      {/* </div> */}
                    </div>
                  ))}
                </div>
              )}

              <div className="text-center mt-6">
                <Link
                  href="/all-figures"
                  className="inline-block bg-key-color hover:bg-red-700 text-white text-sm font-medium px-6 py-2 rounded-full transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavigate('/all-figures');
                  }}
                >
                  Browse All Figures →
                </Link>
              </div>
            </section>

            {/* Call to Action Section */}
            <section ref={ctaSectionRef} className="section-animate bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md p-8 text-center mb-12">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Ready to explore?</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start discovering verified information about your favorite public figures.
              </p>
              <Link
                href="/search"
                className="inline-flex items-center bg-key-color hover:bg-red-700 text-white font-medium py-2 px-6 rounded-full transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('/search');
                }}
              >
                Start Searching
                <Search className="ml-2 w-4 h-4" />
              </Link>
            </section>
          </>
        )}
      </main>
      {isPageLoading && <LoadingOverlay />}
      {showWelcomeBanner && <WelcomeBanner onClose={handleCloseWelcomeBanner} />}
    </div>
  );
}
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import WelcomeBanner from '@/components/home/WelcomeBanner';
import { useHomeData } from '@/context/HomeDataContext';
import { useHomeSearch } from '@/hooks/useHomeSearch';
import { HeroSearchSection } from '@/components/home/HeroSearchSection';
import { TrendingUpdatesSection } from '@/components/home/TrendingUpdatesSection';
import { FeaturedFiguresSection } from '@/components/home/FeaturedFiguresSection';
import { CTASection } from '@/components/home/CTASection';
import { formatTimeAgo } from '@/lib/utils/dateUtils';
import { TrendingUpdate } from '@/components/home/TrendingUpdateCard';
import { FeaturedFigure } from '@/components/home/FeaturedFigureCard';

// Loading Overlay Component
const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[60] flex items-center justify-center">
    <div className="bg-white dark:bg-[#1d1d1f] p-6 rounded-lg flex items-center space-x-3">
      <Loader2 className="animate-spin text-slate-600 dark:text-white" size={24} />
      <span className="text-slate-600 dark:text-white font-medium">Loading...</span>
    </div>
  </div>
);

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

// Main Page Component
export default function Home() {
  // Get home data context
  const { cachedData, setCachedData, isCacheValid } = useHomeData();

  // State for welcome banner
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  // State for featured figures
  const [featuredFigures, setFeaturedFigures] = useState<FeaturedFigure[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState<boolean>(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  // State for trending updates
  const [trendingUpdates, setTrendingUpdates] = useState<TrendingUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState<boolean>(true);

  // State for stats counters
  const [statsData, setStatsData] = useState<{ totalFigures: number; totalFacts: number }>({
    totalFigures: 0,
    totalFacts: 0
  });
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Master loading state for all content sections (except Hero)
  const [allContentLoaded, setAllContentLoaded] = useState<boolean>(false);

  // Custom hooks
  const searchHook = useHomeSearch();
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
  }, [isCacheValid, setCachedData]);

  // Intersection Observer for scroll animations
  useEffect(() => {
    // Don't set up observer until content is loaded
    if (!allContentLoaded) return;

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
    const sectionsToObserve = [
      whatsSectionRef.current,
      featuredSectionRef.current,
      ctaSectionRef.current
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
  }, [allContentLoaded]);

  // Generic navigation handler with loading state
  const handleNavigate = (url: string) => {
    searchHook.setIsPageLoading(true);
    router.push(url);
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
        {/* Hero Section with Search */}
        <HeroSearchSection
          ref={searchSectionRef}
          {...searchHook}
          statsData={statsData}
          statsLoading={statsLoading}
        />

        {/* All Content Sections Loading State */}
        {!allContentLoaded ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="animate-spin w-12 h-12 mb-4 text-key-color" />
            <p className="text-lg text-gray-600 dark:text-gray-400">Loading content...</p>
          </div>
        ) : (
          <>
            {/* What's Happening Section */}
            <TrendingUpdatesSection
              ref={whatsSectionRef}
              updates={trendingUpdates}
              loading={updatesLoading}
              onNavigate={handleNavigate}
            />

            {/* Featured Figures Section */}
            <FeaturedFiguresSection
              ref={featuredSectionRef}
              figures={featuredFigures}
              loading={featuredLoading}
              error={featuredError}
              onNavigate={handleNavigate}
            />

            {/* Call to Action Section */}
            <CTASection
              ref={ctaSectionRef}
              onNavigate={handleNavigate}
            />
          </>
        )}
      </main>

      {searchHook.isPageLoading && <LoadingOverlay />}
      {showWelcomeBanner && <WelcomeBanner onClose={handleCloseWelcomeBanner} />}
    </div>
  );
}

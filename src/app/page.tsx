'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Search, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import algoliasearch from 'algoliasearch';
import { useFigures } from '@/context/FiguresContext';
import Image from 'next/image';
import WelcomeBanner from '@/components/WelcomeBanner';
import { createUrlSlug } from '@/lib/slugify';

// Setup Algolia client - same as in Header.tsx
const searchClient = algoliasearch(
  "B1QF6MLIU5",
  "ef0535bdd12e549ffa7c9541395432a1"
);

interface PublicFigure {
  id: string;
  name: string;
  profilePic?: string;
}

// Add the Algolia search result type
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

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center">
    <div className="bg-white p-6 rounded-lg flex items-center space-x-3">
      <Loader2 className="animate-spin text-slate-600" size={24} />
      <span className="text-slate-600 font-medium">Loading...</span>
    </div>
  </div>
);

// Helper function to preload an image
const preloadImage = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

// Email validation function
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// The Homepage component without the header
export default function Home() {
  const { figures, isLoading, error } = useFigures();

  // Updated state to handle the new data structure
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // States for search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<AlgoliaPublicFigure[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // State to track which images have been successfully preloaded
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());
  const [imagesLoading, setImagesLoading] = useState(true);

  // Newsletter subscription states
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Welcome Banner
  const [showBanner, setShowBanner] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Preload images after figures are loaded
  useEffect(() => {
    if (figures.length === 0) {
      setImagesLoading(false);
      return;
    }

    const preloadAllImages = async () => {
      setImagesLoading(true);
      const preloadPromises: Promise<string>[] = [];
      const imagesToPreload: string[] = [];

      figures.forEach(figure => {
        if (figure.profilePic &&
          figure.profilePic !== '/images/default-profile.png' &&
          !figure.profilePic.includes('default-profile')) {
          imagesToPreload.push(figure.profilePic);
          preloadPromises.push(preloadImage(figure.profilePic));
        }
      });

      try {
        const results = await Promise.allSettled(preloadPromises);
        const successfullyLoaded = new Set<string>();

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfullyLoaded.add(imagesToPreload[index]);
          } else {
            console.warn(`Failed to preload image: ${imagesToPreload[index]}`);
          }
        });

        setPreloadedImages(successfullyLoaded);
      } catch (error) {
        console.error('Error during image preloading:', error);
      } finally {
        setImagesLoading(false);
      }
    };

    preloadAllImages();
  }, [figures]);

  // Handle clicks outside of search results
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-swipe effect - only start after images are loaded
  useEffect(() => {
    if (!isAutoSliding || figures.length === 0 || imagesLoading) return;

    const autoSlideInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + (isMobile ? 3 : 6)) % figures.length);
    }, 5000); // Slide every 3 seconds

    return () => clearInterval(autoSlideInterval);
  }, [isAutoSliding, figures.length, isMobile, imagesLoading]);

  // Banner effect
  useEffect(() => {
    const hasVisited = localStorage.getItem('hasVisitedECHO');
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    // Prevent the browser's default behavior of reloading the page
    e.preventDefault();

    if (searchQuery.trim()) {
      setShowResults(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const renderHighlightedText = (text: string) => {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  const handlePrevious = () => {
    setIsAutoSliding(false);
    setCurrentIndex((prev) => {
      const step = isMobile ? 3 : 6;
      if (prev === 0) {
        return figures.length - step >= 0 ? figures.length - step : 0;
      }
      return Math.max(0, prev - step);
    });
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  const handleNext = () => {
    setIsAutoSliding(false);
    const step = isMobile ? 3 : 6;
    setCurrentIndex((prev) => (prev + step) % figures.length);
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  // Handle infinite loop by creating a circular array
  const getCircularSlice = (start: number, length: number): PublicFigure[] => {
    const displayCount = isMobile ? 3 : 6;
    const result = [];
    for (let i = 0; i < displayCount; i++) {
      const index = (start + i) % figures.length;
      result.push(figures[index]);
    }
    return result;
  };

  const displayedFigures = figures.length > 0 ? getCircularSlice(currentIndex, isMobile ? 3 : 6) : [];

  // Function to get the appropriate image source
  const getImageSrc = (figure: PublicFigure): string => {
    if (!figure.profilePic) return '/images/default-profile.png';

    // If the image was successfully preloaded, use it; otherwise use default
    if (preloadedImages.has(figure.profilePic)) {
      return figure.profilePic;
    }

    return '/images/default-profile.png';
  };

  // Newsletter subscription handler
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setSubscriptionError('');

    // Validate email format
    if (!isValidEmail(email)) {
      setSubscriptionError('Please enter a valid email address.');
      return;
    }

    setIsSubscribing(true);

    try {
      // Replace this with your actual API endpoint
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success
        setIsSubscribed(true);
        setEmail('');
      } else if (response.status === 409) {
        // Email already exists
        setSubscriptionError('This email is already subscribed to our newsletter.');
      } else {
        // Other error
        setSubscriptionError(data.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setSubscriptionError('Network error. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    // Clear error when user starts typing
    if (subscriptionError) {
      setSubscriptionError('');
    }
  };

  // handle banner action
  const handleCloseBanner = () => {
    setShowBanner(false);
    localStorage.setItem('hasVisitedECHO', 'true');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showBanner && <WelcomeBanner onClose={handleCloseBanner} />}
      <div className={showBanner ? 'blur-sm' : ''}>
        {/* Main content */}
        <main className="w-[92%] sm:w-[90%] md:w-[80%] mx-auto px-2 sm:px-4 py-12 sm:py-16">
          {/* Title section */}
          <section className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 text-black">
              Understand Their <span className="text-key-color">Story</span>
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-6 sm:mb-8">
              Structured information from trusted sources.
            </p>

            {/* Search bar - shown only on homepage */}
            <div className="w-full max-w-xl mx-auto mb-6 relative" ref={searchRef}>
              <form onSubmit={handleSearchSubmit}>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleInputChange}
                    // You no longer need onKeyDown for submission
                    // onKeyDown={handleKeyDown} 
                    placeholder="Search for a public figure..."
                    className="w-full px-4 md:px-6 py-2.5 md:py-3 text-black text-base md:text-lg border-2 border-key-color rounded-full focus:outline-none focus:border-key-color pl-12"
                  />
                  {searchQuery ? (
                    <X
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 cursor-pointer"
                      size={20}
                      onClick={() => {
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                    />
                  ) : (
                    // It's good practice to make the search icon a submit button for accessibility
                    <button type="submit" aria-label="Search" className="absolute right-4 top-1/2 transform -translate-y-1/2">
                      <Search className="w-5 h-5 md:w-6 md:h-6 text-key-color" />
                    </button>
                  )}
                </div>
              </form>

              {/* Search Results Dropdown */}
              {isSearching ? (
                <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg w-full left-0 right-0">
                  <div className="px-3 py-3 text-sm text-gray-500 text-center">
                    Loading...
                  </div>
                </div>
              ) : (
                <>
                  {showResults && searchResults.length > 0 && (
                    <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg w-full left-0 right-0 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2">
                        {searchResults.map((result) => (
                          <Link
                            key={result.objectID}
                            href={`/${createUrlSlug(result.objectID)}`}
                            className="flex flex-row items-center px-4 py-3 hover:bg-gray-100"
                            onClick={(e) => {
                              e.preventDefault();
                              setShowResults(false);
                              setSearchQuery('');
                              setIsPageLoading(true);
                              router.push(`/${createUrlSlug(result.objectID)}`);

                              setTimeout(() => {
                                setIsPageLoading(false);
                              }, 500);
                            }}
                          >
                            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden flex-shrink-0">
                              <Image
                                src={result.profilePic || '/images/default-profile.png'}
                                alt={result.name || 'Profile'}
                                fill
                                sizes="(max-width: 768px) 48px, 64px"
                                className="object-cover"
                              />
                            </div>

                            <div className="flex-1 pl-4">
                              <div className="font-medium text-sm md:text-md text-black truncate">
                                {result._highlightResult?.name ?
                                  renderHighlightedText(result._highlightResult.name.value) :
                                  result.name}
                              </div>
                              {result.name_kr && (
                                <div className="text-xs md:text-sm text-gray-500 truncate">
                                  {result._highlightResult?.name_kr ?
                                    renderHighlightedText(result._highlightResult.name_kr.value) :
                                    result.name_kr}
                                </div>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {showResults && searchQuery && searchResults.length === 0 && (
                    <div className="absolute z-50 mt-2 bg-white border rounded-lg shadow-lg w-full left-0 right-0">
                      <div className="px-3 py-3 text-sm text-gray-500 text-center">
                        No results found
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Explore Figures section */}
          <section className="mt-16 sm:mt-24">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-8 sm:mb-12 text-black">
              Explore Figures
            </h3>

            {isLoading || (figures.length > 0 && imagesLoading) ? (
              <div className="flex justify-center items-center gap-2 sm:gap-4 md:gap-8 px-4 md:px-16">
                {[...Array(isMobile ? 3 : 6)].map((_, index) => (
                  <div key={index} className="text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full bg-gray-200 animate-pulse mb-2 md:mb-3 mx-auto" />
                    <div className="h-4 w-16 sm:w-20 md:w-24 bg-gray-200 animate-pulse rounded mx-auto" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">
                <p className="mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-key-color text-white rounded-lg hover:opacity-80 transition-opacity"
                >
                  Retry
                </button>
              </div>
            ) : figures.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>No figures available at the moment.</p>
              </div>
            ) : (
              <div
                className="relative"
                onMouseEnter={() => setIsAutoSliding(false)}
                onMouseLeave={() => setIsAutoSliding(true)}
              >
                {/* Visible carousel items */}
                <div className="flex justify-center items-center gap-2 sm:gap-4 md:gap-8 px-1 sm:px-4 md:px-8">
                  {displayedFigures.map((figure, index) => (
                    <Link
                      href={`/${createUrlSlug(figure.id)}`}
                      key={`${figure.id}-${index}`}
                      className="text-center group"
                    >
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 rounded-full overflow-hidden mb-1 md:mb-3 mx-auto border-2 border-gray-200 group-hover:border-key-color transition-colors">
                        <Image
                          src={getImageSrc(figure)}
                          alt={figure.name}
                          fill
                          sizes="(max-width: 640px) 6rem, (max-width: 768px) 8rem, 10rem"
                          className="object-cover"
                        />
                      </div>
                      <p className="text-xs md:text-sm font-medium text-black truncate max-w-[80px] sm:max-w-[100px] md:max-w-full mx-auto">
                        {figure.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation controls at the bottom */}
            {figures.length > 0 && (
              <div className="flex justify-center items-center space-x-4 sm:space-x-6 mt-6">
                <button
                  onClick={handlePrevious}
                  className="bg-white rounded-full p-2 sm:p-2.5 shadow-md hover:shadow-lg transition-shadow focus:outline-none"
                  disabled={isLoading || imagesLoading}
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleNext}
                  className="bg-white rounded-full p-2 sm:p-2.5 shadow-md hover:shadow-lg transition-shadow focus:outline-none"
                  disabled={isLoading || imagesLoading}
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* Explore All link */}
            {figures.length > 0 && (
              <div className="text-center mt-6 sm:mt-8">
                <Link href='/all-figures' className='text-sm md:text-base text-key-color font-medium underline hover:opacity-80 transition-colors'>
                  Explore All
                </Link>
              </div>
            )}
          </section>
        </main>

        {/* Newsletter subscription section - separate from footer */}
        <section className="mt-16 sm:mt-24 bg-key-color text-white py-8 sm:py-10 md:py-12">
          <div className="w-[92%] sm:w-[90%] md:w-[80%] mx-auto px-4 text-center">
            <p className="text-xs sm:text-sm md:text-lg mb-6 sm:mb-8 max-w-3xl mx-auto">
              EHCO delivers clearly sourced, organized timelines for fans, media, and industry professionals seeking accurate context.
            </p>

            {/* Newsletter signup */}
            <div className="flex justify-center">
              <div className="relative max-w-2xl w-full">
                {isSubscribed ? (
                  // Success message
                  <div className="text-center py-4">
                    <p className="text-sm md:text-base font-medium">
                      You are all set! Thank you for subscribing.
                    </p>
                  </div>
                ) : (
                  // Subscription form
                  <form onSubmit={handleSubscribe}>
                    {/* Desktop layout */}
                    <div className="hidden sm:block">
                      <div className="relative flex rounded-full border-2 border-white overflow-hidden">
                        <input
                          type="email"
                          value={email}
                          onChange={handleEmailChange}
                          placeholder="Enter Email Address"
                          className="flex-1 px-6 py-3 bg-transparent text-white placeholder-white placeholder-opacity-80 focus:outline-none text-sm md:text-base"
                          disabled={isSubscribing}
                        />
                        <button
                          type="submit"
                          disabled={isSubscribing || !email.trim()}
                          className="px-6 md:px-8 py-3 bg-white text-key-color font-medium hover:bg-gray-100 transition-colors text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                          {isSubscribing ? (
                            <>
                              <Loader2 className="animate-spin mr-2" size={16} />
                              Subscribing...
                            </>
                          ) : (
                            'Subscribe for Updates'
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile layout */}
                    <div className="block sm:hidden space-y-3">
                      <input
                        type="email"
                        value={email}
                        onChange={handleEmailChange}
                        placeholder="Enter Email Address"
                        className="w-full px-4 py-3 bg-transparent text-white placeholder-white placeholder-opacity-80 focus:outline-none text-sm border-2 border-white rounded-full"
                        disabled={isSubscribing}
                      />
                      <button
                        type="submit"
                        disabled={isSubscribing || !email.trim()}
                        className="w-full px-4 py-3 bg-white text-key-color font-medium hover:bg-gray-100 transition-colors text-sm rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSubscribing ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} />
                            Subscribing...
                          </>
                        ) : (
                          'Subscribe for Updates'
                        )}
                      </button>
                    </div>

                    {/* Error message */}
                    {subscriptionError && (
                      <div className="mt-3 text-center">
                        <p className="text-sm text-red-200 bg-red-500 bg-opacity-20 px-4 py-2 rounded-lg">
                          {subscriptionError}
                        </p>
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      {isPageLoading && <LoadingOverlay />}
    </div>
  );
}
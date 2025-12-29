// app/search/search-results.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import algoliasearch from 'algoliasearch';
import Link from 'next/link';
import Image from 'next/image';
import { createUrlSlug } from '@/lib/utils/slugify';

const searchClient = algoliasearch(
    "B1QF6MLIU5",
    "ef0535bdd12e549ffa7c9541395432a1"
);

const ITEMS_PER_PAGE = 10;

type PublicFigureResult = {
    objectID: string;
    name?: string;
    name_kr?: string;
    profilePic?: string;
    nationality?: string;
    occupation?: string[];
    _highlightResult?: {
        name?: {
            value: string;
        };
        koreanName?: {
            value: string;
        };
    };
};

type ArticleResult = {
    objectID: string;
    subTitle?: string;
    body?: string;
    imageUrls?: string[];
    source?: string;
    sendDate?: string;
    link?: string;
    _highlightResult?: {
        subTitle?: {
            value: string;
        };
        body?: {
            value: string;
        };
    };
};

export default function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q') || '';

    // Get tab and page from URL params
    const tabFromUrl = searchParams.get('tab') as 'profiles' | 'articles' | null;
    const pageFromUrl = searchParams.get('page');

    // Initialize state from URL immediately to prevent flash
    const initialTab = tabFromUrl || 'profiles';
    const initialPage = pageFromUrl ? parseInt(pageFromUrl, 10) - 1 : 0;

    const [activeTab, setActiveTab] = useState<'profiles' | 'articles'>(initialTab);
    const [profiles, setProfiles] = useState<PublicFigureResult[]>([]);
    const [articles, setArticles] = useState<ArticleResult[]>([]);
    const [totalProfileHits, setTotalProfileHits] = useState(0);
    const [totalArticleHits, setTotalArticleHits] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [profilePage, setProfilePage] = useState(initialTab === 'profiles' ? initialPage : 0);
    const [articlePage, setArticlePage] = useState(initialTab === 'articles' ? initialPage : 0);
    const [isMobile, setIsMobile] = useState(false);

    // Sync state with URL params on mount and when URL changes
    useEffect(() => {
        if (!query) return;

        const newTab = tabFromUrl || 'profiles';
        const newPage = pageFromUrl ? parseInt(pageFromUrl, 10) - 1 : 0; // URL is 1-indexed, state is 0-indexed

        // If URL doesn't have tab/page params, add them with defaults
        if (!tabFromUrl || !pageFromUrl) {
            const params = new URLSearchParams();
            params.set('q', query);
            params.set('tab', newTab);
            params.set('page', (newPage + 1).toString());
            router.replace(`/search?${params.toString()}`, { scroll: false });
        }

        setActiveTab(newTab);
        if (newTab === 'profiles') {
            setProfilePage(newPage);
        } else {
            setArticlePage(newPage);
        }
    }, [tabFromUrl, pageFromUrl, query, router]);

    // Check for mobile viewport
    useEffect(() => {
        const checkIsMobile = () => {
            setIsMobile(window.innerWidth < 640);
        };

        checkIsMobile();
        window.addEventListener('resize', checkIsMobile);

        return () => {
            window.removeEventListener('resize', checkIsMobile);
        };
    }, []);

    // Fetch initial counts for both tabs
    useEffect(() => {
        const fetchInitialCounts = async () => {
            if (!query) {
                setTotalProfileHits(0);
                setTotalArticleHits(0);
                setIsLoading(false);
                return;
            }

            try {
                setIsLoading(true);
                const [profileResponse, articleResponse] = await Promise.all([
                    searchClient.initIndex('selected-figures').search(query, {
                        hitsPerPage: 0, // Just get the count
                        attributesToHighlight: [],
                    }),
                    searchClient.initIndex('articles').search(query, {
                        hitsPerPage: 0, // Just get the count
                        attributesToHighlight: [],
                    })
                ]);

                setTotalProfileHits(profileResponse.nbHits);
                setTotalArticleHits(articleResponse.nbHits);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialCounts();
    }, [query]);

    // Fetch data based on active tab
    useEffect(() => {
        const fetchTabResults = async () => {
            if (!query) {
                setProfiles([]);
                setArticles([]);
                return;
            }

            try {
                setIsLoading(true);

                if (activeTab === 'profiles') {
                    const profileResponse = await searchClient.initIndex('selected-figures').search(query, {
                        page: profilePage,
                        hitsPerPage: ITEMS_PER_PAGE,
                        attributesToHighlight: ['name', 'name_kr'],
                        highlightPreTag: '<mark class="bg-yellow-200">',
                        highlightPostTag: '</mark>',
                    });

                    setProfiles(profileResponse.hits as PublicFigureResult[]);
                    setTotalProfileHits(profileResponse.nbHits);
                } else {
                    const articleResponse = await searchClient.initIndex('articles').search(query, {
                        page: articlePage,
                        hitsPerPage: ITEMS_PER_PAGE,
                        attributesToHighlight: ['subTitle', 'body'],
                        highlightPreTag: '<mark class="bg-yellow-200">',
                        highlightPostTag: '</mark>'
                    });

                    setArticles(articleResponse.hits as ArticleResult[]);
                    setTotalArticleHits(articleResponse.nbHits);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTabResults();
    }, [query, activeTab, profilePage, articlePage]);

    const handleArticleClick = (article: ArticleResult) => {
        if (article.link) {
            window.open(article.link, '_blank', 'noopener,noreferrer');
        }
    };

    const currentPage = activeTab === 'profiles' ? profilePage : articlePage;
    const totalHits = activeTab === 'profiles' ? totalProfileHits : totalArticleHits;
    const totalPages = Math.ceil(totalHits / ITEMS_PER_PAGE);

    const handlePageChange = (pageNumber: number) => {
        const urlPage = pageNumber + 1; // Convert 0-indexed to 1-indexed for URL
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('tab', activeTab);
        params.set('page', urlPage.toString());

        router.push(`/search?${params.toString()}`, { scroll: false });
    };

    const handleTabChange = (tab: 'profiles' | 'articles') => {
        const params = new URLSearchParams();
        params.set('q', query);
        params.set('tab', tab);

        // Preserve the page state for each tab (use their current page, or default to 1)
        const targetPage = tab === 'profiles' ? profilePage : articlePage;
        params.set('page', (targetPage + 1).toString());

        router.push(`/search?${params.toString()}`, { scroll: false });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Function to determine which page numbers to show
    const getPageNumbers = () => {
        const pageNumbers: number[] = [];

        if (totalPages <= (isMobile ? 3 : 5)) {
            // If there are only a few pages, show all
            for (let i = 0; i < totalPages; i++) {
                pageNumbers.push(i);
            }
        } else {
            // Always include current page
            pageNumbers.push(currentPage);

            // Add one or two pages before current page if they exist
            if (currentPage - 1 >= 0) pageNumbers.push(currentPage - 1);
            if (currentPage - 2 >= 0 && !isMobile) pageNumbers.push(currentPage - 2);

            // Add one or two pages after current page if they exist
            if (currentPage + 1 < totalPages) pageNumbers.push(currentPage + 1);
            if (currentPage + 2 < totalPages && !isMobile) pageNumbers.push(currentPage + 2);
        }

        // Sort the page numbers
        return pageNumbers.sort((a, b) => a - b);
    };

    const renderHighlightedText = (text?: string) => {
        if (!text) return '';
        return <span dangerouslySetInnerHTML={{ __html: text }} />;
    };

    if (error) {
        return (
            <div className="w-full py-8 flex justify-center">
                <div className="w-[90%] md:w-[75%] lg:w-[60%] text-red-500 text-center">{error}</div>
            </div>
        );
    }

    const totalResults = totalProfileHits + totalArticleHits;

    return (
        <div className="w-full py-8 flex flex-col items-center bg-white dark:bg-black">
            <div className="w-[90%] md:w-[75%] lg:w-[60%] px-4">
                <h1 className="text-2xl font-bold mb-2 text-black dark:text-white">Search Results</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">Showing results for: &ldquo;{query}&rdquo;</p>

                {totalResults === 0 && !isLoading ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                        No results found for &ldquo;{query}&rdquo;
                    </div>
                ) : (
                    <>
                        {/* Tab Navigation */}
                        <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => handleTabChange('profiles')}
                                className={`px-6 py-3 font-medium transition-colors relative ${
                                    activeTab === 'profiles'
                                        ? 'text-key-color border-b-2 border-key-color'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Profiles
                                {totalProfileHits > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {totalProfileHits}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleTabChange('articles')}
                                className={`px-6 py-3 font-medium transition-colors relative ${
                                    activeTab === 'articles'
                                        ? 'text-key-color border-b-2 border-key-color'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                            >
                                Articles
                                {totalArticleHits > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {totalArticleHits}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Loading State */}
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center space-x-3">
                                    <Loader2 className="animate-spin text-slate-600 dark:text-white" size={24} />
                                    <span className="text-slate-600 dark:text-white font-medium">Loading...</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Profile Results */}
                                {activeTab === 'profiles' && (
                                    <div className='w-full'>
                                        {profiles.length > 0 ? (
                                            <>
                                                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 max-w-3xl">
                                                    {profiles.map((profile) => (
                                                        <Link
                                                            key={profile.objectID}
                                                            href={`/${createUrlSlug(profile.objectID)}`}
                                                            className="block"
                                                        >
                                                            <div className="flex flex-col sm:flex-row border border-key-color rounded-lg p-4 sm:p-6 hover:shadow-md hover:bg-slate-50 dark:hover:bg-[#1d1d1f] transition-shadow">
                                                                <div className="flex-shrink-0 flex justify-center mb-4 sm:mb-0">
                                                                    <div className="text-center">
                                                                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden mx-auto">
                                                                            <Image
                                                                                src={profile.profilePic || "/images/default-profile.png"}
                                                                                alt={profile.name || "Profile picture"}
                                                                                fill
                                                                                sizes="(max-width: 640px) 4rem, (max-width: 768px) 5rem, 6rem"
                                                                                quality={100}
                                                                                className="object-cover object-center"
                                                                                priority
                                                                                unoptimized={profile.profilePic?.includes('googleusercontent.com')}
                                                                            />
                                                                        </div>
                                                                        <p className="text-center mt-2 font-medium text-black dark:text-white">
                                                                            {profile.name || "Profile"}
                                                                        </p>
                                                                        <p className='text-center text-gray-500 dark:text-gray-400'>
                                                                            {profile.name_kr}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="sm:ml-6 md:ml-8 flex-grow">
                                                                    <div className="mb-3">
                                                                        <p className="font-semibold text-gray-600 dark:text-gray-300">Nationality</p>
                                                                        <p className='text-gray-400 dark:text-gray-500'>{profile.nationality || "Korean"}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-semibold text-gray-600 dark:text-gray-300">Occupation</p>
                                                                        <p className='text-gray-400 dark:text-gray-500'>{profile.occupation && profile.occupation.join(', ')}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </Link>
                                                    ))}
                                                </div>

                                                {/* Pagination for Profiles */}
                                                {totalPages > 1 && (
                                                    <div className="mt-8 flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => handlePageChange(0)}
                                                            disabled={currentPage === 0}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="First page"
                                                        >
                                                            «
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 0}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Previous page"
                                                        >
                                                            ‹
                                                        </button>

                                                        {/* Page Numbers */}
                                                        {getPageNumbers().map(page => (
                                                            <button
                                                                key={page}
                                                                onClick={() => handlePageChange(page)}
                                                                className={`px-2 sm:px-3 py-1 rounded-full ${currentPage === page
                                                                    ? 'bg-key-color text-white'
                                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                                    }`}
                                                                aria-label={`Page ${page + 1}`}
                                                                aria-current={currentPage === page ? 'page' : undefined}
                                                            >
                                                                {page + 1}
                                                            </button>
                                                        ))}

                                                        {/* Ellipsis and Last Page for larger page counts */}
                                                        {totalPages > (isMobile ? 3 : 5) && currentPage < totalPages - (isMobile ? 1 : 2) && (
                                                            <span className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300">...</span>
                                                        )}
                                                        {totalPages > (isMobile ? 3 : 5) && currentPage < totalPages - (isMobile ? 1 : 2) && (
                                                            <button
                                                                onClick={() => handlePageChange(totalPages - 1)}
                                                                className={`px-2 sm:px-3 py-1 rounded-full ${currentPage === totalPages - 1
                                                                    ? 'bg-key-color text-white'
                                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                                                aria-label={`Page ${totalPages}`}
                                                            >
                                                                {totalPages}
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage === totalPages - 1}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Next page"
                                                        >
                                                            ›
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange(totalPages - 1)}
                                                            disabled={currentPage === totalPages - 1}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Last page"
                                                        >
                                                            »
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                                                No profiles found for &ldquo;{query}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Article Results */}
                                {activeTab === 'articles' && (
                                    <div className="w-full">
                                        {articles.length > 0 ? (
                                            <>
                                                <div className="grid gap-6 w-full">
                                                    {articles.map((article) => (
                                                        <div
                                                            key={article.objectID}
                                                            onClick={() => handleArticleClick(article)}
                                                            className="w-full overflow-hidden flex flex-col md:flex-row md:items-center gap-4 p-4 cursor-pointer border border-key-color rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-[#1d1d1f] hover:shadow-md transition-shadow duration-300"
                                                        >
                                                            {article.imageUrls && (
                                                                <div className="w-full md:w-32 flex-shrink-0">
                                                                    <img
                                                                        src={article.imageUrls[0]}
                                                                        alt={article.subTitle || 'Article thumbnail'}
                                                                        className="w-full md:w-32 h-48 md:h-24 object-cover rounded-lg flex-shrink-0"
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="font-medium mb-1 text-black dark:text-white text-lg transition-colors">
                                                                    {article._highlightResult?.subTitle
                                                                        ? renderHighlightedText(article._highlightResult.subTitle.value)
                                                                        : article.subTitle}
                                                                </h4>
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                        {article.source} • {article.sendDate ? `${article.sendDate.substring(0, 4)}-${article.sendDate.substring(4, 6)}-${article.sendDate.substring(6, 8)}` : ''}
                                                                    </p>
                                                                </div>
                                                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                                                                    {(() => {
                                                                        // Use highlighted body value if available, otherwise fall back to the plain body
                                                                        const bodyContent = article._highlightResult?.body?.value || article.body;

                                                                        if (!bodyContent) {
                                                                            return null; // Return nothing if there is no body content
                                                                        }

                                                                        // Split the content by ' -- '
                                                                        const parts = bodyContent.split(' -- ');

                                                                        // Use the part after ' -- ' if it exists, otherwise use the original content. Trim whitespace.
                                                                        const mainContent = (parts.length > 1 ? parts[1] : parts[0]).trim();

                                                                        // The renderHighlightedText function will correctly render the string,
                                                                        // whether it contains the <mark> tags or is just plain text.
                                                                        return renderHighlightedText(mainContent);
                                                                    })()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Pagination for Articles */}
                                                {totalPages > 1 && (
                                                    <div className="mt-8 flex justify-center items-center gap-1 sm:gap-2 flex-wrap">
                                                        <button
                                                            onClick={() => handlePageChange(0)}
                                                            disabled={currentPage === 0}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="First page"
                                                        >
                                                            «
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange(currentPage - 1)}
                                                            disabled={currentPage === 0}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Previous page"
                                                        >
                                                            ‹
                                                        </button>

                                                        {/* Page Numbers */}
                                                        {getPageNumbers().map(page => (
                                                            <button
                                                                key={page}
                                                                onClick={() => handlePageChange(page)}
                                                                className={`px-2 sm:px-3 py-1 rounded-full ${currentPage === page
                                                                    ? 'bg-key-color text-white'
                                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                                                                    }`}
                                                                aria-label={`Page ${page + 1}`}
                                                                aria-current={currentPage === page ? 'page' : undefined}
                                                            >
                                                                {page + 1}
                                                            </button>
                                                        ))}

                                                        {/* Ellipsis and Last Page for larger page counts */}
                                                        {totalPages > (isMobile ? 3 : 5) && currentPage < totalPages - (isMobile ? 1 : 2) && (
                                                            <span className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300">...</span>
                                                        )}
                                                        {totalPages > (isMobile ? 3 : 5) && currentPage < totalPages - (isMobile ? 1 : 2) && (
                                                            <button
                                                                onClick={() => handlePageChange(totalPages - 1)}
                                                                className={`px-2 sm:px-3 py-1 rounded-full ${currentPage === totalPages - 1
                                                                    ? 'bg-key-color text-white'
                                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                                                                aria-label={`Page ${totalPages}`}
                                                            >
                                                                {totalPages}
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => handlePageChange(currentPage + 1)}
                                                            disabled={currentPage === totalPages - 1}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Next page"
                                                        >
                                                            ›
                                                        </button>
                                                        <button
                                                            onClick={() => handlePageChange(totalPages - 1)}
                                                            disabled={currentPage === totalPages - 1}
                                                            className="px-2 sm:px-3 py-1 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                            aria-label="Last page"
                                                        >
                                                            »
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                                                No articles found for &ldquo;{query}&rdquo;
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

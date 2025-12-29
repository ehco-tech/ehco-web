// src/hooks/useHomeSearch.ts

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import algoliasearch from 'algoliasearch';
import { createUrlSlug } from '@/lib/utils/slugify';

// Setup Algolia client
const searchClient = algoliasearch(
  "B1QF6MLIU5",
  "ef0535bdd12e549ffa7c9541395432a1"
);

// Types
export type AlgoliaPublicFigure = {
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

export interface UseHomeSearchReturn {
  searchQuery: string;
  searchResults: AlgoliaPublicFigure[];
  showResults: boolean;
  isSearching: boolean;
  isPageLoading: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResultClick: (figureId: string, name: string) => void;
  handleSearchSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
  setShowResults: (show: boolean) => void;
  setIsPageLoading: (loading: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
}

export const useHomeSearch = (): UseHomeSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<AlgoliaPublicFigure[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Perform search
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

  const handleNavigate = (url: string) => {
    setIsPageLoading(true);
    router.push(url);
  };

  const handleResultClick = (_figureId: string, name: string) => {
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

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return {
    searchQuery,
    searchResults,
    showResults,
    isSearching,
    isPageLoading,
    handleInputChange,
    handleResultClick,
    handleSearchSubmit,
    handleKeyDown,
    clearSearch,
    setShowResults,
    setIsPageLoading,
    searchRef,
  };
};

// src/components/home/SearchBar.tsx

import React from 'react';
import { Search, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { createUrlSlug } from '@/lib/slugify';
import { renderHighlightedText } from '@/lib/utils/htmlUtils';
import { AlgoliaPublicFigure } from '@/hooks/useHomeSearch';

interface SearchBarProps {
  searchQuery: string;
  searchResults: AlgoliaPublicFigure[];
  showResults: boolean;
  isSearching: boolean;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleResultClick: (figureId: string, name: string) => void;
  handleSearchSubmit: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  clearSearch: () => void;
  setShowResults: (show: boolean) => void;
  searchRef: React.RefObject<HTMLDivElement | null>;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  searchResults,
  showResults,
  isSearching,
  handleInputChange,
  handleResultClick,
  handleSearchSubmit,
  handleKeyDown,
  clearSearch,
  setShowResults,
  searchRef,
}) => {
  return (
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
              onClick={clearSearch}
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
      )}
    </div>
  );
};

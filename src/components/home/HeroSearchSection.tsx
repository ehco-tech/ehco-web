// src/components/home/HeroSearchSection.tsx

import React from 'react';
import { SearchBar } from './SearchBar';
import { HeroStats } from './HeroStats';
import { AlgoliaPublicFigure } from '@/hooks/useHomeSearch';

interface HeroSearchSectionProps {
  // From useHomeSearch
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

  // Stats
  statsData: {
    totalFigures: number;
    totalFacts: number;
  };
  statsLoading: boolean;
}

export const HeroSearchSection = React.forwardRef<HTMLElement, HeroSearchSectionProps>(
  (props, ref) => {
    const {
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
      statsData,
      statsLoading,
    } = props;

    return (
      <section ref={ref} className="hero-section flex flex-col justify-center mb-12 pt-14 md:pt-16">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
            Understanding <span className="text-key-color">Their Story</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Get accurate, fact-checked information about your favorite celebrities
          </p>
        </div>

        {/* Search Bar */}
        <SearchBar
          searchQuery={searchQuery}
          searchResults={searchResults}
          showResults={showResults}
          isSearching={isSearching}
          handleInputChange={handleInputChange}
          handleResultClick={handleResultClick}
          handleSearchSubmit={handleSearchSubmit}
          handleKeyDown={handleKeyDown}
          clearSearch={clearSearch}
          setShowResults={setShowResults}
          searchRef={searchRef}
        />

        {/* Stats Section */}
        <HeroStats statsData={statsData} statsLoading={statsLoading} />
      </section>
    );
  }
);

HeroSearchSection.displayName = 'HeroSearchSection';

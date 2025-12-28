// src/components/home/FeaturedFiguresSection.tsx

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { FeaturedFigureCard, FeaturedFigure } from './FeaturedFigureCard';

interface FeaturedFiguresSectionProps {
  figures: FeaturedFigure[];
  loading: boolean;
  error: string | null;
  onNavigate: (url: string) => void;
}

export const FeaturedFiguresSection = React.forwardRef<HTMLElement, FeaturedFiguresSectionProps>(
  ({ figures, loading, error, onNavigate }, ref) => {
    return (
      <section ref={ref} className="section-animate flex flex-col justify-center mb-12 min-h-screen md:min-h-0">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">Featured Figures</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Complete profiles with full verification</p>

        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="animate-spin w-8 h-8 mx-auto mb-4 text-key-color" />
            <p className="text-gray-500 dark:text-gray-400">Loading featured profiles...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-key-color text-white rounded hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {figures.map((figure) => (
              <FeaturedFigureCard key={figure.id} figure={figure} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        <div className="text-center mt-6">
          <Link
            href="/all-figures"
            className="inline-block bg-key-color hover:bg-red-700 text-white text-sm font-medium px-6 py-2 rounded-full transition-colors"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/all-figures');
            }}
          >
            Browse All Figures →
          </Link>
        </div>
      </section>
    );
  }
);

FeaturedFiguresSection.displayName = 'FeaturedFiguresSection';

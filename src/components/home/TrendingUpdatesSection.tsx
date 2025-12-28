// src/components/home/TrendingUpdatesSection.tsx

import React from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { TrendingUpdateCard, TrendingUpdate } from './TrendingUpdateCard';

interface TrendingUpdatesSectionProps {
  updates: TrendingUpdate[];
  loading: boolean;
  onNavigate: (url: string) => void;
}

export const TrendingUpdatesSection = React.forwardRef<HTMLElement, TrendingUpdatesSectionProps>(
  ({ updates, loading, onNavigate }, ref) => {
    return (
      <section ref={ref} className="whats-section flex flex-col justify-center mb-12 min-h-screen md:min-h-0">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-white">What&apos;s Happening</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Live updates on trending stories</p>

        <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md overflow-hidden">
          <div className="px-4">
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="animate-spin w-6 h-6 mx-auto mb-2 text-key-color" />
                <p className="text-gray-500 dark:text-gray-400">Loading updates...</p>
              </div>
            ) : (
              <div>
                {updates.map((update) => (
                  <TrendingUpdateCard key={update.id} update={update} onNavigate={onNavigate} />
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
              onNavigate('/updates');
            }}
          >
            See All Updates →
          </Link>
        </div>
      </section>
    );
  }
);

TrendingUpdatesSection.displayName = 'TrendingUpdatesSection';

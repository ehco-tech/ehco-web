// src/components/home/CTASection.tsx

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface CTASectionProps {
  onNavigate: (url: string) => void;
}

export const CTASection = React.forwardRef<HTMLElement, CTASectionProps>(
  ({ onNavigate }, ref) => {
    return (
      <section ref={ref} className="section-animate bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md p-8 text-center mb-12">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Ready to explore?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Start discovering verified information about your favorite public figures.
        </p>
        <Link
          href="/search"
          className="inline-flex items-center bg-key-color hover:bg-red-700 text-white font-medium py-2 px-6 rounded-full transition-colors"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('/search');
          }}
        >
          Start Searching
          <Search className="ml-2 w-4 h-4" />
        </Link>
      </section>
    );
  }
);

CTASection.displayName = 'CTASection';

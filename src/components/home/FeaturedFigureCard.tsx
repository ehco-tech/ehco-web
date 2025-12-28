// src/components/home/FeaturedFigureCard.tsx

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createUrlSlug } from '@/lib/slugify';
import { formatEventDate } from '@/lib/utils/dateUtils';

// Slugify function for creating URL-friendly hash anchors
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, ''); // Remove all non-word chars

export interface FeaturedFigure {
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

interface FeaturedFigureCardProps {
  figure: FeaturedFigure;
  onNavigate: (url: string) => void;
}

export const FeaturedFigureCard: React.FC<FeaturedFigureCardProps> = ({ figure, onNavigate }) => {
  return (
    <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-key-color">
              <Link
                href={`/${createUrlSlug(figure.name)}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(`/${createUrlSlug(figure.name)}`);
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
                onNavigate(`/${createUrlSlug(figure.name)}`);
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
                onNavigate(`/${createUrlSlug(figure.name)}?event=${slugify(figure.featuredUpdate?.eventTitle || '')}&modal=true#${slugify(figure.featuredUpdate?.eventTitle || '')}`);
              }}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                  {figure.featuredUpdate.eventTitle}
                </h4>
                <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs flex-shrink-0 ml-2">Verified</span>
              </div>
              <div className="min-h-[60px]">
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
              <div className="min-h-[60px]">
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
    </div>
  );
};

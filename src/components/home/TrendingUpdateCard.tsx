// src/components/home/TrendingUpdateCard.tsx

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createUrlSlug } from '@/lib/utils/slugify';

// Slugify function for creating URL-friendly hash anchors
const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, ''); // Remove all non-word chars

export interface TrendingUpdate {
  id: string;
  title: string;
  user: {
    initials: string;
    profilePic?: string;
    name?: string;
  };
  description: string;
  timeAgo: string;
  source?: string;
  verified: boolean;
  figureId: string;
  eventTitle: string;
}

interface TrendingUpdateCardProps {
  update: TrendingUpdate;
  onNavigate: (url: string) => void;
}

export const TrendingUpdateCard: React.FC<TrendingUpdateCardProps> = ({ update, onNavigate }) => {
  return (
    <div className="flex gap-3 py-3 border-t border-gray-100 dark:border-gray-800">
      <div className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-20">
        {update.user.profilePic ? (
          <Link
            href={`/${createUrlSlug(update.user.name!)}`}
            className="flex flex-col items-center gap-1"
            onClick={(e) => {
              e.preventDefault();
              onNavigate(`/${createUrlSlug(update.user.name!)}`);
            }}
          >
            <div className="w-14 h-14 rounded-full overflow-hidden mx-auto">
              <Image
                src={update.user.profilePic}
                alt={update.user.initials}
                width={56}
                height={56}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="text-xs text-gray-900 dark:text-white font-medium text-center w-full truncate px-1">
              {update.user.name}
            </div>
          </Link>
        ) : (
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold mx-auto">
            {update.user.initials}
          </div>
        )}
      </div>
      <Link
        href={`/${update.figureId}?event=${slugify(update.eventTitle)}&modal=true#${slugify(update.eventTitle)}`}
        className="flex-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded transition-colors cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          onNavigate(`/${update.figureId}?event=${slugify(update.eventTitle)}&modal=true#${slugify(update.eventTitle)}`);
        }}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">{update.title}</p>
        <h3 className="font-medium mb-1 text-gray-900 dark:text-white line-clamp-2">{update.description}</h3>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <span>{update.timeAgo}</span>
          {update.source && (
            <>
              <span className="mx-1">•</span>
              <span>{update.source}</span>
            </>
          )}
        </div>
      </Link>
      <div className="flex-shrink-0 self-center">
        {update.verified && (
          <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs">Verified</span>
        )}
      </div>
    </div>
  );
};

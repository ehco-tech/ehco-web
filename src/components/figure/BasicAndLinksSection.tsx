// src/components/BasicAndLinksSection.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { PublicFigure } from '@/app/[publicFigure]/page';
import { createUrlSlug } from '@/lib/utils/slugify';

interface BasicAndLinksSectionProps {
    publicFigure: PublicFigure;
    spotifyArtistNames?: string[];
}

export default function BasicAndLinksSection({ publicFigure, spotifyArtistNames = [] }: BasicAndLinksSectionProps) {
    const [showAllMembers, setShowAllMembers] = useState(false);
    const MEMBERS_LIMIT = 6;

    // Format date
    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';

        // Extract date part if there's additional text (e.g., "2016-06-06: Debut Album")
        const datePart = dateString.split(':')[0].trim();

        // Split by hyphen to check the format
        const parts = datePart.split('-');

        if (parts.length === 3) {
            // Full date: YYYY-MM-DD
            const date = new Date(datePart);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (parts.length === 2) {
            // Year and month: YYYY-MM
            const [year, month] = parts;
            const date = new Date(`${year}-${month}-01`);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        } else if (parts.length === 1) {
            // Just year: YYYY
            return parts[0];
        }

        // Fallback if format is unexpected
        return datePart;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Two-column grid for Basic Info and External Links */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information Card */}
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-6 text-key-color dark:text-key-color-dark">
                        Basic Information
                    </h2>
                    <div className="[&>*:last-child]:border-b-0">
                        {/* Debut Date */}
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Debut Date</span>
                            <span className="text-gray-900 dark:text-white text-right">
                                {formatDate(publicFigure.debutDate || '')}
                            </span>
                        </div>

                        {/* Origin */}
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Origin</span>
                            <span className="text-gray-900 dark:text-white text-right">
                                {publicFigure.nationality || 'N/A'}
                            </span>
                        </div>

                        {/* Label */}
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Label</span>
                            <span className="text-gray-900 dark:text-white text-right">
                                {publicFigure.companyUrl ? (
                                    <a
                                        href={publicFigure.companyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-key-color dark:text-key-color-dark hover:underline"
                                    >
                                        {publicFigure.company || 'N/A'}
                                    </a>
                                ) : (
                                    publicFigure.company || 'N/A'
                                )}
                            </span>
                        </div>

                        {/* Group (for individual members and units) */}
                        {('group' in publicFigure && publicFigure.group && publicFigure.group.trim() !== '' &&
                          (publicFigure.gender === 'Unit' || !publicFigure.is_group)) && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Group</span>
                                <span className="text-gray-900 dark:text-white text-right">
                                    {publicFigure.group.split(' / ').map((groupName, index, array) => (
                                        <React.Fragment key={groupName}>
                                            <Link
                                                href={`/${createUrlSlug(groupName.trim())}`}
                                                className="text-key-color dark:text-key-color-dark hover:underline"
                                            >
                                                {groupName.trim()}
                                            </Link>
                                            {index < array.length - 1 && ' / '}
                                        </React.Fragment>
                                    ))}
                                </span>
                            </div>
                        )}

                        {/* Members (for groups and units) */}
                        {((publicFigure.is_group && 'members' in publicFigure && publicFigure.members && publicFigure.members.length > 0) ||
                          (publicFigure.gender === 'unit' && 'members' in publicFigure && publicFigure.members && publicFigure.members.length > 0)) && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Members</span>
                                <div className="text-gray-900 dark:text-white text-right flex-1 ml-4">
                                    <div>
                                        <span className="inline">
                                            {('members' in publicFigure ? (showAllMembers ? publicFigure.members : publicFigure.members!.slice(0, MEMBERS_LIMIT)) : []).map((m, index) => (
                                                <React.Fragment key={m.name}>
                                                    <Link
                                                        href={`/${createUrlSlug(m.name)}`}
                                                        className="text-key-color dark:text-key-color-dark hover:underline"
                                                    >
                                                        {m.name}
                                                    </Link>
                                                    {index < (showAllMembers && 'members' in publicFigure ? publicFigure.members!.length : Math.min(MEMBERS_LIMIT, 'members' in publicFigure ? publicFigure.members!.length : 0)) - 1 && ', '}
                                                </React.Fragment>
                                            ))}
                                            {'members' in publicFigure && publicFigure.members!.length > MEMBERS_LIMIT && !showAllMembers && (
                                                <span className="text-gray-500 dark:text-gray-400">
                                                    {' '}+ {publicFigure.members!.length - MEMBERS_LIMIT} more
                                                </span>
                                            )}
                                        </span>
                                        {'members' in publicFigure && publicFigure.members!.length > MEMBERS_LIMIT && (
                                            <div className="mt-2">
                                                <button
                                                    onClick={() => setShowAllMembers(!showAllMembers)}
                                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm font-medium"
                                                >
                                                    {showAllMembers ? 'Show less' : 'Show all'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Years Active */}
                        <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">Years Active</span>
                            <span className="text-gray-900 dark:text-white text-right">
                                {publicFigure.debutDate?.slice(0, 4) || 'N/A'} ~ present
                            </span>
                        </div>

                        {/* Fandom Name */}
                        {publicFigure.fandomName && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Fandom Name</span>
                                <span className="text-gray-900 dark:text-white text-right">
                                    {publicFigure.fandomName}
                                </span>
                            </div>
                        )}

                        {/* Official Colors */}
                        {publicFigure.officialColors && (
                            <div className="flex justify-between py-3">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Official Colors</span>
                                <span className="text-gray-900 dark:text-white text-right">
                                    {publicFigure.officialColors}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Official Links Card */}
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold mb-6 text-key-color dark:text-key-color-dark">
                        Official Links
                    </h2>
                    <div className="[&>*:last-child]:border-b-0">
                        {/* Instagram */}
                        {publicFigure.instagramUrl && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Instagram</span>
                                <a
                                    href={publicFigure.instagramUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                >
                                    Instagram
                                </a>
                            </div>
                        )}

                        {/* YouTube */}
                        {publicFigure.youtubeUrl && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">YouTube</span>
                                <a
                                    href={publicFigure.youtubeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                >
                                    YouTube
                                </a>
                            </div>
                        )}

                        {/* Spotify */}
                        {publicFigure.spotifyUrl && publicFigure.spotifyUrl.length > 0 && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium self-center">Spotify</span>
                                <div className="flex flex-col items-end gap-1">
                                    {publicFigure.spotifyUrl.map((url, index) => {
                                        // Use actual artist name if available, otherwise fallback
                                        const label = spotifyArtistNames[index] ||
                                            (publicFigure.spotifyUrl!.length > 1
                                                ? (index === 0 ? 'Solo' : 'Group')
                                                : 'Spotify');

                                        return (
                                            <a
                                                key={index}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                            >
                                                {label}
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* X */}
                        {publicFigure.twitterLink && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">X</span>
                                <a
                                    href={publicFigure.twitterLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                >
                                    X
                                </a>
                            </div>
                        )}

                        {/* Tiktok  */}
                        {publicFigure.tiktokLink && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Tiktok</span>
                                <a
                                    href={publicFigure.tiktokLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                >
                                    Tiktok
                                </a>
                            </div>
                        )}

                        {/* Fan Community */}
                        {(publicFigure.weverseLink || publicFigure.berrizLink || publicFigure.fansLink) && (
                            <div className="flex justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                <span className="text-gray-600 dark:text-gray-400 font-medium">Fan Community</span>
                                <a
                                    href={publicFigure.weverseLink || publicFigure.berrizLink || publicFigure.fansLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-key-color dark:text-key-color-dark hover:underline text-right"
                                >
                                    {publicFigure.weverseLink ? 'Weverse' : publicFigure.berrizLink ? 'Berriz' : 'FANS'}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

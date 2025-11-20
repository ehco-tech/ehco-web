// src/components/FilmographySection.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { TMDbCredit } from '@/lib/tmdb';

interface FilmographySectionProps {
    cast: TMDbCredit[];
    crew: TMDbCredit[];
    personName: string;
}

// ✅ UPDATED: Added 'directing' and 'crew' filter types
type FilmographyFilter = 'all' | 'acting' | 'directing' | 'crew' | 'movie' | 'tv';

// Modal Component
interface CreditModalProps {
    credit: TMDbCredit;
    onClose: () => void;
}

function CreditModal({ credit, onClose }: CreditModalProps) {
    const imageUrl = credit.poster_path
        ? `https://image.tmdb.org/t/p/w500${credit.poster_path}`
        : '/default-movie-poster.png';

    const title = credit.title || credit.name || 'Unknown Title';
    const releaseDate = credit.release_date || credit.first_credit_air_date;

    const formatReleaseDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="sticky top-0 bg-white dark:bg-[#1d1d1f] border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative flex-shrink-0">
                            <Image
                                src={imageUrl}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="64px"
                                unoptimized
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
                            {releaseDate && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(releaseDate).getFullYear()}</p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X size={24} className="text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6">
                    {/* Project Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        {releaseDate && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Release Date</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{formatReleaseDate(releaseDate)}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Type</p>
                            <p className="font-semibold text-gray-900 dark:text-white capitalize">
                                {credit.media_type === 'movie' ? 'Movie' : 'TV Show'}
                            </p>
                        </div>
                        {credit.character && (
                            <div className="col-span-2">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Role</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{credit.character}</p>
                            </div>
                        )}
                        {credit.job && (
                            <div className="col-span-2">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Position</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{credit.job}</p>
                            </div>
                        )}
                        {credit.department && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Department</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{credit.department}</p>
                            </div>
                        )}
                        {credit.episode_count && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Episodes</p>
                                <p className="font-semibold text-gray-900 dark:text-white">{credit.episode_count}</p>
                            </div>
                        )}
                        {credit.vote_average > 0 && (
                            <div>
                                <p className="text-gray-500 dark:text-gray-400 mb-1">Rating</p>
                                <p className="font-semibold text-gray-900 dark:text-white">
                                    ⭐ {credit.vote_average.toFixed(1)}/10
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Overview */}
                    {credit.overview && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Overview</h3>
                            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                                {credit.overview}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// Credit Card Component
interface CreditCardProps {
    credit: TMDbCredit;
    onClick: () => void;
}

function CreditCard({ credit, onClick }: CreditCardProps) {
    const imageUrl = credit.poster_path
        ? `https://image.tmdb.org/t/p/w300${credit.poster_path}`
        : '/default-movie-poster.png';

    const title = credit.title || credit.name || 'Unknown Title';
    const releaseDate = credit.release_date || credit.first_credit_air_date;
    const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : 'TBA';
    const role = credit.character || credit.job || '';

    return (
        <div
            className="cursor-pointer group"
            onClick={onClick}
        >
            <div className="bg-white dark:bg-[#1d1d1f] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg">
                {/* Poster */}
                <div className="aspect-[2/3] bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                    />
                </div>

                {/* Info */}
                <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate mb-1">{title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        {releaseYear} • {credit.media_type === 'movie' ? 'Film' : 'TV Series'}
                    </p>
                    {role && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{role}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// Main Component
export default function FilmographySection({ cast, crew, personName }: FilmographySectionProps) {
    const [filter, setFilter] = useState<FilmographyFilter>('all');
    const [selectedCredit, setSelectedCredit] = useState<TMDbCredit | null>(null);

    // ✅ UPDATED: Organize ALL credits (cast + crew)
    const directingCredits = crew.filter(c => c.job === 'Director');
    const otherCrewCredits = crew.filter(c => c.job !== 'Director');
    const allCredits = [...cast, ...crew];

    // ✅ UPDATED: Smart filtering based on what credits exist
    const getFilteredCredits = () => {
        switch (filter) {
            case 'acting':
                return cast;
            case 'directing':
                return directingCredits;
            case 'crew':
                return otherCrewCredits;
            case 'movie':
                return allCredits.filter(c => c.media_type === 'movie');
            case 'tv':
                return allCredits.filter(c => c.media_type === 'tv');
            default:
                return allCredits;
        }
    };

    const filteredCredits = getFilteredCredits();

    // ✅ UPDATED: Determine which tabs to show
    const hasActingCredits = cast.length > 0;
    const hasDirectingCredits = directingCredits.length > 0;
    const hasOtherCrewCredits = otherCrewCredits.length > 0;

    // ✅ UPDATED: Auto-select best default filter
    const getDefaultFilter = (): FilmographyFilter => {
        if (hasDirectingCredits && !hasActingCredits) {
            return 'directing'; // Director-only (like Bong Joon-ho)
        }
        if (hasActingCredits && !hasDirectingCredits && !hasOtherCrewCredits) {
            return 'acting'; // Actor-only
        }
        return 'all'; // Has mixed credits
    };

    // Set default filter on mount
    React.useEffect(() => {
        setFilter(getDefaultFilter());
    }, []);

    if (!cast.length && !crew.length) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Filmography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No filmography data available for {personName}.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Filmography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Film, television, and entertainment projects</p>

                    {/* ✅ UPDATED: Dynamic Filter Tabs based on available credits */}
                    <div className="flex gap-8 mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <button
                            onClick={() => setFilter('all')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'all'
                                    ? 'text-key-color dark:text-key-color-dark'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            All ({allCredits.length})
                            {filter === 'all' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>

                        {hasActingCredits && (
                            <button
                                onClick={() => setFilter('acting')}
                                className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'acting'
                                        ? 'text-key-color dark:text-key-color-dark'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                Acting ({cast.length})
                                {filter === 'acting' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                                )}
                            </button>
                        )}

                        {hasDirectingCredits && (
                            <button
                                onClick={() => setFilter('directing')}
                                className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'directing'
                                        ? 'text-key-color dark:text-key-color-dark'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                Directing ({directingCredits.length})
                                {filter === 'directing' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                                )}
                            </button>
                        )}

                        {hasOtherCrewCredits && (
                            <button
                                onClick={() => setFilter('crew')}
                                className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'crew'
                                        ? 'text-key-color dark:text-key-color-dark'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                Other Crew ({otherCrewCredits.length})
                                {filter === 'crew' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                                )}
                            </button>
                        )}

                        <button
                            onClick={() => setFilter('movie')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'movie'
                                    ? 'text-key-color dark:text-key-color-dark'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Movies
                            {filter === 'movie' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>

                        <button
                            onClick={() => setFilter('tv')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'tv'
                                    ? 'text-key-color dark:text-key-color-dark'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            TV Shows
                            {filter === 'tv' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>
                    </div>

                    {/* Credits Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredCredits.map((credit, index) => (
                            <CreditCard
                                key={`${credit.id}-${index}`}
                                credit={credit}
                                onClick={() => setSelectedCredit(credit)}
                            />
                        ))}
                    </div>

                    {filteredCredits.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            No {filter} credits found.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedCredit && (
                <CreditModal
                    credit={selectedCredit}
                    onClose={() => setSelectedCredit(null)}
                />
            )}
        </>
    );
}
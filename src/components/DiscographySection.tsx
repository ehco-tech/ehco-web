// src/components/DiscographySection.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { X, ExternalLink } from 'lucide-react';
import { SpotifyAlbum, SpotifyAlbumDetails } from '@/lib/spotify';
import { ArtistAlbumData } from '@/lib/spotify-cache-service';

interface DiscographySectionProps {
    albums: SpotifyAlbum[];
    artistAlbums: ArtistAlbumData[];
    artistName: string;
}

type AlbumFilter = 'all' | 'album' | 'single' | string;

// Modal Component
interface AlbumModalProps {
    album: SpotifyAlbumDetails;
    onClose: () => void;
}

function AlbumModal({ album, onClose }: AlbumModalProps) {
    const imageUrl = album.images[0]?.url || '/default-album-cover.png';

    const formatDuration = (ms: number) => {
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

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
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative flex-shrink-0">
                            <Image
                                src={imageUrl}
                                alt={album.name}
                                fill
                                className="object-cover"
                                sizes="64px"
                                unoptimized
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{album.name}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{album.artists[0]?.name}</p>
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
                    {/* Album Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Release Date</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{formatReleaseDate(album.release_date)}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Type</p>
                            <p className="font-semibold text-gray-900 dark:text-white capitalize">{album.album_type}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-gray-500 dark:text-gray-400 mb-1">Label</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{album.label}</p>
                        </div>
                    </div>

                    {/* Tracklist */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tracklist</h3>

                        {/* Playback Info Notice */}
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                                <span className="font-semibold">Playback Info:</span> Preview availability depends on your Spotify login status.
                                Logged-in users can play full tracks, while logged-out users get 30-second previews.
                                Some tracks may not have previews available due to Spotify&apos;s licensing restrictions.
                            </p>
                        </div>

                        <div className="space-y-3">
                            {album.tracks.items.map((track) => (
                                <div
                                    key={track.id}
                                    className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                                >
                                    {/* Track Info Header */}
                                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-gray-400 dark:text-gray-500 text-sm w-6 flex-shrink-0">{track.track_number}</span>
                                            <span className="truncate text-gray-900 dark:text-white font-medium">
                                                {track.name}
                                            </span>
                                            <a
                                                href={track.external_urls.spotify}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex-shrink-0"
                                                title="Open in Spotify"
                                            >
                                                <ExternalLink size={14} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                            </a>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-sm flex-shrink-0 ml-2">{formatDuration(track.duration_ms)}</span>
                                    </div>

                                    {/* Spotify Embed Player */}
                                    <div className="bg-white dark:bg-gray-900">
                                        <iframe
                                            src={`https://open.spotify.com/embed/track/${track.id}?utm_source=generator&theme=0`}
                                            width="100%"
                                            height="80"
                                            style={{ border: 0 }}
                                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                            loading="lazy"
                                            title={`Spotify player for ${track.name}`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* About This Album - placeholder for now */}
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">About This Album</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            &quot;{album.name}&quot; is a {album.album_type} by {album.artists[0]?.name}, released on {formatReleaseDate(album.release_date)} via {album.label}.
                            The {album.album_type} features {album.total_tracks} track{album.total_tracks !== 1 ? 's' : ''}.
                        </p>
                    </div>

                    {/* Spotify Link */}
                    <a
                        href={album.external_urls.spotify}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full bg-[#1DB954] hover:bg-[#1ed760] text-white text-center py-3 rounded-full font-semibold transition-colors"
                    >
                        Open in Spotify
                    </a>
                </div>
            </div>
        </div>
    );
}

// Album Card Component
interface AlbumCardProps {
    album: SpotifyAlbum;
    onClick: () => void;
}

function AlbumCard({ album, onClick }: AlbumCardProps) {
    const imageUrl = album.images[0]?.url || '/default-album-cover.png';
    const releaseYear = new Date(album.release_date).getFullYear();

    return (
        <div
            className="cursor-pointer group"
            onClick={onClick}
        >
            <div className="bg-white dark:bg-[#1d1d1f] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all hover:shadow-lg">
                {/* Album Cover */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                    <Image
                        src={imageUrl}
                        alt={album.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                    />
                </div>

                {/* Album Info */}
                <div className="p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate mb-1">{album.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {releaseYear} • {album.album_type === 'album' ? 'Studio Album' : album.album_type === 'single' ? 'Single' : 'EP'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// Main Component
export default function DiscographySection({ albums, artistAlbums, artistName }: DiscographySectionProps) {
    const [filter, setFilter] = useState<AlbumFilter>('all');
    const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbumDetails | null>(null);

    // Get filtered albums
    const getFilteredAlbums = () => {
        let filtered: SpotifyAlbum[];

        // Check if filtering by artist
        const artistFilter = artistAlbums.find(a => a.artistId === filter);
        if (artistFilter) {
            filtered = artistFilter.albums;
        } else {
            // Otherwise filter by type
            switch (filter) {
                case 'album':
                    filtered = albums.filter(a => a.album_type === 'album');
                    break;
                case 'single':
                    filtered = albums.filter(a => a.album_type === 'single');
                    break;
                default:
                    filtered = albums;
            }
        }

        // Sort by release date (newest first)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.release_date).getTime();
            const dateB = new Date(b.release_date).getTime();
            return dateB - dateA;
        });
    };

    const filteredAlbums = getFilteredAlbums();

    const handleAlbumClick = (album: SpotifyAlbum) => {
        // All album data including tracks should already be loaded from database
        // Simply cast and display
        setSelectedAlbum(album as SpotifyAlbumDetails);
    };

    if (!albums.length) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Discography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Chart-topping albums and singles that defined a generation</p>
                    <div className="text-gray-500 dark:text-gray-400 text-center py-12">
                        No discography data available for {artistName}.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white dark:bg-[#1d1d1f] rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                    <h2 className="text-3xl font-bold text-key-color dark:text-key-color-dark mb-2">Discography</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-8">Chart-topping albums and singles that defined a generation</p>

                    {/* Filter Tabs */}
                    <div className="flex gap-8 mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <button
                            onClick={() => setFilter('all')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'all'
                                ? 'text-key-color dark:text-key-color-dark'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            All
                            {filter === 'all' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>

                        {/* Artist filters - only show if multiple artists */}
                        {artistAlbums.length > 1 && artistAlbums.map((artist) => (
                            <button
                                key={artist.artistId}
                                onClick={() => setFilter(artist.artistId)}
                                className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === artist.artistId
                                    ? 'text-key-color dark:text-key-color-dark'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {artist.artistName}
                                {filter === artist.artistId && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                                )}
                            </button>
                        ))}

                        <button
                            onClick={() => setFilter('album')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'album'
                                ? 'text-key-color dark:text-key-color-dark'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Studio Albums
                            {filter === 'album' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>
                        <button
                            onClick={() => setFilter('single')}
                            className={`pb-3 font-semibold transition-colors relative whitespace-nowrap ${filter === 'single'
                                ? 'text-key-color dark:text-key-color-dark'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            Singles
                            {filter === 'single' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-key-color dark:bg-key-color-dark" />
                            )}
                        </button>
                    </div>

                    {/* Album Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredAlbums.map((album, index) => (
                            <AlbumCard
                                key={`${album.id}-${index}`}
                                album={album}
                                onClick={() => handleAlbumClick(album)}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {selectedAlbum && (
                <AlbumModal
                    album={selectedAlbum}
                    onClose={() => setSelectedAlbum(null)}
                />
            )}
        </>
    );
}

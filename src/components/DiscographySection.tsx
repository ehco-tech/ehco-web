// src/components/DiscographySection.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { X, ExternalLink, Play, Pause } from 'lucide-react';
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
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    // Cleanup audio when modal closes
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

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

    const handlePlayPause = (track: { id: string; preview_url: string | null }) => {
        if (!track.preview_url) return;

        // If clicking the same track that's playing, pause it
        if (playingTrackId === track.id && isPlaying) {
            audioRef.current?.pause();
            setIsPlaying(false);
            return;
        }

        // If clicking a different track or resuming
        if (playingTrackId === track.id && !isPlaying) {
            audioRef.current?.play();
            setIsPlaying(true);
            return;
        }

        // Playing a new track
        if (audioRef.current) {
            audioRef.current.pause();
        }

        const audio = new Audio(track.preview_url);
        audioRef.current = audio;
        setPlayingTrackId(track.id);
        setIsPlaying(true);

        audio.play();

        // Handle when audio ends
        audio.addEventListener('ended', () => {
            setIsPlaying(false);
            setPlayingTrackId(null);
        });

        // Handle errors
        audio.addEventListener('error', () => {
            setIsPlaying(false);
            setPlayingTrackId(null);
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
                        <div className="space-y-2">
                            {album.tracks.items.map((track) => {
                                const isCurrentTrack = playingTrackId === track.id;
                                const isTrackPlaying = isCurrentTrack && isPlaying;

                                return (
                                    <div
                                        key={track.id}
                                        className="flex items-center justify-between py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-gray-400 dark:text-gray-500 text-sm w-6 flex-shrink-0">{track.track_number}</span>

                                            {/* Play/Pause Button */}
                                            {track.preview_url ? (
                                                <button
                                                    onClick={() => handlePlayPause(track)}
                                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                                    title={isTrackPlaying ? "Pause preview" : "Play 30s preview"}
                                                >
                                                    {isTrackPlaying ? (
                                                        <Pause size={16} className="text-key-color dark:text-key-color-dark" />
                                                    ) : (
                                                        <Play size={16} className="text-gray-600 dark:text-gray-400" />
                                                    )}
                                                </button>
                                            ) : (
                                                <div className="w-8 h-8 flex-shrink-0" /> // Placeholder for alignment
                                            )}

                                            <span className={`truncate ${isCurrentTrack ? 'text-key-color dark:text-key-color-dark font-semibold' : 'text-gray-900 dark:text-white'}`}>
                                                {track.name}
                                            </span>

                                            <a
                                                href={track.external_urls.spotify}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                            >
                                                <ExternalLink size={14} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                            </a>
                                        </div>
                                        <span className="text-gray-500 dark:text-gray-400 text-sm flex-shrink-0 ml-2">{formatDuration(track.duration_ms)}</span>
                                    </div>
                                );
                            })}
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
    const [isLoadingAlbum, setIsLoadingAlbum] = useState(false);

    // Organize albums by type
    const studioAlbums = albums.filter(a => a.album_type === 'album');
    const singles = albums.filter(a => a.album_type === 'single');

    // Get filtered albums
    const getFilteredAlbums = () => {
        // Check if filtering by artist
        const artistFilter = artistAlbums.find(a => a.artistId === filter);
        if (artistFilter) {
            return artistFilter.albums;
        }

        // Otherwise filter by type
        switch (filter) {
            case 'album':
                return albums.filter(a => a.album_type === 'album');
            case 'single':
                return albums.filter(a => a.album_type === 'single');
            default:
                return albums;
        }
    };

    const filteredAlbums = getFilteredAlbums();

    const handleAlbumClick = async (album: SpotifyAlbum) => {
        setIsLoadingAlbum(true);
        try {
            // Check if album already has track details (from cache)
            if (album.tracks && album.tracks.items && album.tracks.items.length > 0) {
                // Use cached data - cast SpotifyAlbum to SpotifyAlbumDetails
                setSelectedAlbum(album as SpotifyAlbumDetails);
                setIsLoadingAlbum(false);
                return;
            }

            // Fallback: Fetch from API if tracks are not in cache
            console.warn('Album tracks not in cache, fetching from API...');
            const token = await getToken();
            const response = await fetch(`https://api.spotify.com/v1/albums/${album.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
            });

            if (response.ok) {
                const fullAlbumData = await response.json();
                setSelectedAlbum(fullAlbumData);
            } else {
                console.error('Failed to fetch album details');
            }
        } catch (error) {
            console.error('Error fetching album details:', error);
        } finally {
            setIsLoadingAlbum(false);
        }
    };

    // Helper to get token (fallback for albums without cached tracks)
    const getToken = async () => {
        const response = await fetch('/api/spotify/token');
        const data = await response.json();
        return data.access_token;
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

            {/* Loading Overlay */}
            {isLoadingAlbum && (
                <div className="fixed inset-0 bg-black bg-opacity-30 z-40 flex items-center justify-center">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 dark:border-pink-400"></div>
                    </div>
                </div>
            )}
        </>
    );
}

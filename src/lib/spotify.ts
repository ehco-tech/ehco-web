// src/lib/spotify.ts

export interface SpotifyImage {
    url: string;
    height: number;
    width: number;
}

export interface SpotifyArtist {
    id: string;
    name: string;
    images: SpotifyImage[];
    external_urls: {
        spotify: string;
    };
}

export interface SpotifyAlbum {
    id: string;
    name: string;
    album_type: 'album' | 'single' | 'compilation';
    available_markets: string[];
    release_date: string;
    release_date_precision: 'year' | 'month' | 'day';
    total_tracks: number;
    images: SpotifyImage[];
    external_urls: {
        spotify: string;
    };
    artists: Array<{
        id: string;
        name: string;
    }>;
    // Optional fields for cached full album details
    tracks?: {
        items: SpotifyTrack[];
    };
    label?: string;
    popularity?: number;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    track_number: number;
    duration_ms: number;
    explicit: boolean;
    preview_url: string | null;
    external_urls: {
        spotify: string;
    };
}

export interface SpotifyAlbumDetails extends SpotifyAlbum {
    tracks: {
        items: SpotifyTrack[];
    };
    label: string;
    popularity: number;
}

/**
 * Get Spotify access token using Client Credentials flow
 */
export async function getSpotifyToken(): Promise<string> {
    // For server-side calls, we can directly call Spotify API
    // This is more reliable than internal API route calls
    const client_id = process.env.SPOTIFY_CLIENT_ID;
    const client_secret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!client_id || !client_secret) {
        throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64')
        },
        body: 'grant_type=client_credentials',
        cache: 'force-cache',
        next: { revalidate: 3000 } // Token valid for ~50 minutes
    });

    if (!response.ok) {
        throw new Error('Failed to get Spotify token');
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Extract Spotify artist ID from various URL formats
 * Supports: 
 * - https://open.spotify.com/artist/3Nrfpe0tUJi4K4DXYWgMUX
 * - spotify:artist:3Nrfpe0tUJi4K4DXYWgMUX
 */
export function extractSpotifyArtistId(spotifyUrl: string): string | null {
    if (!spotifyUrl) return null;

    // Handle spotify URI format: spotify:artist:ID
    if (spotifyUrl.startsWith('spotify:artist:')) {
        return spotifyUrl.split(':')[2];
    }

    // Handle URL format: https://open.spotify.com/artist/ID
    const match = spotifyUrl.match(/artist\/([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}

/**
 * Search for an artist by name
 */
export async function searchSpotifyArtist(artistName: string): Promise<SpotifyArtist | null> {
    const token = await getSpotifyToken();

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            cache: 'force-cache',
            next: { revalidate: 86400 } // Cache for 24 hours
        }
    );

    if (!response.ok) {
        console.error('Failed to search Spotify artist');
        return null;
    }

    const data = await response.json();
    return data.artists?.items[0] || null;
}

/**
 * Get artist by Spotify ID
 */
export async function getSpotifyArtist(artistId: string): Promise<SpotifyArtist | null> {
    const token = await getSpotifyToken();

    const response = await fetch(
        `https://api.spotify.com/v1/artists/${artistId}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            cache: 'force-cache',
            next: { revalidate: 86400 }
        }
    );

    if (!response.ok) {
        console.error('Failed to get Spotify artist');
        return null;
    }

    return await response.json();
}

/**
 * Get all albums for an artist
 */
export async function getArtistAlbums(artistId: string): Promise<SpotifyAlbum[]> {
    const token = await getSpotifyToken();
    const albums: SpotifyAlbum[] = [];
    let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;

    while (url) {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            cache: 'force-cache',
            next: { revalidate: 86400 }
        });

        if (!response.ok) {
            console.error('Failed to get artist albums');
            break;
        }

        const data = await response.json();
        albums.push(...data.items);
        url = data.next; // Pagination
    }

    return albums;
}

/**
 * Get full album details including tracks
 */
export async function getAlbumDetails(albumId: string): Promise<SpotifyAlbumDetails | null> {
    const token = await getSpotifyToken();

    const response = await fetch(
        `https://api.spotify.com/v1/albums/${albumId}`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            cache: 'force-cache',
            next: { revalidate: 86400 }
        }
    );

    if (!response.ok) {
        console.error('Failed to get album details');
        return null;
    }

    return await response.json();
}

/**
 * Get artist's complete discography organized by type
 */
export async function getArtistDiscography(artistId: string) {
    const albums = await getArtistAlbums(artistId);

    // Remove duplicate albums (sometimes albums appear in multiple markets)
    const uniqueAlbums = albums.reduce((acc, album) => {
        const existing = acc.find(a => a.name === album.name && a.release_date === album.release_date);
        if (!existing) {
            acc.push(album);
        }
        return acc;
    }, [] as SpotifyAlbum[]);

    // Organize by type
    const studioAlbums = uniqueAlbums.filter(a => a.album_type === 'album');
    const singles = uniqueAlbums.filter(a => a.album_type === 'single');

    // Sort by release date (newest first)
    const sortByDate = (a: SpotifyAlbum, b: SpotifyAlbum) => 
        new Date(b.release_date).getTime() - new Date(a.release_date).getTime();

    return {
        studioAlbums: studioAlbums.sort(sortByDate),
        singles: singles.sort(sortByDate),
        allAlbums: uniqueAlbums.sort(sortByDate)
    };
}

#!/usr/bin/env python3
"""
Refresh Spotify Cache Script
Refreshes spotify_data field for all figures in the database with full album details including tracks and preview URLs.

Usage:
  python refresh_spotify_cache.py                    # Process all figures
  python refresh_spotify_cache.py --start-id yūshi   # Start from specific figure ID
  python refresh_spotify_cache.py --start-index 100  # Start from index 100
  python refresh_spotify_cache.py --only-id yūshi    # Process only one specific figure
"""

import os
import sys
import time
import requests
import base64
import argparse
from datetime import datetime, timezone
from dotenv import load_dotenv
from setup_firebase_deepseek import NewsManager

class SpotifyRefresher:
    def __init__(self):
        """Initialize Firebase and Spotify credentials"""
        load_dotenv()
        self.news_manager = NewsManager()
        self.db = self.news_manager.db

        # Get Spotify credentials
        self.client_id = os.getenv('SPOTIFY_CLIENT_ID')
        self.client_secret = os.getenv('SPOTIFY_CLIENT_SECRET')

        if not self.client_id or not self.client_secret:
            raise ValueError("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in environment variables")

        self.access_token = None
        print("✓ Spotify Refresher initialized successfully")

    def get_spotify_token(self):
        """Get Spotify API access token"""
        auth_string = f"{self.client_id}:{self.client_secret}"
        auth_bytes = auth_string.encode('utf-8')
        auth_base64 = base64.b64encode(auth_bytes).decode('utf-8')

        headers = {
            'Authorization': f'Basic {auth_base64}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        data = {'grant_type': 'client_credentials'}

        response = requests.post('https://accounts.spotify.com/api/token', headers=headers, data=data)

        if response.status_code == 200:
            self.access_token = response.json()['access_token']
            print("✓ Spotify access token obtained")
        else:
            raise Exception(f"Failed to get Spotify token: {response.status_code} {response.text}")

    def extract_artist_id(self, spotify_url):
        """Extract Spotify artist ID from URL"""
        if not spotify_url:
            return None

        # Handle spotify URI format: spotify:artist:ID
        if spotify_url.startswith('spotify:artist:'):
            return spotify_url.split(':')[2]

        # Handle URL format: https://open.spotify.com/artist/ID
        if 'artist/' in spotify_url:
            parts = spotify_url.split('artist/')
            if len(parts) > 1:
                artist_id = parts[1].split('?')[0].split('/')[0]
                return artist_id

        return None

    def make_spotify_request(self, url, headers, max_retries=3):
        """Make a Spotify API request with retry logic and exponential backoff"""
        for attempt in range(max_retries):
            response = requests.get(url, headers=headers)

            # Success
            if response.status_code == 200:
                return response

            # Rate limit hit - stop script and inform user
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                minutes = retry_after // 60
                seconds = retry_after % 60

                print(f"\n{'=' * 60}")
                print(f"🛑 SPOTIFY API RATE LIMIT REACHED")
                print(f"{'=' * 60}")
                print(f"⏰ You need to wait: {retry_after} seconds", end='')
                if minutes > 0:
                    print(f" ({minutes} minute{'s' if minutes != 1 else ''} {seconds} second{'s' if seconds != 1 else ''})")
                else:
                    print()
                print(f"⏰ Wait until approximately: {datetime.fromtimestamp(time.time() + retry_after).strftime('%I:%M:%S %p')}")
                print(f"\n💡 The script has been stopped. You can resume later using:")
                print(f"   --start-id <current_figure_id>")
                print(f"   or --start-index <current_index>")
                print(f"{'=' * 60}\n")

                # Raise exception to stop the script
                raise Exception(f"Rate limit reached. Please wait {retry_after} seconds before making more API calls.")

            # Other errors
            print(f"  ⚠️ Warning: API request failed with status {response.status_code}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                print(f"  ⏳ Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
            else:
                return response

        return response

    def get_artist_albums(self, artist_id):
        """Fetch all albums for an artist from Spotify"""
        headers = {'Authorization': f'Bearer {self.access_token}'}
        albums = []
        url = f'https://api.spotify.com/v1/artists/{artist_id}/albums?include_groups=album,single&limit=50'

        while url:
            response = self.make_spotify_request(url, headers)
            if response.status_code != 200:
                print(f"  ⚠️ Warning: Failed to fetch albums: {response.status_code}")
                return []

            data = response.json()
            albums.extend(data.get('items', []))
            url = data.get('next')  # Pagination

            # Add delay between pagination requests
            if url:
                time.sleep(0.5)

        return albums

    def get_album_details(self, album_id):
        """Fetch full album details including tracks"""
        headers = {'Authorization': f'Bearer {self.access_token}'}
        url = f'https://api.spotify.com/v1/albums/{album_id}'

        response = self.make_spotify_request(url, headers)
        if response.status_code != 200:
            print(f"  ⚠️ Warning: Failed to fetch album details: {response.status_code}")
            return None

        return response.json()

    def get_artist_info(self, artist_id):
        """Fetch artist information"""
        headers = {'Authorization': f'Bearer {self.access_token}'}
        url = f'https://api.spotify.com/v1/artists/{artist_id}'

        response = self.make_spotify_request(url, headers)
        if response.status_code != 200:
            return None

        return response.json()

    def clean_album_data(self, album):
        """Remove available_markets from album and tracks to reduce storage"""
        if not album:
            return None

        # Remove available_markets from album
        album_cleaned = {k: v for k, v in album.items() if k != 'available_markets'}

        # Remove available_markets from tracks
        if 'tracks' in album_cleaned and 'items' in album_cleaned['tracks']:
            album_cleaned['tracks']['items'] = [
                {k: v for k, v in track.items() if k != 'available_markets'}
                for track in album_cleaned['tracks']['items']
            ]

        return album_cleaned

    def remove_duplicates(self, albums):
        """Remove duplicate albums (same name and release date)"""
        seen = set()
        unique_albums = []

        for album in albums:
            key = (album.get('name'), album.get('release_date'))
            if key not in seen:
                seen.add(key)
                unique_albums.append(album)

        return unique_albums

    def refresh_figure_spotify_data(self, figure_id, figure_name, spotify_url):
        """Refresh Spotify data for a single figure"""
        # Handle both single URL (string) and multiple URLs (list)
        spotify_urls = spotify_url if isinstance(spotify_url, list) else [spotify_url]

        # Extract artist IDs
        artist_ids = [self.extract_artist_id(url) for url in spotify_urls]
        artist_ids = [aid for aid in artist_ids if aid]  # Filter out None values

        if not artist_ids:
            print(f"  ⚠️ Warning: No valid Spotify artist ID found")
            return False

        all_albums = []
        artist_cache_data = []

        for artist_id in artist_ids:
            # Get artist info
            artist_info = self.get_artist_info(artist_id)
            artist_name = artist_info.get('name', 'Unknown Artist') if artist_info else 'Unknown Artist'

            # Get basic album list
            print(f"  📀 Fetching albums for artist {artist_name}...")
            albums = self.get_artist_albums(artist_id)

            if not albums:
                artist_cache_data.append({
                    'albums': [],
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'artist_id': artist_id,
                    'artist_name': artist_name,
                    'error': 'No albums found from Spotify API'
                })
                print(f"  ⚠️ No albums found for artist {artist_name}")
                continue

            # Remove duplicates
            albums = self.remove_duplicates(albums)

            # Fetch full details for each album (including tracks with preview URLs)
            print(f"  🎵 Fetching full details for {len(albums)} albums...")
            albums_with_details = []

            for album in albums:
                album_details = self.get_album_details(album['id'])
                if album_details:
                    # Clean the data (remove available_markets)
                    cleaned_album = self.clean_album_data(album_details)
                    if cleaned_album:
                        albums_with_details.append(cleaned_album)

                # Increased delay to avoid rate limiting (aim for ~2 requests/second max)
                time.sleep(0.5)

            if albums_with_details:
                artist_cache_data.append({
                    'albums': albums_with_details,
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'artist_id': artist_id,
                    'artist_name': artist_name
                })
                all_albums.extend(albums_with_details)
                print(f"  ✅ Fetched {len(albums_with_details)} albums with full track details for {artist_name}")
            else:
                artist_cache_data.append({
                    'albums': [],
                    'last_updated': datetime.now(timezone.utc).isoformat(),
                    'artist_id': artist_id,
                    'artist_name': artist_name,
                    'error': 'Failed to fetch album details'
                })

        # Save to Firebase
        if artist_cache_data:
            cache_data = {
                'artists': artist_cache_data,
                'last_updated': datetime.now(timezone.utc).isoformat()
            }

            figure_ref = self.db.collection('selected-figures').document(figure_id)
            figure_ref.update({'spotify_data': cache_data})

            print(f"  💾 Saved {len(all_albums)} total albums to database")
            return True

        return False

    def refresh_all_figures(self, start_id=None, start_index=None, only_id=None):
        """Refresh Spotify data for all figures in the database

        Args:
            start_id: Start processing from this figure ID (inclusive)
            start_index: Start processing from this index (0-based, inclusive)
            only_id: Process only this specific figure ID
        """
        if only_id:
            print(f"🚀 Starting Spotify cache refresh for figure ID: {only_id}...\n")
        elif start_id:
            print(f"🚀 Starting Spotify cache refresh from figure ID: {start_id}...\n")
        elif start_index is not None:
            print(f"🚀 Starting Spotify cache refresh from index: {start_index}...\n")
        else:
            print("🚀 Starting Spotify cache refresh for all figures...\n")

        # Get Spotify token
        self.get_spotify_token()

        # Get all figures
        figures_ref = self.db.collection('selected-figures')
        figures = list(figures_ref.stream())

        total_figures = len(figures)
        print(f"📊 Found {total_figures} figures in database\n")

        # Handle only_id mode
        if only_id:
            figures = [doc for doc in figures if doc.id == only_id]
            if not figures:
                print(f"❌ Error: Figure with ID '{only_id}' not found in database")
                return
            print(f"Processing only figure: {only_id}\n")
            start_index = 0
        # Handle start_id mode
        elif start_id:
            start_index = None
            for i, doc in enumerate(figures):
                if doc.id == start_id:
                    start_index = i
                    break

            if start_index is None:
                print(f"❌ Error: Start figure ID '{start_id}' not found in database")
                return

            print(f"Starting from figure '{start_id}' at index {start_index}")
            print(f"Will process {total_figures - start_index} out of {total_figures} figures\n")
        # Handle start_index mode
        elif start_index is not None:
            if start_index < 0 or start_index >= total_figures:
                print(f"❌ Error: Start index {start_index} is out of range (0-{total_figures-1})")
                return

            print(f"Starting from index {start_index}")
            print(f"Will process {total_figures - start_index} out of {total_figures} figures\n")
        else:
            start_index = 0

        success_count = 0
        error_count = 0
        skipped_count = 0

        for index, doc in enumerate(figures):
            # Skip figures before start_index
            if index < start_index:
                continue

            figure_id = doc.id
            figure_data = doc.to_dict()
            figure_name = figure_data.get('name', 'Unknown')

            print(f"\n[{index + 1}/{total_figures}] Processing: {figure_name} (ID: {figure_id})")

            # Check if figure has spotifyUrl
            spotify_url = figure_data.get('spotifyUrl')

            if not spotify_url or (isinstance(spotify_url, list) and len(spotify_url) == 0):
                print(f"  ⏭️  Skipped: No Spotify URL found")
                skipped_count += 1
                continue

            try:
                success = self.refresh_figure_spotify_data(figure_id, figure_name, spotify_url)
                if success:
                    success_count += 1
                else:
                    error_count += 1

                # Add delay between figures to avoid rate limiting
                time.sleep(2.0)

            except Exception as e:
                print(f"  ❌ Error refreshing {figure_name}: {e}")
                error_count += 1

        # Print summary
        print('\n' + '=' * 50)
        print('📊 REFRESH SUMMARY')
        print('=' * 50)
        print(f'✅ Successfully refreshed: {success_count}')
        print(f'❌ Failed: {error_count}')
        print(f'⏭️  Skipped (no Spotify URL): {skipped_count}')
        if only_id:
            print(f'📊 Total in database: {total_figures}')
            print(f'📊 Processed: 1 figure (only mode)')
        elif start_index > 0:
            print(f'📊 Total in database: {total_figures}')
            print(f'📊 Processed: {total_figures - start_index} figures (started at index {start_index})')
        else:
            print(f'📊 Total processed: {total_figures}')
        print('=' * 50)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Refresh Spotify cache for figures in the database',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                           # Process all figures
  %(prog)s --start-id yūshi          # Start from figure with ID 'yūshi'
  %(prog)s --start-index 100         # Start from the 100th figure (0-based)
  %(prog)s --only-id yūshi           # Process only figure with ID 'yūshi'
        """
    )

    group = parser.add_mutually_exclusive_group()
    group.add_argument('--start-id', type=str, help='Start processing from this figure ID (inclusive)')
    group.add_argument('--start-index', type=int, help='Start processing from this index (0-based, inclusive)')
    group.add_argument('--only-id', type=str, help='Process only this specific figure ID')

    args = parser.parse_args()

    try:
        refresher = SpotifyRefresher()
        refresher.refresh_all_figures(
            start_id=args.start_id,
            start_index=args.start_index,
            only_id=args.only_id
        )
        print('\n✨ Script completed successfully!')
        sys.exit(0)
    except KeyboardInterrupt:
        print('\n\n⚠️ Script interrupted by user')
        print('💡 Tip: You can resume from where you left off using --start-id or --start-index')
        sys.exit(1)
    except Exception as e:
        print(f'\n💥 Script failed: {e}')
        sys.exit(1)

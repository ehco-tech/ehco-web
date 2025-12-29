#!/usr/bin/env python3
"""
Refresh TMDb Cache Script
Refreshes tmdb_data field for all figures in the database with filmography details.

Usage:
  python refresh_tmdb_cache.py                    # Process all figures
  python refresh_tmdb_cache.py --start-id yūshi   # Start from specific figure ID
  python refresh_tmdb_cache.py --start-index 100  # Start from index 100
  python refresh_tmdb_cache.py --only-id yūshi    # Process only one specific figure
"""

import os
import sys
import time
import requests
import argparse
from datetime import datetime, timezone
from dotenv import load_dotenv
from setup_firebase_deepseek import NewsManager

class TMDbRefresher:
    def __init__(self):
        """Initialize Firebase and TMDb credentials"""
        load_dotenv()
        self.news_manager = NewsManager()
        self.db = self.news_manager.db

        # Get TMDb credentials
        self.api_key = os.getenv('TMDB_API_KEY')

        if not self.api_key:
            raise ValueError("TMDB_API_KEY must be set in environment variables")

        self.base_url = 'https://api.themoviedb.org/3'
        print("✓ TMDb Refresher initialized successfully")

    def extract_tmdb_id(self, tmdb_url):
        """Extract TMDb person ID from URL"""
        if not tmdb_url:
            return None

        # Handle URL format: https://www.themoviedb.org/person/60476-song-joong-ki
        if 'themoviedb.org/person/' in tmdb_url:
            parts = tmdb_url.split('person/')
            if len(parts) > 1:
                person_id = parts[1].split('-')[0].split('?')[0].split('/')[0]
                try:
                    return int(person_id)
                except ValueError:
                    return None

        return None

    def make_tmdb_request(self, url, max_retries=3):
        """Make a TMDb API request with retry logic and exponential backoff"""
        for attempt in range(max_retries):
            response = requests.get(url)

            # Success
            if response.status_code == 200:
                return response

            # Rate limit hit - stop script and inform user
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                minutes = retry_after // 60
                seconds = retry_after % 60

                print(f"\n{'=' * 60}")
                print(f"🛑 TMDB API RATE LIMIT REACHED")
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

    def get_person_details(self, person_id):
        """Fetch person details from TMDb"""
        url = f'{self.base_url}/person/{person_id}?api_key={self.api_key}'

        response = self.make_tmdb_request(url)
        if response.status_code != 200:
            print(f"  ⚠️ Warning: Failed to fetch person details: {response.status_code}")
            return None

        return response.json()

    def get_person_filmography(self, person_id):
        """Fetch combined credits (filmography) for a person from TMDb"""
        url = f'{self.base_url}/person/{person_id}/combined_credits?api_key={self.api_key}'

        response = self.make_tmdb_request(url)
        if response.status_code != 200:
            print(f"  ⚠️ Warning: Failed to fetch filmography: {response.status_code}")
            return None

        data = response.json()

        # Sort credits by date (most recent first)
        def sort_by_date(credits):
            return sorted(credits, key=lambda x: x.get('release_date') or x.get('first_air_date') or '0', reverse=True)

        filmography = {
            'cast': sort_by_date(data.get('cast', [])),
            'crew': sort_by_date(data.get('crew', []))
        }

        return filmography

    def refresh_figure_tmdb_data(self, figure_id, figure_name, figure_data):
        """Refresh TMDb data for a single figure"""
        # First check if tmdb_id field exists in the figure data
        tmdb_id = figure_data.get('tmdb_id')

        # If no tmdb_id field, try to extract from tmdbUrl
        if not tmdb_id:
            tmdb_url = figure_data.get('tmdbUrl')
            if tmdb_url:
                tmdb_id = self.extract_tmdb_id(tmdb_url)

        if not tmdb_id:
            print(f"  ⚠️ Warning: No valid TMDb ID found (neither tmdb_id field nor tmdbUrl)")
            return False

        # Get person details
        print(f"  🎬 Fetching TMDb data for person ID {tmdb_id}...")
        person_details = self.get_person_details(tmdb_id)

        if not person_details:
            # Save error to Firebase
            cache_data = {
                'error': 'Failed to fetch person details from TMDb',
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'tmdb_id': tmdb_id
            }
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            figure_ref.update({'tmdb_data': cache_data})
            print(f"  ⚠️ Failed to fetch person details for {figure_name}")
            return False

        person_name = person_details.get('name', 'Unknown Person')
        also_known_as = person_details.get('also_known_as', [])

        # Get filmography
        print(f"  🎥 Fetching filmography for {person_name}...")
        filmography = self.get_person_filmography(tmdb_id)

        if not filmography:
            # Save error to Firebase
            cache_data = {
                'error': 'Failed to fetch filmography from TMDb',
                'last_updated': datetime.now(timezone.utc).isoformat(),
                'tmdb_id': tmdb_id,
                'person_name': person_name,
                'also_known_as': also_known_as
            }
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            figure_ref.update({'tmdb_data': cache_data})
            print(f"  ⚠️ Failed to fetch filmography for {person_name}")
            return False

        # Save to Firebase
        cast_count = len(filmography.get('cast', []))
        crew_count = len(filmography.get('crew', []))

        cache_data = {
            'filmography': filmography,
            'last_updated': datetime.now(timezone.utc).isoformat(),
            'person_id': tmdb_id,
            'person_name': person_name,
            'also_known_as': also_known_as
        }

        figure_ref = self.db.collection('selected-figures').document(figure_id)
        figure_ref.update({'tmdb_data': cache_data})

        print(f"  💾 Saved {cast_count} cast credits and {crew_count} crew credits for {person_name}")
        return True

    def refresh_all_figures(self, start_id=None, start_index=None, only_id=None):
        """Refresh TMDb data for all figures in the database

        Args:
            start_id: Start processing from this figure ID (inclusive)
            start_index: Start processing from this index (0-based, inclusive)
            only_id: Process only this specific figure ID
        """
        if only_id:
            print(f"🚀 Starting TMDb cache refresh for figure ID: {only_id}...\n")
        elif start_id:
            print(f"🚀 Starting TMDb cache refresh from figure ID: {start_id}...\n")
        elif start_index is not None:
            print(f"🚀 Starting TMDb cache refresh from index: {start_index}...\n")
        else:
            print("🚀 Starting TMDb cache refresh for all figures...\n")

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

            # Check if figure has tmdb_id or tmdbUrl
            has_tmdb_id = figure_data.get('tmdb_id') is not None
            has_tmdb_url = figure_data.get('tmdbUrl') is not None

            if not has_tmdb_id and not has_tmdb_url:
                print(f"  ⏭️  Skipped: No TMDb ID or URL found")
                skipped_count += 1
                continue

            try:
                success = self.refresh_figure_tmdb_data(figure_id, figure_name, figure_data)
                if success:
                    success_count += 1
                else:
                    error_count += 1

                # Add delay between figures to avoid rate limiting
                # TMDb allows 50 requests per second, so 0.5s delay is safe
                time.sleep(0.5)

            except Exception as e:
                print(f"  ❌ Error refreshing {figure_name}: {e}")
                error_count += 1

        # Print summary
        print('\n' + '=' * 50)
        print('📊 REFRESH SUMMARY')
        print('=' * 50)
        print(f'✅ Successfully refreshed: {success_count}')
        print(f'❌ Failed: {error_count}')
        print(f'⏭️  Skipped (no TMDb ID/URL): {skipped_count}')
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
        description='Refresh TMDb cache for figures in the database',
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
        refresher = TMDbRefresher()
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

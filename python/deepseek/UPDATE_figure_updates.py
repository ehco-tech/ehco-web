"""
Ongoing script to update the featuredUpdate field for figures.

This script should be run after timeline updates to keep featuredUpdate current.
Can be integrated into the UPDATE_timeline.py workflow or run as a scheduled job.

This script:
1. Iterates through specified figures (or all figures)
2. For each figure, finds the most recent update from 'recent-updates' collection
3. Updates the 'featuredUpdate' field if it's newer than the current one

Usage:
    python update_featured_updates.py
    
    Optional flags:
    --dry-run    : Preview updates without writing to Firestore
    --verbose    : Show detailed progress for each figure
    --figure     : Process only a specific figure by ID
    --force      : Update even if current featuredUpdate is newer
"""

import argparse
import asyncio
from firebase_admin import firestore
from setup_firebase_deepseek import NewsManager
from datetime import datetime

class FeaturedUpdateUpdater:
    MAX_DESCRIPTION_LENGTH = 200  # Target length for eventPointDescription

    def __init__(self, verbose=False, force=False):
        """Initialize the featured update updater."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.client = self.news_manager.client
        self.model = self.news_manager.model
        self.verbose = verbose
        self.force = force
        print("✓ FeaturedUpdateUpdater ready")
    
    def get_latest_update_for_figure(self, figure_id):
        """
        Fetch the most recent update for a figure from recent-updates collection.
        
        Returns:
            dict or None: The latest update document data, or None if no updates found
        """
        try:
            # Query recent-updates for this figure, sorted by lastUpdated (newest first)
            updates_ref = self.db.collection('recent-updates')
            query = updates_ref.where('figureId', '==', figure_id) \
                              .order_by('lastUpdated', direction=firestore.Query.DESCENDING) \
                              .limit(1)
            
            updates = list(query.stream())
            
            if not updates:
                if self.verbose:
                    print(f"      No updates found in recent-updates collection")
                return None
            
            latest_update = updates[0].to_dict()
            
            if self.verbose:
                print(f"      Found latest update: {latest_update.get('eventTitle', 'Untitled')[:50]}...")
                print(f"      Date: {latest_update.get('eventPointDate', 'N/A')}")
            
            return latest_update
            
        except Exception as e:
            print(f"   ⚠️ Error fetching latest update for {figure_id}: {e}")
            return None
    
    def get_current_featured_update(self, figure_id):
        """
        Get the current featuredUpdate from the figure document.
        
        Returns:
            dict or None: The current featuredUpdate, or None if not set
        """
        try:
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            figure_doc = figure_ref.get()
            
            if not figure_doc.exists:
                return None
            
            figure_data = figure_doc.to_dict()
            return figure_data.get('featuredUpdate')
            
        except Exception as e:
            print(f"   ⚠️ Error getting current featured update for {figure_id}: {e}")
            return None
    
    async def compact_description(self, description: str) -> str:
        """
        Uses AI to create a concise version of the event point description.

        Args:
            description: Original description

        Returns:
            Compacted description (max ~150 characters)
        """
        # If already short enough, return as-is
        if len(description) <= self.MAX_DESCRIPTION_LENGTH:
            return description

        system_prompt = """You are an expert at creating concise, engaging news headlines and descriptions.
Your task is to condense event descriptions into short, punchy summaries that capture the key information.

Rules:
1. Maximum 150 characters
2. Focus on WHO, WHAT, WHEN
3. Remove unnecessary details
4. Keep specific dates, names, locations
5. Use active voice
6. Make it engaging and newsworthy"""

        user_prompt = f"""Condense this event description to maximum 150 characters while keeping the key information:

Original: "{description}"

Create a short, engaging summary that captures the essence of what happened."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )

            compacted = response.choices[0].message.content.strip()

            # Remove quotes if AI added them
            if compacted.startswith('"') and compacted.endswith('"'):
                compacted = compacted[1:-1]
            if compacted.startswith("'") and compacted.endswith("'"):
                compacted = compacted[1:-1]

            # Ensure it's not too long
            if len(compacted) > self.MAX_DESCRIPTION_LENGTH:
                compacted = compacted[:self.MAX_DESCRIPTION_LENGTH-3] + "..."

            if self.verbose:
                print(f"      Compacted description: {len(description)} → {len(compacted)} chars")

            return compacted

        except Exception as e:
            print(f"      ⚠️ Error during AI compaction: {e}")
            # Fallback: simple truncation
            if len(description) > self.MAX_DESCRIPTION_LENGTH:
                return description[:self.MAX_DESCRIPTION_LENGTH-3] + "..."
            return description

    def should_update(self, current_featured_update, new_update):
        """
        Determine if the featuredUpdate should be replaced with new_update.

        Args:
            current_featured_update: The current featuredUpdate in the figure doc
            new_update: The new update from recent-updates collection

        Returns:
            bool: True if should update, False otherwise
        """
        # If force flag is set, always update
        if self.force:
            return True

        # If no current featured update exists, update
        if not current_featured_update:
            return True

        # Compare timestamps
        try:
            current_timestamp = current_featured_update.get('lastUpdated')
            new_timestamp = new_update.get('lastUpdated')

            # If either timestamp is missing, update
            if not current_timestamp or not new_timestamp:
                return True

            # Update if new timestamp is more recent
            return new_timestamp > current_timestamp

        except Exception as e:
            if self.verbose:
                print(f"      Error comparing timestamps: {e}")
            # On error, don't update to be safe
            return False
    
    async def create_featured_update_object(self, update_data):
        """
        Transform a recent-updates document into a featuredUpdate object.
        Compacts the eventPointDescription if it's too long.

        Args:
            update_data: Dictionary from recent-updates collection

        Returns:
            dict: Formatted featuredUpdate object with compacted description
        """
        if not update_data:
            return None

        # Get the original description
        description = update_data.get('eventPointDescription', '')

        # Compact the description if needed
        if description:
            compacted_description = await self.compact_description(description)
        else:
            compacted_description = description

        return {
            'eventTitle': update_data.get('eventTitle', ''),
            'eventSummary': update_data.get('eventSummary', ''),
            'eventPointDescription': compacted_description,
            'lastUpdated': update_data.get('lastUpdated'),
            'mainCategory': update_data.get('mainCategory', ''),
            'subcategory': update_data.get('subcategory', ''),
            'eventPointDate': update_data.get('eventPointDate', ''),
            'publishDate': update_data.get('publishDate', '')
        }
    
    def update_figure_featured_update(self, figure_id, featured_update_data, dry_run=False):
        """
        Update the figure document with featuredUpdate field.
        
        Args:
            figure_id: The figure document ID
            featured_update_data: The featured update object to store
            dry_run: If True, don't actually write to Firestore
            
        Returns:
            bool: True if successful, False otherwise
        """
        if dry_run:
            return True
        
        try:
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            
            # Update the document with the featuredUpdate field
            figure_ref.update({
                'featuredUpdate': featured_update_data
            })
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error updating figure {figure_id}: {e}")
            return False
    
    async def process_single_figure(self, figure_id, dry_run=False):
        """Process a single figure: check if update is needed and update if necessary."""
        if self.verbose:
            print(f"\n📊 Processing: {figure_id}")

        # Get the current featured update
        current_featured_update = self.get_current_featured_update(figure_id)

        # Get the latest update from recent-updates
        latest_update = self.get_latest_update_for_figure(figure_id)

        if not latest_update:
            print(f"   ⚠️ {figure_id}: No updates available - skipping")
            return {
                'figure_id': figure_id,
                'success': False,
                'action': 'no_updates'
            }

        # Check if update is needed
        if not self.should_update(current_featured_update, latest_update):
            if self.verbose:
                print(f"   → {figure_id}: Current featured update is already up to date - skipping")
            return {
                'figure_id': figure_id,
                'success': True,
                'action': 'skipped_already_current'
            }

        # Create the featured update object (with compacted description)
        featured_update = await self.create_featured_update_object(latest_update)

        # Update the figure document
        success = self.update_figure_featured_update(figure_id, featured_update, dry_run)

        # Display results
        if success:
            result_symbol = "✓" if not dry_run else "🔍"
            event_title = featured_update.get('eventTitle', 'Unknown')[:50]
            print(f"   {result_symbol} {figure_id}: Updated to '{event_title}...'")

        return {
            'figure_id': figure_id,
            'success': success,
            'action': 'updated',
            'featured_update': featured_update
        }
    
    async def process_all_figures(self, dry_run=False):
        """Process all figures in the selected-figures collection."""
        print("\n" + "="*60)
        print("FEATURED UPDATE REFRESH")
        print("="*60)

        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to Firestore\n")

        if self.force:
            print("⚠️ FORCE MODE - Will update all figures regardless of timestamps\n")

        # Get all figures
        try:
            figures_ref = self.db.collection('selected-figures')
            figures = list(figures_ref.stream())
            total_figures = len(figures)

            print(f"\n📊 Processing {total_figures} figures...\n")

        except Exception as e:
            print(f"❌ Error fetching figures: {e}")
            return

        # Process each figure
        results = []
        updated_count = 0
        skipped_count = 0
        no_updates_count = 0
        failed_count = 0

        for idx, figure_doc in enumerate(figures, 1):
            figure_id = figure_doc.id

            # Progress indicator
            if not self.verbose and idx % 10 == 0:
                print(f"   Progress: {idx}/{total_figures} figures processed...")

            # Process the figure
            result = await self.process_single_figure(figure_id, dry_run)
            results.append(result)

            # Categorize result
            if result['action'] == 'updated':
                updated_count += 1
            elif result['action'] == 'skipped_already_current':
                skipped_count += 1
            elif result['action'] == 'no_updates':
                no_updates_count += 1
            elif not result['success']:
                failed_count += 1

        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Figures: {total_figures}")
        print(f"Updated: {updated_count}")
        print(f"Skipped (Already Current): {skipped_count}")
        print(f"No Updates Available: {no_updates_count}")
        print(f"Failed: {failed_count}")

        if dry_run:
            print("\n🔍 DRY RUN - No data was written to Firestore")
            print("   Run without --dry-run to save these values")
        else:
            print("\n✅ Featured updates refreshed successfully!")

        print("\n" + "="*60 + "\n")

        return results
    
    async def run(self, figure_id=None, dry_run=False):
        """Execute the update process."""
        if figure_id:
            # Process single figure
            print("\n" + "="*60)
            print(f"UPDATING FEATURED UPDATE FOR: {figure_id}")
            print("="*60)

            if dry_run:
                print("🔍 DRY RUN MODE - No data will be written to Firestore\n")

            if self.force:
                print("⚠️ FORCE MODE - Will update regardless of timestamps\n")

            result = await self.process_single_figure(figure_id, dry_run)

            print("\n" + "="*60)
            print("RESULT")
            print("="*60)
            print(f"Figure: {result['figure_id']}")
            print(f"Action: {result['action']}")
            print(f"Status: {'✓ Success' if result['success'] else '❌ Failed'}")

            if result.get('featured_update'):
                update = result['featured_update']
                print(f"\nFeatured Update:")
                print(f"  Title: {update.get('eventTitle', 'N/A')}")
                print(f"  Date: {update.get('eventPointDate', 'N/A')}")
                print(f"  Category: {update.get('mainCategory', 'N/A')} > {update.get('subcategory', 'N/A')}")

            if dry_run:
                print("\n🔍 DRY RUN - No data was written to Firestore")

            print("\n" + "="*60 + "\n")
        else:
            # Process all figures
            await self.process_all_figures(dry_run)


async def main():
    """Parse arguments and run the updater."""
    parser = argparse.ArgumentParser(
        description="Update featuredUpdate field for figures in Firestore",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview updates for all figures without writing
  python update_featured_updates.py --dry-run

  # Update featured updates for all figures
  python update_featured_updates.py

  # Update for a specific figure
  python update_featured_updates.py --figure "iu(leejieun)"

  # Force update all figures (ignore timestamps)
  python update_featured_updates.py --force

  # Verbose mode with detailed progress
  python update_featured_updates.py --verbose

  # Dry run for a specific figure with verbose output
  python update_featured_updates.py --figure "iu(leejieun)" --dry-run --verbose
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview updates without writing to Firestore'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed progress for each figure'
    )

    parser.add_argument(
        '--figure',
        type=str,
        help='Process only a specific figure by ID'
    )

    parser.add_argument(
        '--force',
        action='store_true',
        help='Force update even if current featuredUpdate is newer'
    )

    args = parser.parse_args()

    # Run the updater
    updater = FeaturedUpdateUpdater(verbose=args.verbose, force=args.force)
    await updater.run(figure_id=args.figure, dry_run=args.dry_run)

    # Close the async client
    await updater.news_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
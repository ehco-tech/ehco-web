"""
One-time script to compact existing featuredUpdate.eventPointDescription fields.

This script goes through all documents in the 'selected-figures' collection,
checks the 'featuredUpdate.eventPointDescription' field, and compacts it if it's too long.

This is a ONE-TIME cleanup script for existing data. Future updates will be compacted
automatically by UPDATE_figure_updates.py.

Usage:
    python ONETIME_compact_featured_updates.py --dry-run  # Preview changes
    python ONETIME_compact_featured_updates.py            # Actually update
    python ONETIME_compact_featured_updates.py --verbose  # Detailed output
    python ONETIME_compact_featured_updates.py --force    # Re-compact already compacted ones
"""

import asyncio
import argparse
from firebase_admin import firestore
from setup_firebase_deepseek import NewsManager


class FeaturedUpdateCompactor:
    MAX_DESCRIPTION_LENGTH = 200  # Target length for eventPointDescription

    def __init__(self, verbose=False, force=False):
        """Initialize the compactor."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.client = self.news_manager.client
        self.model = self.news_manager.model
        self.verbose = verbose
        self.force = force
        print("✓ FeaturedUpdateCompactor initialized")

    async def compact_description(self, description: str) -> str:
        """
        Uses AI to create a concise version of the event point description.

        Args:
            description: Original description

        Returns:
            Compacted description (max ~200 characters)
        """
        # If already short enough, return as-is
        if len(description) <= self.MAX_DESCRIPTION_LENGTH:
            return description

        system_prompt = """You are an expert at creating concise, engaging news headlines and descriptions.
Your task is to condense event descriptions into short, punchy summaries that capture the key information.

Rules:
1. Maximum 200 characters
2. Focus on WHO, WHAT, WHEN
3. Remove unnecessary details
4. Keep specific dates, names, locations
5. Use active voice
6. Make it engaging and newsworthy"""

        user_prompt = f"""Condense this event description to maximum 200 characters while keeping the key information:

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
                print(f"      Compacted: {len(description)} → {len(compacted)} chars")

            return compacted

        except Exception as e:
            print(f"      ⚠️ Error during AI compaction: {e}")
            # Fallback: simple truncation
            if len(description) > self.MAX_DESCRIPTION_LENGTH:
                return description[:self.MAX_DESCRIPTION_LENGTH-3] + "..."
            return description

    async def process_figure(self, figure_doc, dry_run=False):
        """
        Process a single figure document.

        Args:
            figure_doc: Firestore document snapshot
            dry_run: If True, don't actually write to database

        Returns:
            dict with processing results
        """
        figure_id = figure_doc.id
        figure_data = figure_doc.to_dict()

        if self.verbose:
            print(f"\n📊 Processing: {figure_id}")

        # Check if featuredUpdate exists
        featured_update = figure_data.get('featuredUpdate')
        if not featured_update:
            if self.verbose:
                print(f"   → No featuredUpdate field found - skipping")
            return {
                'figure_id': figure_id,
                'action': 'skipped_no_featured_update',
                'success': True
            }

        # Get the eventPointDescription
        description = featured_update.get('eventPointDescription', '')
        if not description:
            if self.verbose:
                print(f"   → No eventPointDescription found - skipping")
            return {
                'figure_id': figure_id,
                'action': 'skipped_no_description',
                'success': True
            }

        # Check if already compacted (unless force flag is set)
        is_compacted = featured_update.get('isDescriptionCompacted', False)
        if is_compacted and not self.force:
            if self.verbose:
                print(f"   → Already compacted - skipping")
            return {
                'figure_id': figure_id,
                'action': 'skipped_already_compacted',
                'success': True
            }

        # Check if description needs compacting
        if len(description) <= self.MAX_DESCRIPTION_LENGTH and not self.force:
            if self.verbose:
                print(f"   → Description already short enough ({len(description)} chars) - marking as compacted")

            if not dry_run:
                try:
                    # Just mark it as compacted
                    figure_doc.reference.update({
                        'featuredUpdate.isDescriptionCompacted': True,
                        'featuredUpdate.descriptionCompactedAt': firestore.SERVER_TIMESTAMP
                    })
                except Exception as e:
                    print(f"   ❌ Error updating document: {e}")
                    return {
                        'figure_id': figure_id,
                        'action': 'failed',
                        'success': False
                    }

            return {
                'figure_id': figure_id,
                'action': 'marked_compacted',
                'success': True
            }

        # Need to compact the description
        if self.verbose:
            print(f"   → Compacting description ({len(description)} chars):")
            print(f"      Original: {description[:80]}...")

        compacted_description = await self.compact_description(description)

        if self.verbose:
            print(f"      Compacted: {compacted_description}")

        # Update the database
        if not dry_run:
            try:
                figure_doc.reference.update({
                    'featuredUpdate.eventPointDescription': compacted_description,
                    'featuredUpdate.originalEventPointDescription': description,
                    'featuredUpdate.isDescriptionCompacted': True,
                    'featuredUpdate.descriptionCompactedAt': firestore.SERVER_TIMESTAMP
                })
                print(f"   ✓ {figure_id}: Compacted and updated")
            except Exception as e:
                print(f"   ❌ Error updating {figure_id}: {e}")
                return {
                    'figure_id': figure_id,
                    'action': 'failed',
                    'success': False
                }
        else:
            print(f"   🔍 {figure_id}: Would compact description")

        return {
            'figure_id': figure_id,
            'action': 'compacted',
            'success': True,
            'original_length': len(description),
            'compacted_length': len(compacted_description)
        }

    async def process_all_figures(self, dry_run=False):
        """Process all figures in the selected-figures collection."""
        print("\n" + "="*60)
        print("FEATURED UPDATE DESCRIPTION COMPACTION")
        print("ONE-TIME CLEANUP SCRIPT")
        print("="*60)

        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to Firestore\n")

        if self.force:
            print("⚠️ FORCE MODE - Will re-compact already compacted entries\n")

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
        results = {
            'compacted': 0,
            'marked_compacted': 0,
            'skipped_no_featured_update': 0,
            'skipped_no_description': 0,
            'skipped_already_compacted': 0,
            'failed': 0
        }

        for idx, figure_doc in enumerate(figures, 1):
            # Progress indicator
            if not self.verbose and idx % 10 == 0:
                print(f"   Progress: {idx}/{total_figures} figures processed...")

            # Process the figure
            result = await self.process_figure(figure_doc, dry_run)
            action = result['action']
            results[action] = results.get(action, 0) + 1

        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Figures: {total_figures}")
        print(f"Compacted: {results['compacted']}")
        print(f"Marked as Compacted (already short): {results['marked_compacted']}")
        print(f"Skipped (No featuredUpdate): {results['skipped_no_featured_update']}")
        print(f"Skipped (No description): {results['skipped_no_description']}")
        print(f"Skipped (Already compacted): {results['skipped_already_compacted']}")
        print(f"Failed: {results['failed']}")

        if dry_run:
            print("\n🔍 DRY RUN - No data was written to Firestore")
            print("   Run without --dry-run to apply these changes")
        else:
            print("\n✅ Compaction complete!")

        print("\n" + "="*60 + "\n")

        return results


async def main():
    """Parse arguments and run the compactor."""
    parser = argparse.ArgumentParser(
        description="One-time script to compact existing featuredUpdate.eventPointDescription fields",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview what would be compacted (recommended first run)
  python ONETIME_compact_featured_updates.py --dry-run

  # Actually compact the descriptions
  python ONETIME_compact_featured_updates.py

  # Verbose mode with detailed output
  python ONETIME_compact_featured_updates.py --verbose --dry-run

  # Force re-compact already compacted entries
  python ONETIME_compact_featured_updates.py --force
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without writing to Firestore'
    )

    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed progress for each figure'
    )

    parser.add_argument(
        '--force',
        action='store_true',
        help='Re-compact already compacted entries'
    )

    args = parser.parse_args()

    # Run the compactor
    compactor = FeaturedUpdateCompactor(verbose=args.verbose, force=args.force)
    await compactor.process_all_figures(dry_run=args.dry_run)

    # Close the async client
    await compactor.news_manager.close()


if __name__ == "__main__":
    asyncio.run(main())

"""
One-time script to initialize the stats/counters document in Firestore.

This script:
1. Counts all documents in the 'selected-figures' collection (totalFigures)
2. Counts all timeline points across all figures' curated-timeline subcollections (totalFacts)
3. Creates/updates the 'stats/counters' document with these values

Usage:
    python initialize_stats_counters.py
    
    Optional flags:
    --dry-run    : Preview counts without writing to Firestore
    --verbose    : Show detailed progress for each figure
"""

import argparse
from firebase_admin import firestore
from setup_firebase_deepseek import NewsManager
from datetime import datetime

class StatsInitializer:
    def __init__(self, verbose=False):
        """Initialize the stats counter setup."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.verbose = verbose
        print("✓ StatsInitializer ready")
    
    def count_figures(self):
        """Count total number of documents in selected-figures collection."""
        try:
            figures_ref = self.db.collection('selected-figures')
            figures = list(figures_ref.stream())
            count = len(figures)
            print(f"\n📊 Counting Figures...")
            print(f"   Total Figures: {count}")
            return count, [doc.id for doc in figures]
        except Exception as e:
            print(f"❌ Error counting figures: {e}")
            raise
    
    def count_timeline_points_for_figure(self, figure_id):
        """
        Count all timeline points in a single figure's curated-timeline subcollection.
        
        Structure:
        selected-figures/{figureId}/curated-timeline/{mainCategory}
            └── {subcategory}: [
                    {
                        event_title: "...",
                        event_summary: "...",
                        timeline_points: [
                            { date: "...", description: "...", sourceIds: [...] }
                        ]
                    }
                ]
        """
        total_points = 0
        
        try:
            # Get all main category documents in curated-timeline
            timeline_ref = self.db.collection('selected-figures').document(figure_id).collection('curated-timeline')
            main_category_docs = list(timeline_ref.stream())
            
            for main_cat_doc in main_category_docs:
                main_cat_data = main_cat_doc.to_dict()
                
                # Each field in the document represents a subcategory
                # e.g., "Music", "Film & TV", etc.
                for subcategory, event_groups in main_cat_data.items():
                    if not isinstance(event_groups, list):
                        continue
                    
                    # Each event group has a timeline_points array
                    for event_group in event_groups:
                        timeline_points = event_group.get('timeline_points', [])
                        points_count = len(timeline_points)
                        total_points += points_count
                        
                        if self.verbose and points_count > 0:
                            event_title = event_group.get('event_title', 'Untitled')
                            print(f"      [{main_cat_doc.id}] > [{subcategory}] > {event_title}: {points_count} points")
            
            return total_points
            
        except Exception as e:
            print(f"   ⚠️ Error counting timeline points for {figure_id}: {e}")
            return 0
    
    def count_all_timeline_points(self, figure_ids):
        """Count timeline points across all figures."""
        print(f"\n📊 Counting Timeline Points (Facts)...")
        print(f"   Processing {len(figure_ids)} figures...\n")
        
        total_facts = 0
        
        for idx, figure_id in enumerate(figure_ids, 1):
            if self.verbose:
                print(f"   [{idx}/{len(figure_ids)}] Processing: {figure_id}")
            
            figure_points = self.count_timeline_points_for_figure(figure_id)
            total_facts += figure_points
            
            if self.verbose:
                print(f"      Subtotal: {figure_points} points")
            elif idx % 50 == 0:  # Progress indicator for non-verbose mode
                print(f"   Progress: {idx}/{len(figure_ids)} figures processed ({total_facts} facts so far)")
        
        print(f"\n   ✓ Total Facts (Timeline Points): {total_facts:,}")
        return total_facts
    
    def write_counters_to_firestore(self, total_figures, total_facts):
        """Write the counter values to stats/counters document."""
        try:
            stats_ref = self.db.collection('stats').document('counters')
            
            counter_data = {
                'totalFigures': total_figures,
                'totalFacts': total_facts,
                'lastUpdated': firestore.SERVER_TIMESTAMP,
                'initializedAt': firestore.SERVER_TIMESTAMP
            }
            
            # Check if document exists
            doc = stats_ref.get()
            if doc.exists:
                print(f"\n⚠️  Warning: stats/counters document already exists")
                print(f"   Current values: {doc.to_dict()}")
                confirm = input("\n   Overwrite existing counters? (yes/no): ")
                if confirm.lower() != 'yes':
                    print("   ❌ Aborted. Counters not updated.")
                    return False
            
            # Write to Firestore
            stats_ref.set(counter_data)
            print(f"\n✅ Successfully wrote counters to Firestore!")
            print(f"   Location: stats/counters")
            print(f"   Total Figures: {total_figures:,}")
            print(f"   Total Facts: {total_facts:,}")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error writing to Firestore: {e}")
            raise
    
    def run(self, dry_run=False):
        """Execute the full initialization process."""
        print("\n" + "="*60)
        print("STATS COUNTER INITIALIZATION")
        print("="*60)
        
        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to Firestore\n")
        
        # Step 1: Count figures
        total_figures, figure_ids = self.count_figures()
        
        # Step 2: Count timeline points
        total_facts = self.count_all_timeline_points(figure_ids)
        
        # Step 3: Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Figures: {total_figures:,}")
        print(f"Total Facts:   {total_facts:,}")
        print(f"Average Facts per Figure: {total_facts / total_figures:.1f}" if total_figures > 0 else "N/A")
        
        # Step 4: Write to Firestore (unless dry run)
        if dry_run:
            print("\n🔍 DRY RUN - Skipping Firestore write")
            print("   Run without --dry-run to save these values")
        else:
            self.write_counters_to_firestore(total_figures, total_facts)
        
        print("\n" + "="*60 + "\n")


def main():
    """Parse arguments and run the initialization."""
    parser = argparse.ArgumentParser(
        description="Initialize stats counters in Firestore",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview counts without writing
  python initialize_stats_counters.py --dry-run
  
  # Initialize counters (writes to Firestore)
  python initialize_stats_counters.py
  
  # Verbose mode with detailed progress
  python initialize_stats_counters.py --verbose
        """
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview counts without writing to Firestore'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed progress for each figure'
    )
    
    args = parser.parse_args()
    
    # Run the initialization
    initializer = StatsInitializer(verbose=args.verbose)
    initializer.run(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
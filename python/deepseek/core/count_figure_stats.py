"""
Script to count and update per-figure statistics in Firestore.

This script:
1. Iterates through all documents in 'selected-figures' collection
2. For each figure:
   - Counts timeline points (facts) in curated-timeline subcollection
   - Counts documents (sources) in article-summaries subcollection
3. Updates each figure document with a 'stats' field containing the counts

Usage:
    python update_figure_stats.py
    
    Optional flags:
    --dry-run    : Preview counts without writing to Firestore
    --verbose    : Show detailed progress for each figure
    --figure     : Process only a specific figure by ID
"""

import argparse
from firebase_admin import firestore
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utilities.setup_firebase_deepseek import NewsManager
from datetime import datetime

class FigureStatsUpdater:
    def __init__(self, verbose=False):
        """Initialize the figure stats updater."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.verbose = verbose
        print("✓ FigureStatsUpdater ready")
    
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
    
    def count_sources_for_figure(self, figure_id):
        """
        Count the number of documents in the article-summaries subcollection.
        
        Structure:
        selected-figures/{figureId}/article-summaries/{sourceId}
        """
        try:
            sources_ref = self.db.collection('selected-figures').document(figure_id).collection('article-summaries')
            sources = list(sources_ref.stream())
            count = len(sources)
            
            if self.verbose:
                print(f"      Sources: {count} documents in article-summaries")
            
            return count
            
        except Exception as e:
            print(f"   ⚠️ Error counting sources for {figure_id}: {e}")
            return 0
    
    def update_figure_stats(self, figure_id, total_facts, total_sources, dry_run=False):
        """
        Update the figure document with stats field.
        
        Updates:
        selected-figures/{figureId}
        {
            // ... existing fields
            stats: {
                totalFacts: number,
                totalSources: number,
                lastUpdated: Timestamp,
                lastCalculated: Timestamp
            }
        }
        """
        if dry_run:
            return True
        
        try:
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            
            stats_data = {
                'stats': {
                    'totalFacts': total_facts,
                    'totalSources': total_sources,
                    'lastUpdated': firestore.SERVER_TIMESTAMP,
                    'lastCalculated': firestore.SERVER_TIMESTAMP
                }
            }
            
            # Update the document (merge to keep existing fields)
            figure_ref.update(stats_data)
            
            return True
            
        except Exception as e:
            print(f"   ❌ Error updating stats for {figure_id}: {e}")
            return False
    
    def process_single_figure(self, figure_id, dry_run=False):
        """Process a single figure: count stats and update document."""
        if self.verbose:
            print(f"\n📊 Processing: {figure_id}")
        
        # Count facts (timeline points)
        total_facts = self.count_timeline_points_for_figure(figure_id)
        
        # Count sources (article-summaries documents)
        total_sources = self.count_sources_for_figure(figure_id)
        
        # Update the figure document
        success = self.update_figure_stats(figure_id, total_facts, total_sources, dry_run)
        
        # Display results
        result_symbol = "✓" if success else "❌"
        print(f"   {result_symbol} {figure_id}: {total_facts} facts, {total_sources} sources")
        
        return {
            'figure_id': figure_id,
            'total_facts': total_facts,
            'total_sources': total_sources,
            'success': success
        }
    
    def process_all_figures(self, dry_run=False):
        """Process all figures in the selected-figures collection."""
        print("\n" + "="*60)
        print("FIGURE STATS UPDATE")
        print("="*60)
        
        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to Firestore\n")
        
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
        success_count = 0
        total_all_facts = 0
        total_all_sources = 0
        
        for idx, figure_doc in enumerate(figures, 1):
            figure_id = figure_doc.id
            
            # Progress indicator
            if not self.verbose and idx % 10 == 0:
                print(f"   Progress: {idx}/{total_figures} figures processed...")
            
            # Process the figure
            result = self.process_single_figure(figure_id, dry_run)
            results.append(result)
            
            if result['success']:
                success_count += 1
            
            total_all_facts += result['total_facts']
            total_all_sources += result['total_sources']
        
        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Figures Processed: {total_figures}")
        print(f"Successfully Updated: {success_count}")
        print(f"Failed: {total_figures - success_count}")
        print(f"\nAggregate Counts:")
        print(f"  Total Facts: {total_all_facts:,}")
        print(f"  Total Sources: {total_all_sources:,}")
        print(f"  Avg Facts per Figure: {total_all_facts / total_figures:.1f}" if total_figures > 0 else "N/A")
        print(f"  Avg Sources per Figure: {total_all_sources / total_figures:.1f}" if total_figures > 0 else "N/A")
        
        if dry_run:
            print("\n🔍 DRY RUN - No data was written to Firestore")
            print("   Run without --dry-run to save these values")
        else:
            print("\n✅ Stats updated successfully!")
        
        print("\n" + "="*60 + "\n")
        
        return results
    
    def run(self, figure_id=None, dry_run=False):
        """Execute the stats update process."""
        if figure_id:
            # Process single figure
            print("\n" + "="*60)
            print(f"UPDATING STATS FOR FIGURE: {figure_id}")
            print("="*60)
            
            if dry_run:
                print("🔍 DRY RUN MODE - No data will be written to Firestore\n")
            
            result = self.process_single_figure(figure_id, dry_run)
            
            print("\n" + "="*60)
            print("RESULT")
            print("="*60)
            print(f"Figure: {result['figure_id']}")
            print(f"Facts: {result['total_facts']}")
            print(f"Sources: {result['total_sources']}")
            print(f"Status: {'✓ Success' if result['success'] else '❌ Failed'}")
            
            if dry_run:
                print("\n🔍 DRY RUN - No data was written to Firestore")
            
            print("\n" + "="*60 + "\n")
        else:
            # Process all figures
            self.process_all_figures(dry_run)


def main():
    """Parse arguments and run the stats updater."""
    parser = argparse.ArgumentParser(
        description="Update per-figure statistics in Firestore",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview counts for all figures without writing
  python update_figure_stats.py --dry-run
  
  # Update stats for all figures
  python update_figure_stats.py
  
  # Update stats for a specific figure
  python update_figure_stats.py --figure "john-doe"
  
  # Verbose mode with detailed progress
  python update_figure_stats.py --verbose
  
  # Dry run for a specific figure with verbose output
  python update_figure_stats.py --figure "john-doe" --dry-run --verbose
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
    
    parser.add_argument(
        '--figure',
        type=str,
        help='Process only a specific figure by ID'
    )
    
    args = parser.parse_args()
    
    # Run the updater
    updater = FigureStatsUpdater(verbose=args.verbose)
    updater.run(figure_id=args.figure, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
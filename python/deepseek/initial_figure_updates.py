"""
One-time script to initialize the featuredUpdate field for all figures.

This script:
1. Iterates through all documents in 'selected-figures' collection
2. For each figure, crawls through the entire 'curated-timeline' subcollection
3. Finds the most recent timeline point by event date
4. Adds a 'featuredUpdate' field to the figure document with this latest event

NOTE: This is a slow process (crawls all timeline data) but only runs once.
      After initialization, use update_featured_updates.py for fast updates.

Usage:
    python initialize_featured_updates.py
    
    Optional flags:
    --dry-run    : Preview updates without writing to Firestore
    --verbose    : Show detailed progress for each figure
    --figure     : Process only a specific figure by ID
"""

import argparse
from firebase_admin import firestore
from setup_firebase_deepseek import NewsManager
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

class FeaturedUpdateInitializer:
    def __init__(self, verbose=False):
        """Initialize the featured update initializer."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.verbose = verbose
        print("✓ FeaturedUpdateInitializer ready")
    
    def get_all_timeline_points_for_figure(self, figure_id: str) -> List[Dict[str, Any]]:
        """
        Crawl through the entire curated-timeline subcollection and collect all timeline points.
        
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
        
        Returns:
            List of dictionaries, each containing:
            - timeline_point (the actual point data)
            - event_title
            - event_summary
            - main_category
            - subcategory
        """
        all_points = []
        
        try:
            # Get all main category documents in curated-timeline
            timeline_ref = self.db.collection('selected-figures').document(figure_id).collection('curated-timeline')
            main_category_docs = list(timeline_ref.stream())
            
            if self.verbose:
                print(f"      Found {len(main_category_docs)} main categories")
            
            for main_cat_doc in main_category_docs:
                main_category = main_cat_doc.id
                main_cat_data = main_cat_doc.to_dict()
                
                if not main_cat_data:
                    continue
                
                # Each field in the document represents a subcategory
                for subcategory, event_groups in main_cat_data.items():
                    if not isinstance(event_groups, list):
                        continue
                    
                    # Each event group has timeline_points
                    for event_group in event_groups:
                        event_title = event_group.get('event_title', '')
                        event_summary = event_group.get('event_summary', '')
                        timeline_points = event_group.get('timeline_points', [])
                        
                        # Collect each timeline point with its context
                        for point in timeline_points:
                            point_date = point.get('date')
                            point_description = point.get('description', '')
                            
                            if not point_date or not point_description:
                                continue
                            
                            all_points.append({
                                'timeline_point': point,
                                'event_title': event_title,
                                'event_summary': event_summary,
                                'main_category': main_category,
                                'subcategory': subcategory,
                                'point_date': point_date,
                                'point_description': point_description
                            })
            
            if self.verbose:
                print(f"      Collected {len(all_points)} total timeline points")
            
            return all_points
            
        except Exception as e:
            print(f"   ⚠️ Error collecting timeline points for {figure_id}: {e}")
            return []
    
    def find_most_recent_timeline_point(self, all_points: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Find the most recent timeline point by date.
        
        Args:
            all_points: List of timeline point dictionaries
            
        Returns:
            The most recent timeline point with its context, or None if no points
        """
        if not all_points:
            return None
        
        try:
            # Sort by date (most recent first)
            # Dates are in format YYYY-MM-DD, so string sorting works
            sorted_points = sorted(all_points, key=lambda x: x['point_date'], reverse=True)
            
            most_recent = sorted_points[0]
            
            if self.verbose:
                print(f"      Most recent point: {most_recent['event_title'][:50]}...")
                print(f"      Date: {most_recent['point_date']}")
                print(f"      Category: {most_recent['main_category']} > {most_recent['subcategory']}")
            
            return most_recent
            
        except Exception as e:
            print(f"   ⚠️ Error finding most recent point: {e}")
            return None
    
    def create_featured_update_object(self, timeline_point_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform a timeline point with context into a featuredUpdate object.
        
        Args:
            timeline_point_data: Dictionary containing timeline point and its context
            
        Returns:
            dict: Formatted featuredUpdate object
        """
        if not timeline_point_data:
            return None
        
        try:
            # Use Firestore server timestamp for lastUpdated
            from firebase_admin import firestore
            
            return {
                'eventTitle': timeline_point_data.get('event_title', ''),
                'eventSummary': timeline_point_data.get('event_summary', ''),
                'eventPointDescription': timeline_point_data.get('point_description', ''),
                'eventPointDate': timeline_point_data.get('point_date', ''),
                'mainCategory': timeline_point_data.get('main_category', ''),
                'subcategory': timeline_point_data.get('subcategory', ''),
                'lastUpdated': firestore.SERVER_TIMESTAMP
            }
        except Exception as e:
            print(f"   ⚠️ Error creating featured update object: {e}")
            return None
    
    def update_figure_featured_update(self, figure_id: str, featured_update_data: Dict[str, Any], dry_run: bool = False) -> bool:
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
    
    def process_single_figure(self, figure_id: str, dry_run: bool = False) -> Dict[str, Any]:
        """Process a single figure: crawl timeline and add featuredUpdate field."""
        if self.verbose:
            print(f"\n📊 Processing: {figure_id}")
        
        # Collect all timeline points
        all_points = self.get_all_timeline_points_for_figure(figure_id)
        
        if not all_points:
            print(f"   ⚠️ {figure_id}: No timeline points found - skipping")
            return {
                'figure_id': figure_id,
                'success': False,
                'reason': 'no_timeline_points'
            }
        
        # Find the most recent one
        most_recent_point = self.find_most_recent_timeline_point(all_points)
        
        if not most_recent_point:
            print(f"   ⚠️ {figure_id}: Could not determine most recent point - skipping")
            return {
                'figure_id': figure_id,
                'success': False,
                'reason': 'no_recent_point'
            }
        
        # Create the featured update object
        featured_update = self.create_featured_update_object(most_recent_point)
        
        if not featured_update:
            print(f"   ⚠️ {figure_id}: Could not create featured update object - skipping")
            return {
                'figure_id': figure_id,
                'success': False,
                'reason': 'create_failed'
            }
        
        # Update the figure document
        success = self.update_figure_featured_update(figure_id, featured_update, dry_run)
        
        # Display results
        if success:
            result_symbol = "✓" if not dry_run else "🔍"
            event_title = featured_update.get('eventTitle', 'Unknown')[:50]
            event_date = featured_update.get('eventPointDate', 'N/A')
            print(f"   {result_symbol} {figure_id}: '{event_title}...' ({event_date})")
        
        return {
            'figure_id': figure_id,
            'success': success,
            'featured_update': featured_update,
            'total_points': len(all_points)
        }
    
    def process_all_figures(self, dry_run: bool = False) -> List[Dict[str, Any]]:
        """Process all figures in the selected-figures collection."""
        print("\n" + "="*60)
        print("FEATURED UPDATE INITIALIZATION (Timeline Crawl)")
        print("="*60)
        
        if dry_run:
            print("🔍 DRY RUN MODE - No data will be written to Firestore\n")
        
        print("⚠️  NOTE: This process crawls ALL timeline data for each figure.")
        print("    It may take several minutes depending on data volume.\n")
        
        # Get all figures
        try:
            figures_ref = self.db.collection('selected-figures')
            figures = list(figures_ref.stream())
            total_figures = len(figures)
            
            print(f"📊 Processing {total_figures} figures...\n")
            
        except Exception as e:
            print(f"❌ Error fetching figures: {e}")
            return []
        
        # Process each figure
        results = []
        success_count = 0
        no_timeline_count = 0
        failed_count = 0
        total_points_processed = 0
        
        start_time = datetime.now()
        
        for idx, figure_doc in enumerate(figures, 1):
            figure_id = figure_doc.id
            
            # Progress indicator
            if not self.verbose:
                print(f"   [{idx}/{total_figures}] Processing {figure_id}...")
            
            # Process the figure
            result = self.process_single_figure(figure_id, dry_run)
            results.append(result)
            
            # Track stats
            if result['success']:
                success_count += 1
                total_points_processed += result.get('total_points', 0)
            elif result.get('reason') == 'no_timeline_points':
                no_timeline_count += 1
            else:
                failed_count += 1
            
            # Progress update every 10 figures
            if not self.verbose and idx % 10 == 0:
                elapsed = (datetime.now() - start_time).total_seconds()
                avg_per_figure = elapsed / idx
                remaining = (total_figures - idx) * avg_per_figure
                print(f"      Progress: {idx}/{total_figures} ({int(remaining)}s remaining)")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Summary
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print(f"Total Figures: {total_figures}")
        print(f"Successfully Initialized: {success_count}")
        print(f"No Timeline Data: {no_timeline_count}")
        print(f"Failed: {failed_count}")
        print(f"\nTotal Timeline Points Processed: {total_points_processed:,}")
        print(f"Processing Time: {int(duration)}s ({duration/60:.1f} minutes)")
        print(f"Average: {duration/total_figures:.1f}s per figure")
        
        if dry_run:
            print("\n🔍 DRY RUN - No data was written to Firestore")
            print("   Run without --dry-run to save these values")
        else:
            print("\n✅ Featured updates initialized successfully!")
            print("   Use update_featured_updates.py for ongoing updates")
        
        print("\n" + "="*60 + "\n")
        
        return results
    
    def run(self, figure_id: Optional[str] = None, dry_run: bool = False):
        """Execute the initialization process."""
        if figure_id:
            # Process single figure
            print("\n" + "="*60)
            print(f"INITIALIZING FEATURED UPDATE FOR: {figure_id}")
            print("="*60)
            
            if dry_run:
                print("🔍 DRY RUN MODE - No data will be written to Firestore\n")
            
            start_time = datetime.now()
            result = self.process_single_figure(figure_id, dry_run)
            duration = (datetime.now() - start_time).total_seconds()
            
            print("\n" + "="*60)
            print("RESULT")
            print("="*60)
            print(f"Figure: {result['figure_id']}")
            print(f"Status: {'✓ Success' if result['success'] else '❌ Failed'}")
            print(f"Timeline Points Processed: {result.get('total_points', 0)}")
            print(f"Processing Time: {duration:.1f}s")
            
            if result.get('featured_update'):
                update = result['featured_update']
                print(f"\nFeatured Update:")
                print(f"  Title: {update.get('eventTitle', 'N/A')}")
                print(f"  Date: {update.get('eventPointDate', 'N/A')}")
                print(f"  Category: {update.get('mainCategory', 'N/A')} > {update.get('subcategory', 'N/A')}")
                print(f"  Description: {update.get('eventPointDescription', 'N/A')[:100]}...")
            
            if dry_run:
                print("\n🔍 DRY RUN - No data was written to Firestore")
            
            print("\n" + "="*60 + "\n")
        else:
            # Process all figures
            self.process_all_figures(dry_run)


def main():
    """Parse arguments and run the initialization."""
    parser = argparse.ArgumentParser(
        description="Initialize featuredUpdate field for figures by crawling curated-timeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview updates for all figures without writing
  python initialize_featured_updates.py --dry-run
  
  # Initialize featured updates for all figures (SLOW - crawls all timeline data)
  python initialize_featured_updates.py
  
  # Initialize for a specific figure
  python initialize_featured_updates.py --figure "iu(leejieun)"
  
  # Verbose mode with detailed progress
  python initialize_featured_updates.py --verbose
  
  # Dry run for a specific figure with verbose output
  python initialize_featured_updates.py --figure "iu(leejieun)" --dry-run --verbose

NOTE: This script crawls through ALL timeline data and may take several minutes.
      After initialization, use update_featured_updates.py for fast updates.
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
    
    args = parser.parse_args()
    
    # Run the initializer
    initializer = FeaturedUpdateInitializer(verbose=args.verbose)
    initializer.run(figure_id=args.figure, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
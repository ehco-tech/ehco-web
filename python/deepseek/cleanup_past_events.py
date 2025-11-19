import asyncio
import argparse
from datetime import datetime, timedelta
from setup_firebase_deepseek import NewsManager
from typing import Optional
from firebase_admin import firestore

class RecentUpdatesCleanup:
    """Cleans up the recent-updates collection to keep only truly recent updates."""
    
    def __init__(self, days_threshold: int = 90):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.days_threshold = days_threshold
        self.cutoff_date = datetime.now() - timedelta(days=days_threshold)
        print(f"✓ Cleanup initialized")
        print(f"✓ Will keep updates where at least one article was published in the last {days_threshold} days")
        print(f"✓ Cutoff date: {self.cutoff_date.strftime('%Y-%m-%d')} (keeping articles from this date onward)")
        print(f"✓ For October/November 2025: keeping source IDs like 'AEN202510...' and 'AEN202511...'")
    
    def parse_date(self, date_str: str) -> Optional[datetime]:
        """Parse various date formats from timeline points."""
        if not date_str:
            return None
        
        # Common formats in your data
        formats = [
            "%Y-%m-%d",
            "%B %d, %Y",  # e.g., "January 15, 2025"
            "%b %d, %Y",   # e.g., "Jan 15, 2025"
            "%Y/%m/%d",
            "%d/%m/%Y",
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        # Try to extract year at minimum
        try:
            year = int(date_str.split()[-1])
            return datetime(year, 1, 1)
        except:
            return None
    
    def extract_date_from_source_id(self, source_id: str) -> Optional[datetime]:
        """Extract date from source ID format like 'AEN20250418...'"""
        try:
            import re
            match = re.search(r'(\d{8})', source_id)
            if match:
                date_str = match.group(1)
                year = int(date_str[0:4])
                month = int(date_str[4:6])
                day = int(date_str[6:8])
                return datetime(year, month, day)
        except Exception as e:
            pass
        return None
    
    def is_recent_update(self, doc_data: dict) -> bool:
        """
        Check if a document has at least one source ID from recent months.
        Uses eventPointSourceIds to determine when articles were published.
        """
        source_ids = doc_data.get('eventPointSourceIds', [])
        
        # If no source IDs, fall back to mostRecentSourceId
        if not source_ids:
            most_recent_source_id = doc_data.get('mostRecentSourceId', '')
            if most_recent_source_id:
                source_ids = [most_recent_source_id]
        
        if not source_ids:
            return False
        
        # Check if ANY source ID is from October 2025 or later
        for source_id in source_ids:
            parsed_date = self.extract_date_from_source_id(source_id)
            if parsed_date and parsed_date >= self.cutoff_date:
                return True
        
        return False
    
    async def cleanup_with_filter(self, figure_id: Optional[str] = None, dry_run: bool = True):
        """
        Clean up old entries while keeping recent ones.
        
        Args:
            figure_id: If provided, only clean up for this figure. Otherwise clean all.
            dry_run: If True, only shows what would be deleted without actually deleting
        """
        print(f"\n{'='*60}")
        print(f"MODE: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE DELETION'}")
        print(f"{'='*60}\n")
        
        cache_ref = self.db.collection('recent-updates')
        
        # Build query based on whether figure_id is specified
        if figure_id:
            print(f"Processing figure: {figure_id}")
            query = cache_ref.where('figureId', '==', figure_id)
        else:
            print("Processing ALL figures")
            query = cache_ref
        
        all_docs = list(query.stream())
        
        to_keep = []
        to_delete = []
        
        for doc in all_docs:
            doc_data = doc.to_dict()
            doc_id = doc.id
            
            if self.is_recent_update(doc_data):
                to_keep.append(doc_id)
            else:
                to_delete.append((doc_id, doc_data))
        
        print(f"📊 Analysis Results:")
        print(f"  ✓ Documents to KEEP: {len(to_keep)}")
        print(f"  ✗ Documents to DELETE: {len(to_delete)}")
        
        if to_delete:
            print(f"\n📋 Documents that will be deleted (showing up to 20):")
            for idx, (doc_id, doc_data) in enumerate(to_delete[:20]):
                figure_id = doc_data.get('figureId', 'unknown')
                event_point_date = doc_data.get('eventPointDate', 'unknown')
                event_title = doc_data.get('eventTitle', 'Unknown')
                description = doc_data.get('eventPointDescription', '')[:50]
                source_ids = doc_data.get('eventPointSourceIds', [])
                
                # Extract dates from source IDs to show why it's being deleted
                source_dates = []
                for sid in source_ids:
                    parsed = self.extract_date_from_source_id(sid)
                    if parsed:
                        source_dates.append(parsed.strftime('%Y-%m'))
                
                source_info = ', '.join(source_dates) if source_dates else 'no dates'
                print(f"  - {figure_id} | Event: {event_point_date} | Sources: {source_info} | {event_title[:30]}... | {description}...")
            
            if len(to_delete) > 20:
                print(f"  ... and {len(to_delete) - 20} more documents")
        
        if not dry_run and to_delete:
            print(f"\n🗑️ Deleting {len(to_delete)} old documents...")
            
            # Use batch operations for efficiency
            batch = self.db.batch()
            delete_count = 0
            
            for doc_id, _ in to_delete:
                doc_ref = cache_ref.document(doc_id)
                batch.delete(doc_ref)
                delete_count += 1
                
                # Commit every 500 operations (Firestore limit)
                if delete_count % 500 == 0:
                    batch.commit()
                    print(f"  ✓ Committed batch: {delete_count} documents deleted so far...")
                    batch = self.db.batch()
            
            # Commit remaining
            if delete_count % 500 != 0:
                batch.commit()
            
            print(f"\n✅ Cleanup complete! Deleted {len(to_delete)} documents")
        elif dry_run:
            print(f"\n💡 This was a DRY RUN. Run with --execute to actually delete these documents.")
        
        await self.news_manager.close()
    
    async def clear_all(self, figure_id: Optional[str] = None, dry_run: bool = True):
        """
        Clear the entire recent-updates collection or all documents for a specific figure.
        
        Args:
            figure_id: If provided, only clear for this figure. Otherwise clear all.
            dry_run: If True, only shows what would be deleted without actually deleting
        """
        print(f"\n{'='*60}")
        print(f"MODE: CLEAR ALL - {'DRY RUN' if dry_run else 'LIVE DELETION'}")
        print(f"{'='*60}\n")
        
        cache_ref = self.db.collection('recent-updates')
        
        # Build query based on whether figure_id is specified
        if figure_id:
            print(f"Clearing all documents for figure: {figure_id}")
            query = cache_ref.where('figureId', '==', figure_id)
        else:
            print("Clearing ALL documents in recent-updates collection")
            query = cache_ref
        
        all_docs = list(query.stream())
        
        print(f"📊 Found {len(all_docs)} documents to delete")
        
        if not dry_run and all_docs:
            print(f"\n🗑️ Deleting ALL {len(all_docs)} documents...")
            
            # Use batch operations for efficiency
            batch = self.db.batch()
            delete_count = 0
            
            for doc in all_docs:
                batch.delete(doc.reference)
                delete_count += 1
                
                # Commit every 500 operations (Firestore limit)
                if delete_count % 500 == 0:
                    batch.commit()
                    print(f"  ✓ Committed batch: {delete_count} documents deleted so far...")
                    batch = self.db.batch()
            
            # Commit remaining
            if delete_count % 500 != 0:
                batch.commit()
            
            print(f"\n✅ All documents cleared! The collection will rebuild naturally as new articles are processed.")
        elif dry_run:
            print(f"\n💡 This was a DRY RUN. Run with --execute to actually clear the collection.")
        
        await self.news_manager.close()
    
    async def show_stats(self, figure_id: Optional[str] = None):
        """
        Show statistics about the recent-updates collection.
        
        Args:
            figure_id: If provided, show stats only for this figure. Otherwise show all.
        """
        print(f"\n{'='*60}")
        print(f"RECENT UPDATES STATISTICS")
        print(f"{'='*60}\n")
        
        cache_ref = self.db.collection('recent-updates')
        
        # Build query based on whether figure_id is specified
        if figure_id:
            print(f"Stats for figure: {figure_id}")
            query = cache_ref.where('figureId', '==', figure_id)
        else:
            print("Stats for ALL figures")
            query = cache_ref
        
        all_docs = list(query.stream())
        
        print(f"📊 Total documents: {len(all_docs)}")
        
        # Count by figure
        by_figure = {}
        by_source_year_month = {}
        recent_count = 0
        old_count = 0
        
        for doc in all_docs:
            doc_data = doc.to_dict()
            
            # Count by figure
            fig_id = doc_data.get('figureId', 'unknown')
            by_figure[fig_id] = by_figure.get(fig_id, 0) + 1
            
            # Count by source date (when article was published)
            source_ids = doc_data.get('eventPointSourceIds', [])
            if not source_ids:
                source_ids = [doc_data.get('mostRecentSourceId', '')]
            
            has_recent_source = False
            for source_id in source_ids:
                parsed_date = self.extract_date_from_source_id(source_id)
                if parsed_date:
                    year_month = parsed_date.strftime('%Y-%m')
                    by_source_year_month[year_month] = by_source_year_month.get(year_month, 0) + 1
                    
                    # Check if this source is recent
                    if parsed_date >= self.cutoff_date:
                        has_recent_source = True
            
            if has_recent_source:
                recent_count += 1
            else:
                old_count += 1
        
        print(f"\n📅 By Article Publish Date (Year-Month):")
        for ym in sorted(by_source_year_month.keys()):
            print(f"  {ym}: {by_source_year_month[ym]} documents")
        
        print(f"\n🎯 Recent vs Old (using {self.days_threshold} day threshold):")
        print(f"  Recent (articles from {self.cutoff_date.strftime('%Y-%m-%d')} onward): {recent_count} documents")
        print(f"  Old (all articles before cutoff): {old_count} documents")
        
        if not figure_id:
            print(f"\n👤 By Figure:")
            for fig, count in sorted(by_figure.items()):
                print(f"  {fig}: {count} documents")
        
        await self.news_manager.close()


async def main():
    """Parse arguments and run cleanup."""
    parser = argparse.ArgumentParser(
        description="Clean up the recent-updates collection by removing old entries."
    )
    parser.add_argument(
        "--figure",
        type=str,
        help="Optional: The ID of a single figure to process. If not provided, processes all figures."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=90,
        help="Keep updates from the last N days (default: 90)"
    )
    parser.add_argument(
        "--clear-all",
        action="store_true",
        help="Clear the entire collection (or all docs for a figure) instead of filtering by date"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics about the collection without making changes"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually perform the deletion (default is dry-run)"
    )
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"RECENT UPDATES CLEANUP TOOL")
    print(f"{'='*60}")
    
    cleanup = RecentUpdatesCleanup(days_threshold=args.days)
    
    if args.stats:
        await cleanup.show_stats(figure_id=args.figure)
    elif args.clear_all:
        await cleanup.clear_all(figure_id=args.figure, dry_run=not args.execute)
    else:
        await cleanup.cleanup_with_filter(figure_id=args.figure, dry_run=not args.execute)


if __name__ == "__main__":
    asyncio.run(main())
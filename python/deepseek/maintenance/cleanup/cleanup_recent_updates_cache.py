#!/usr/bin/env python3
"""
Recent Updates Cache Cleanup

Checks for and removes duplicate entries in the recent-updates collection.
Duplicates can occur if the same event was processed multiple times with
slightly different descriptions.
"""

import asyncio
import argparse
from setup_firebase_deepseek import NewsManager
from typing import List, Dict, Any
from collections import defaultdict

async def find_duplicate_cache_entries(figure_id: str = None, dry_run: bool = True):
    """Find and optionally remove duplicate entries in recent-updates cache."""
    
    manager = NewsManager()
    db = manager.db
    
    if dry_run:
        print("🔍 Running in DRY-RUN mode - no changes will be made\n")
    else:
        print("⚠️  Running in LIVE mode - duplicates will be removed\n")
    
    print("=" * 80)
    print("CHECKING RECENT-UPDATES CACHE FOR DUPLICATES")
    print("=" * 80)
    print()
    
    cache_ref = db.collection('recent-updates')
    
    # Build query
    if figure_id:
        print(f"Checking entries for figure: {figure_id}\n")
        query = cache_ref.where(field_path='figureId', op_string='==', value=figure_id)
    else:
        print(f"Checking ALL entries (all figures)\n")
        query = cache_ref
    
    # Fetch all cache entries
    all_entries = list(query.stream())
    print(f"Found {len(all_entries)} cache entries to analyze\n")
    
    if len(all_entries) == 0:
        print("No entries found!")
        await manager.close()
        return
    
    # Group entries by figure + event + date (potential duplicates)
    grouped = defaultdict(list)
    
    for entry in all_entries:
        data = entry.to_dict()
        
        # Create a key that should be unique per timeline point
        key = (
            data.get('figureId', ''),
            data.get('eventTitle', ''),
            data.get('eventPointDate', ''),
        )
        
        grouped[key].append({
            'doc_id': entry.id,
            'doc_ref': entry.reference,
            'description': data.get('eventPointDescription', ''),
            'source_ids': data.get('eventPointSourceIds', []),
            'publish_date': data.get('publishDate', ''),
            'created_at': data.get('createdAt'),
            'last_updated': data.get('lastUpdated'),
        })
    
    # Find groups with duplicates
    duplicates_found = 0
    entries_to_delete = []
    
    print("🔍 Analyzing for duplicates...\n")
    
    for key, entries in grouped.items():
        if len(entries) <= 1:
            continue
        
        figure_id_key, event_title, event_date = key
        
        # Sort by number of sources (keep the one with most sources)
        # Then by last_updated (keep most recent)
        entries_sorted = sorted(
            entries,
            key=lambda x: (
                -len(x['source_ids']),  # More sources = better (negative for descending)
                x['last_updated'] or x['created_at']  # Most recent
            ),
            reverse=True
        )
        
        # Keep the first (best) entry, mark others for deletion
        keep_entry = entries_sorted[0]
        delete_entries = entries_sorted[1:]
        
        duplicates_found += 1
        
        print(f"📋 Duplicate Group {duplicates_found}:")
        print(f"   Figure: {figure_id_key}")
        print(f"   Event: {event_title[:60]}...")
        print(f"   Date: {event_date}")
        print(f"   Found {len(entries)} entries")
        print()
        print(f"   ✓ KEEP:")
        print(f"      Description: \"{keep_entry['description'][:60]}...\"")
        print(f"      Sources: {len(keep_entry['source_ids'])} ({', '.join(keep_entry['source_ids'][:3])}...)")
        print(f"      Doc ID: {keep_entry['doc_id']}")
        print()
        
        for i, entry in enumerate(delete_entries, 1):
            print(f"   ❌ DELETE #{i}:")
            print(f"      Description: \"{entry['description'][:60]}...\"")
            print(f"      Sources: {len(entry['source_ids'])} ({', '.join(entry['source_ids'][:3]) if entry['source_ids'] else 'none'})")
            print(f"      Doc ID: {entry['doc_id']}")
            entries_to_delete.append(entry['doc_ref'])
        
        print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total cache entries:        {len(all_entries)}")
    print(f"Duplicate groups found:     {duplicates_found}")
    print(f"Entries to delete:          {len(entries_to_delete)}")
    print()
    
    if len(entries_to_delete) == 0:
        print("✅ No duplicates found! Cache is clean.")
    elif dry_run:
        print(f"⚠️  Run without --dry-run to delete {len(entries_to_delete)} duplicate entries")
    else:
        # Actually delete
        print("💾 Deleting duplicate entries...")
        
        from firebase_admin import firestore
        batch = db.batch()
        delete_count = 0
        
        for doc_ref in entries_to_delete:
            batch.delete(doc_ref)
            delete_count += 1
            
            # Commit in batches of 500 (Firestore limit)
            if delete_count % 500 == 0:
                batch.commit()
                batch = db.batch()
                print(f"  Deleted {delete_count}/{len(entries_to_delete)}...")
        
        # Commit remaining
        if delete_count % 500 != 0:
            batch.commit()
        
        print(f"✅ Successfully deleted {len(entries_to_delete)} duplicate entries!")
    
    await manager.close()


async def main():
    parser = argparse.ArgumentParser(
        description="Find and remove duplicate entries in recent-updates cache.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cleanup_recent_updates_cache.py --dry-run
  python cleanup_recent_updates_cache.py --figure newjeans --dry-run
  python cleanup_recent_updates_cache.py --figure newjeans
  python cleanup_recent_updates_cache.py  # Clean all figures
        """
    )
    
    parser.add_argument(
        '--figure',
        type=str,
        help='Process a specific figure only (e.g., "newjeans")'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without deleting anything'
    )
    
    args = parser.parse_args()
    
    await find_duplicate_cache_entries(
        figure_id=args.figure,
        dry_run=args.dry_run
    )


if __name__ == "__main__":
    asyncio.run(main())
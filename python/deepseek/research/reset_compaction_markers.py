#!/usr/bin/env python3
"""
Reset Compaction Markers Script

If compaction markers were set to True but the content wasn't actually compacted,
this script will remove those markers so compaction can run again.
"""

import asyncio
import argparse
from utilities.setup_firebase_deepseek import NewsManager

async def reset_compaction_markers(figure_id: str, dry_run: bool = True):
    """Reset all compaction markers for a figure."""
    
    manager = NewsManager()
    db = manager.db
    
    if dry_run:
        print("🔍 Running in DRY-RUN mode - no changes will be made\n")
    else:
        print("⚠️  Running in LIVE mode - markers will be removed\n")
    
    print(f"{'='*80}")
    print(f"RESETTING COMPACTION MARKERS FOR: {figure_id.upper()}")
    print(f"{'='*80}\n")
    
    timeline_ref = db.collection('selected-figures').document(figure_id).collection('curated-timeline')
    
    main_categories = [
        "Creative Works",
        "Live & Broadcast",
        "Public Relations",
        "Personal Milestones",
        "Incidents & Controversies"
    ]
    
    total_markers_removed = 0
    docs_to_update = {}
    
    for main_cat in main_categories:
        doc_ref = timeline_ref.document(main_cat)
        doc = doc_ref.get()
        
        if not doc.exists:
            continue
        
        doc_data = doc.to_dict()
        updated_doc_data = {}
        doc_changed = False
        
        for subcategory, events in doc_data.items():
            if not isinstance(events, list):
                continue
            
            updated_events = []
            
            for event in events:
                event_changed = False
                
                # Remove is_compacted_v2 from event if it exists
                if 'is_compacted_v2' in event:
                    del event['is_compacted_v2']
                    event_changed = True
                    total_markers_removed += 1
                    print(f"  Removed 'is_compacted_v2' from: {event.get('event_title', 'Untitled')[:60]}...")
                
                # Remove is_description_compacted_v2 from timeline points if they exist
                if 'timeline_points' in event:
                    for point in event['timeline_points']:
                        if 'is_description_compacted_v2' in point:
                            del point['is_description_compacted_v2']
                            event_changed = True
                            total_markers_removed += 1
                
                if event_changed:
                    doc_changed = True
                
                updated_events.append(event)
            
            updated_doc_data[subcategory] = updated_events
        
        if doc_changed:
            docs_to_update[main_cat] = updated_doc_data
    
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Total compaction markers found:  {total_markers_removed}")
    print(f"Documents to update:             {len(docs_to_update)}")
    
    if total_markers_removed == 0:
        print("\n✅ No compaction markers found! Events are ready for compaction.")
    elif dry_run:
        print(f"\n⚠️  Run without --dry-run to remove these {total_markers_removed} markers")
    else:
        # Actually update Firestore
        print("\n💾 Updating Firestore...")
        batch = db.batch()
        for main_cat_id, updated_data in docs_to_update.items():
            doc_ref = timeline_ref.document(main_cat_id)
            batch.set(doc_ref, updated_data)
        
        batch.commit()
        print(f"✅ Successfully removed {total_markers_removed} compaction markers!")
        print("\nNow you can run:")
        print(f"   python compact_event_summaries_descriptions.py {figure_id}")
    
    await manager.close()


async def main():
    parser = argparse.ArgumentParser(
        description="Reset compaction markers to allow re-compaction.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python reset_compaction_markers.py newjeans --dry-run
  python reset_compaction_markers.py newjeans
        """
    )
    
    parser.add_argument(
        'figure_id',
        type=str,
        help='Figure ID to reset markers for (e.g., "newjeans")'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without modifying database'
    )
    
    args = parser.parse_args()
    
    await reset_compaction_markers(args.figure_id, args.dry_run)


if __name__ == "__main__":
    asyncio.run(main())
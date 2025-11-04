#!/usr/bin/env python3
"""
Diagnostic script to check compaction status of timeline events.
This will show you which events have the compaction markers and which don't.
"""

import asyncio
from setup_firebase_deepseek import NewsManager

async def diagnose_compaction_status(figure_id: str):
    """Check the compaction status of all events for a figure."""
    
    manager = NewsManager()
    db = manager.db
    
    print(f"\n{'='*80}")
    print(f"COMPACTION STATUS DIAGNOSTIC FOR: {figure_id.upper()}")
    print(f"{'='*80}\n")
    
    timeline_ref = db.collection('selected-figures').document(figure_id).collection('curated-timeline')
    
    main_categories = [
        "Creative Works",
        "Live & Broadcast",
        "Public Relations",
        "Personal Milestones",
        "Incidents & Controversies"
    ]
    
    total_events = 0
    events_with_v2_marker = 0
    events_without_v2_marker = 0
    long_summaries_found = 0
    
    for main_cat in main_categories:
        doc = timeline_ref.document(main_cat).get()
        
        if not doc.exists:
            continue
        
        doc_data = doc.to_dict()
        
        for subcategory, events in doc_data.items():
            if not isinstance(events, list):
                continue
            
            for event in events:
                total_events += 1
                event_title = event.get('event_title', 'Untitled')[:60]
                event_summary = event.get('event_summary', '')
                word_count = len(event_summary.split())
                
                # Check for is_compacted_v2 marker
                has_v2_marker = event.get('is_compacted_v2', False)
                
                if has_v2_marker:
                    events_with_v2_marker += 1
                else:
                    events_without_v2_marker += 1
                
                # Check if summary is long (should be compacted)
                if word_count > 50:
                    long_summaries_found += 1
                    print(f"📋 [{main_cat}] > [{subcategory}]")
                    print(f"   Event: \"{event_title}...\"")
                    print(f"   Word count: {word_count} words")
                    print(f"   Has 'is_compacted_v2': {has_v2_marker}")
                    print(f"   Summary preview: \"{event_summary[:100]}...\"")
                    print()
    
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Total events found:                {total_events}")
    print(f"Events WITH 'is_compacted_v2':     {events_with_v2_marker}")
    print(f"Events WITHOUT 'is_compacted_v2':  {events_without_v2_marker}")
    print(f"Long summaries (>50 words):        {long_summaries_found}")
    print()
    
    if events_with_v2_marker > 0 and long_summaries_found > 0:
        print("⚠️  ISSUE DETECTED:")
        print("   Some events have 'is_compacted_v2=True' but still have long summaries!")
        print("   This means the compaction was marked as done but didn't actually work.")
        print()
        print("💡 SOLUTION:")
        print("   1. Run: python reset_compaction_markers.py newjeans")
        print("   2. Then run: python compact_event_summaries_descriptions.py newjeans")
    elif events_without_v2_marker > 0:
        print("✅ Events found that need compaction.")
        print("   Run: python compact_event_summaries_descriptions.py newjeans")
    else:
        print("✅ All events are properly compacted!")
    
    await manager.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python diagnose_compaction.py <figure_id>")
        print("Example: python diagnose_compaction.py newjeans")
        sys.exit(1)
    
    figure_id = sys.argv[1]
    asyncio.run(diagnose_compaction_status(figure_id))
#!/usr/bin/env python3
"""
Timeline Points Deduplication Script

This script finds and merges duplicate timeline_points WITHIN the same event group.
Your issue: Same event group has multiple timeline_points with identical/similar descriptions.

Usage:
    python cleanup_timeline_points.py --figure newjeans --dry-run  # Preview
    python cleanup_timeline_points.py --figure newjeans            # Apply
    python cleanup_timeline_points.py --all-figures --dry-run      # All figures preview
"""

import asyncio
import argparse
from setup_firebase_deepseek import NewsManager
import json
from typing import List, Dict, Any
from firebase_admin import firestore

class TimelinePointsDeduplicator:
    """Deduplicates timeline_points within the same event group."""
    
    def __init__(self, dry_run: bool = True):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
        self.dry_run = dry_run
        
        if dry_run:
            print("🔍 Running in DRY-RUN mode - no changes will be made")
        else:
            print("⚠️  Running in LIVE mode - changes will be saved to Firestore")
    
    async def detect_duplicate_points(self, point1_desc: str, point2_desc: str, point1_date: str, point2_date: str) -> Dict[str, Any]:
        """
        Uses AI to determine if two timeline point descriptions are duplicates.
        """
        # Quick check: if dates are different, probably not duplicates
        if point1_date != point2_date:
            return {"is_duplicate": False, "confidence": 0.0}
        
        prompt = f"""
Analyze whether these two timeline point descriptions are about the same occurrence.

Point 1 (Date: {point1_date}):
"{point1_desc}"

Point 2 (Date: {point2_date}):
"{point2_desc}"

RULES:
1. They are duplicates if they describe the EXACT same occurrence with just different wording
2. Same date + same core information = duplicate
3. Even if one has more details, if they're about the same event occurrence, they're duplicates

Respond ONLY with valid JSON:
{{
    "is_duplicate": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "brief explanation",
    "merged_description": "if duplicate, provide the better/more complete description"
}}
"""
        
        try:
            response = await self.ai_client.chat.completions.create(
                model=self.ai_model,
                messages=[
                    {"role": "system", "content": "You are an expert at identifying duplicate timeline descriptions."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"    Error in duplicate detection: {e}")
            return {"is_duplicate": False, "confidence": 0.0}
    
    async def deduplicate_timeline_points(self, timeline_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes a list of timeline_points and removes duplicates by merging their sourceIds.
        """
        if len(timeline_points) <= 1:
            return timeline_points
        
        deduplicated = []
        processed_indices = set()
        merge_count = 0
        
        for i in range(len(timeline_points)):
            if i in processed_indices:
                continue
            
            base_point = timeline_points[i]
            base_date = base_point.get('date', '')
            base_desc = base_point.get('description', '')
            base_sources = set(base_point.get('sourceIds', []))
            
            # Look for duplicates in remaining points
            duplicates_found = []
            
            for j in range(i + 1, len(timeline_points)):
                if j in processed_indices:
                    continue
                
                compare_point = timeline_points[j]
                compare_date = compare_point.get('date', '')
                compare_desc = compare_point.get('description', '')
                
                # Check if duplicate
                result = await self.detect_duplicate_points(
                    base_desc, compare_desc, base_date, compare_date
                )
                
                if result.get('is_duplicate') and result.get('confidence', 0) > 0.75:
                    duplicates_found.append((j, compare_point, result))
                    processed_indices.add(j)
            
            # Merge if duplicates found
            if duplicates_found:
                print(f"      🔗 Found {len(duplicates_found)} duplicate point(s):")
                print(f"         Base: \"{base_desc[:60]}...\"")
                
                merged_point = base_point.copy()
                
                for dup_idx, dup_point, dup_result in duplicates_found:
                    dup_desc = dup_point.get('description', '')
                    dup_sources = set(dup_point.get('sourceIds', []))
                    
                    print(f"         ↳ Duplicate: \"{dup_desc[:60]}...\"")
                    print(f"            Confidence: {dup_result.get('confidence', 0):.2f}")
                    
                    # Merge sources
                    base_sources.update(dup_sources)
                    
                    # Use better description if AI suggested one
                    suggested_desc = dup_result.get('merged_description')
                    if suggested_desc and len(suggested_desc) > len(merged_point.get('description', '')):
                        merged_point['description'] = suggested_desc
                
                merged_point['sourceIds'] = sorted(list(base_sources))
                deduplicated.append(merged_point)
                merge_count += 1
                
                print(f"         ✓ Merged into 1 point with {len(merged_point['sourceIds'])} sources")
            else:
                # No duplicates, keep as is
                deduplicated.append(base_point)
            
            processed_indices.add(i)
        
        if merge_count > 0:
            print(f"      📊 Reduced from {len(timeline_points)} to {len(deduplicated)} timeline points")
        
        return deduplicated
    
    async def deduplicate_event_group(self, event_group: Dict[str, Any]) -> tuple[Dict[str, Any], bool]:
        """
        Takes a single event group and deduplicates its timeline_points.
        Returns (updated_event, was_changed).
        """
        timeline_points = event_group.get('timeline_points', [])
        
        if len(timeline_points) <= 1:
            return event_group, False
        
        original_count = len(timeline_points)
        deduplicated_points = await self.deduplicate_timeline_points(timeline_points)
        
        if len(deduplicated_points) < original_count:
            updated_event = event_group.copy()
            updated_event['timeline_points'] = deduplicated_points
            return updated_event, True
        
        return event_group, False
    
    async def process_figure(self, figure_id: str):
        """Process all timeline entries for a single figure."""
        print(f"\n{'='*80}")
        print(f"Processing figure: {figure_id.upper()}")
        print(f"{'='*80}")
        
        timeline_collection = self.db.collection('selected-figures').document(figure_id).collection('curated-timeline')
        
        main_categories = [
            "Creative Works",
            "Live & Broadcast",
            "Public Relations",
            "Personal Milestones",
            "Incidents & Controversies"
        ]
        
        total_points_before = 0
        total_points_after = 0
        total_events_changed = 0
        
        for main_cat in main_categories:
            print(f"\n📁 Processing main category: {main_cat}")
            
            doc_ref = timeline_collection.document(main_cat)
            doc = doc_ref.get()
            
            if not doc.exists:
                print(f"   No document found, skipping")
                continue
            
            doc_data = doc.to_dict()
            updated_doc_data = {}
            category_changed = False
            
            # Process each subcategory
            for subcategory, events in doc_data.items():
                if not isinstance(events, list):
                    continue
                
                print(f"\n  📋 Processing subcategory: {subcategory}")
                print(f"     Found {len(events)} event groups")
                
                updated_events = []
                subcategory_changed = False
                
                # Process each event group
                for event_idx, event_group in enumerate(events):
                    event_title = event_group.get('event_title', 'Untitled')
                    timeline_points = event_group.get('timeline_points', [])
                    original_point_count = len(timeline_points)
                    
                    if original_point_count > 1:
                        print(f"\n    📌 Event {event_idx + 1}: \"{event_title[:50]}...\"")
                        print(f"       Has {original_point_count} timeline points")
                        
                        # Deduplicate this event's timeline_points
                        updated_event, was_changed = await self.deduplicate_event_group(event_group)
                        
                        if was_changed:
                            new_point_count = len(updated_event['timeline_points'])
                            total_points_before += original_point_count
                            total_points_after += new_point_count
                            total_events_changed += 1
                            subcategory_changed = True
                            category_changed = True
                            
                            updated_events.append(updated_event)
                        else:
                            print(f"       ✅ No duplicates found")
                            updated_events.append(event_group)
                    else:
                        # Only 1 or 0 points, no need to check
                        updated_events.append(event_group)
                
                updated_doc_data[subcategory] = updated_events
            
            # Save changes if not dry run and changes were made
            if not self.dry_run and category_changed:
                doc_ref.set(updated_doc_data)
                print(f"\n   💾 Saved changes to {main_cat}")
            elif self.dry_run and category_changed:
                print(f"\n   🔍 DRY-RUN: Would save changes to {main_cat}")
        
        print(f"\n{'='*80}")
        print(f"SUMMARY for {figure_id}")
        print(f"{'='*80}")
        print(f"Event groups with changes:  {total_events_changed}")
        print(f"Timeline points before:     {total_points_before}")
        print(f"Timeline points after:      {total_points_after}")
        print(f"Points removed:             {total_points_before - total_points_after}")
        
        if total_points_before > 0:
            reduction_pct = ((total_points_before - total_points_after) / total_points_before * 100)
            print(f"Reduction:                  {reduction_pct:.1f}%")
        
        if self.dry_run and total_events_changed > 0:
            print(f"\n⚠️  Run without --dry-run to apply these changes")
        elif not self.dry_run and total_events_changed > 0:
            print(f"\n✅ Changes saved to Firestore")
        else:
            print(f"\n✅ No duplicate timeline points found!")
    
    async def close(self):
        """Clean up resources."""
        await self.news_manager.close()


async def main():
    parser = argparse.ArgumentParser(
        description="Deduplicate timeline_points within event groups.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python dedupe_timeline_points.py --figure newjeans --dry-run
  python dedupe_timeline_points.py --figure newjeans
  python dedupe_timeline_points.py --all-figures --dry-run
        """
    )
    
    parser.add_argument(
        '--figure',
        type=str,
        help='Process a specific figure by ID (e.g., "newjeans")'
    )
    
    parser.add_argument(
        '--all-figures',
        action='store_true',
        help='Process all figures in the database'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview changes without saving to database'
    )
    
    parser.add_argument(
        '--confidence-threshold',
        type=float,
        default=0.75,
        help='Minimum confidence (0.0-1.0) to merge duplicates (default: 0.75)'
    )
    
    args = parser.parse_args()
    
    if not args.figure and not args.all_figures:
        parser.error("Must specify either --figure or --all-figures")
    
    # Create deduplicator
    deduplicator = TimelinePointsDeduplicator(dry_run=args.dry_run)
    
    # Get figure IDs to process
    figure_ids = []
    if args.figure:
        figure_ids = [args.figure]
    elif args.all_figures:
        db = deduplicator.db
        all_figures = db.collection('selected-figures').stream()
        figure_ids = [doc.id for doc in all_figures]
        print(f"\nFound {len(figure_ids)} figures to process")
    
    # Process each figure
    for i, figure_id in enumerate(figure_ids):
        if len(figure_ids) > 1:
            print(f"\n\n{'='*80}")
            print(f"FIGURE {i+1}/{len(figure_ids)}")
            print(f"{'='*80}")
        
        await deduplicator.process_figure(figure_id)
    
    # Cleanup
    await deduplicator.close()
    
    print("\n\n✅ Timeline points deduplication complete!")
    if args.dry_run:
        print("   Run without --dry-run to apply changes")


if __name__ == "__main__":
    asyncio.run(main())
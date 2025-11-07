import asyncio
import json
import argparse
from collections import defaultdict
from setup_firebase_deepseek import NewsManager
from typing import Union, Optional, Dict, Any, List
from datetime import datetime
import re

from notification_service import notify_timeline_update

# --- CONFIGURATION ---
CURATED_TIMELINE_COLLECTION = "curated-timeline"

class EventDeduplicator:
    """Handles deduplication of similar events from multiple articles."""
    
    def __init__(self, ai_client, ai_model):
        self.ai_client = ai_client
        self.ai_model = ai_model
    
    async def detect_duplicates(self, event1_desc: str, event2_desc: str) -> Dict[str, Any]:
        """
        Uses AI to determine if two event descriptions are about the same event.
        Returns: {"is_duplicate": bool, "merged_description": str}
        """
        prompt = f"""
You are analyzing whether two event descriptions refer to the same real-world event.

Event 1: "{event1_desc}"
Event 2: "{event2_desc}"

Rules for determining if they're the same event:
1. Same date or very close dates (within 1-2 days) AND same type of event
2. Same key people/entities involved
3. Same core action or occurrence (e.g., "court ruling", "album release", "concert")
4. Minor wording differences don't make them different events

Respond ONLY with valid JSON in this exact format:
{{
    "is_duplicate": true/false,
    "confidence": 0.0-1.0,
    "merged_description": "if duplicate, provide a single merged description, otherwise null"
}}
"""
        try:
            response = await self.ai_client.chat.completions.create(
                model=self.ai_model,
                messages=[
                    {"role": "system", "content": "You are an expert at identifying duplicate events from news articles."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1  # Low temperature for consistency
            )
            result = json.loads(response.choices[0].message.content)
            return result
        except Exception as e:
            print(f"    -> Warning: Duplicate detection failed: {e}")
            return {"is_duplicate": False, "confidence": 0.0, "merged_description": None}
    
    def group_events_by_date_and_similarity(self, event_points: List[Dict[str, Any]]) -> List[List[Dict[str, Any]]]:
        """
        Groups event points by date first, then by similarity.
        Returns: List of event point groups that should be merged.
        """
        # First, group by exact date
        date_groups = defaultdict(list)
        for event_point in event_points:
            date = event_point.get('date', '')
            date_groups[date].append(event_point)
        
        # Return events grouped by date (we'll do AI similarity check later)
        return [group for group in date_groups.values() if len(group) > 1]
    
    async def merge_similar_events(self, event_points: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes a list of event points and merges duplicates.
        Returns a deduplicated list with combined sourceIds.
        """
        if len(event_points) <= 1:
            return event_points
        
        # Group by date first (quick pre-filter)
        potential_duplicate_groups = self.group_events_by_date_and_similarity(event_points)
        
        # Track which events have been merged
        merged_indices = set()
        deduplicated_events = []
        
        # Process each date group
        for group in potential_duplicate_groups:
            if len(group) <= 1:
                continue
            
            # Compare each pair within the group
            i = 0
            while i < len(group):
                if i in merged_indices:
                    i += 1
                    continue
                
                base_event = group[i]
                merged_event = base_event.copy()
                base_sources = set(base_event.get('sourceIds', [base_event.get('sourceId', '')]))
                
                j = i + 1
                while j < len(group):
                    if j in merged_indices:
                        j += 1
                        continue
                    
                    compare_event = group[j]
                    
                    # Use AI to check if they're duplicates
                    dup_result = await self.detect_duplicates(
                        base_event.get('description', ''),
                        compare_event.get('description', '')
                    )
                    
                    if dup_result.get('is_duplicate') and dup_result.get('confidence', 0) > 0.7:
                        print(f"    -> ✓ Detected duplicate events, merging sources")
                        # Merge the sources
                        compare_sources = set(compare_event.get('sourceIds', [compare_event.get('sourceId', '')]))
                        base_sources.update(compare_sources)
                        
                        # Use the better description
                        if dup_result.get('merged_description'):
                            merged_event['description'] = dup_result['merged_description']
                        
                        merged_indices.add(j)
                    
                    j += 1
                
                # Update sourceIds with all merged sources
                merged_event['sourceIds'] = sorted(list(base_sources))
                deduplicated_events.append(merged_event)
                merged_indices.add(i)
                i += 1
        
        # Add events that weren't in any date group (unique dates)
        all_event_points_flat = [ep for group in potential_duplicate_groups for ep in group]
        for idx, event_point in enumerate(event_points):
            if event_point not in all_event_points_flat:
                deduplicated_events.append(event_point)
        
        print(f"    -> Deduplication: {len(event_points)} events → {len(deduplicated_events)} unique events")
        return deduplicated_events


class CurationEngine:
    RECENT_EVENTS_CONTEXT_LIMIT = 50
    
    def __init__(self, figure_id: str):
        self.figure_id = figure_id
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
        self.deduplicator = EventDeduplicator(self.ai_client, self.ai_model)
        print(f"✓ CurationEngine initialized for figure: {self.figure_id}")

    # =================================================================================
    # STANDARDIZED HELPER FUNCTIONS
    # =================================================================================

    async def _recategorize_event(self, event_data: dict, all_categories: dict) -> Union[tuple[str, str], None]:
        """Takes a single event object and determines its correct main and subcategory."""
        system_prompt = "You are an expert content classifier. Your job is to analyze an event and classify it into a main category and a subcategory from the provided hierarchical list. You must follow the structure exactly. The subcategory you choose must be one of the valid options listed under the main category you select. Your response must be a single, valid JSON object."
        category_options = json.dumps(all_categories, indent=2)
        user_prompt = f"""
        Please analyze the following timeline event and classify it.

        Event Data:
        - Title: "{event_data.get('event_title', '')}"
        - Summary: "{event_data.get('event_summary', '')}"

        ---
        Category Options (with Main > Subcategory structure):
        {category_options}
        ---

        **CRITICAL INSTRUCTIONS:**
        1. First, select the single most appropriate `main_category` from the top-level keys in the options above.
        2. Second, from the list of subcategories *ONLY under your chosen main_category*, select the single most appropriate `subcategory`.
        3. The `subcategory` value in your response MUST be a direct child of the `main_category` value.

        Your response must be a single JSON object with two keys: "main_category" and "subcategory".
        """
        try:
            response = await self.ai_client.chat.completions.create(model=self.ai_model, messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}], response_format={"type": "json_object"})
            result = json.loads(response.choices[0].message.content)
            main_cat, sub_cat = result.get("main_category"), result.get("subcategory")
            if main_cat and sub_cat and main_cat in all_categories and sub_cat in all_categories[main_cat]:
                return main_cat, sub_cat
            else:
                print(f"    Warning: AI returned an invalid category pairing: {main_cat} / {sub_cat}. Will skip.")
                return None, None
        except Exception as e:
            print(f"    Error during event re-categorization: {e}")
            return None, None

    def _create_mini_event(self, source_id: str, date: str, summary: str) -> Dict[str, Any]:
        """Takes a single data point and formats it into a standardized "mini-event" object."""
        return {
            "event_title": summary,
            "event_summary": f"On {date}, an event occurred: {summary}",
            "timeline_points": [{"date": date, "description": summary, "sourceIds": [source_id]}]
        }
        
    def _get_sort_date(self, event: dict) -> str:
        """Safely retrieves the first date from an event's timeline points for sorting."""
        try:
            return event.get('timeline_points', [{}])[0].get('date', '1900-01-01')
        except (IndexError, TypeError):
            return '1900-01-01'

    async def _call_curation_api(self, subcategory_name: str, existing_events: list, new_event_data_point: dict) -> Union[dict, None]:
        """Takes a new data point and decides if it should be merged or used to create a new one."""
        system_prompt = """
        You are an Expert Timeline Curator. Your primary goal is to maintain a clean and readable timeline with concise, **one-phrase event titles**.

        You will receive a new piece of information and a list of existing events. Your task is to integrate the new information.
        - If the new information belongs to a *specific, closely related* existing event, update that event.
        - If it represents a distinct new topic, create a new event.

        **CRITICAL TITLE RULE 1:** The `event_title` you create must be a short, descriptive phrase summarizing a specific event.
        **CRITICAL TITLE RULE 2:** **AVOID creating overly broad, generic titles** like "Career Highlights" or "Group Activities."

        You will ALWAYS return a complete `event_json` object with a concise title and a well-written summary.
        """
        user_prompt = f"""
        You are curating the timeline for the subcategory: "{subcategory_name}".

        Here are the existing curated events:
        {json.dumps(existing_events, indent=2)}

        ---
        Here is the new information to integrate. Note that its "event_title" is just a long description; your job is to fix this by creating a concise, SPECIFIC title.

        New Information Point:
        {json.dumps(new_event_data_point, indent=2)}
        ---

        Now, decide how to integrate this new information. Your response MUST use one of the two following JSON formats:

        **Option 1: CREATE_NEW**
        {{
          "action": "CREATE_NEW",
          "event_json": {{ ... }}
        }}

        **Option 2: UPDATE_EXISTING**
        {{
          "action": "UPDATE_EXISTING",
          "target_event_title": "The exact title of the event to update",
          "event_json": {{ ... }}
        }}
        """
        try:
            response = await self.ai_client.chat.completions.create(model=self.ai_model, messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}], response_format={"type": "json_object"})
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            print(f"    Error during curation API call: {e}")
            return None

    def _get_all_subcategories(self) -> dict:
        """Returns a predefined, hardcoded dictionary of main and subcategories."""
        return {
            "Creative Works": ["Music", "Film & TV", "Publications & Art", "Awards & Honors"],
            "Live & Broadcast": ["Concerts & Tours", "Fan Events", "Broadcast Appearances"],
            "Public Relations": ["Media Interviews", "Endorsements & Ambassadors", "Social & Digital"],
            "Personal Milestones": ["Relationships & Family", "Health & Service", "Education & Growth"],
            "Incidents & Controversies": ["Legal & Scandal", "Accidents & Emergencies", "Public Backlash"]
        }

    def _add_event_years(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates and adds the 'event_years' field to an event object."""
        years = set()
        for point in event.get('timeline_points', []):
            date_str = point.get('date', '')
            if date_str and isinstance(date_str, str) and '-' in date_str:
                try: years.add(int(date_str.split('-')[0]))
                except (ValueError, IndexError): pass
        event['event_years'] = sorted(list(years), reverse=True)
        return event
    
    # =================================================================================
    # STATS COUNTER METHODS
    # =================================================================================
    
    def increment_facts_counter(self, count: int = 1) -> None:
        """Increments the totalFacts counter in the stats/counters document."""
        try:
            from firebase_admin import firestore
            
            stats_ref = self.db.collection('stats').document('counters')
            stats_ref.update({
                'totalFacts': firestore.Increment(count),
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
            print(f"    -> ✓ Incremented totalFacts counter by {count}")
        except Exception as e:
            print(f"    -> Warning: Failed to increment stats counter: {e}")

    # =================================================================================
    # RECENT UPDATES CACHE METHODS
    # =================================================================================
    
    def add_to_recent_updates_cache(
        self,
        event_data: dict,
        main_category: str,
        subcategory: str,
        source_id: str,
        action: str
    ) -> None:
        """Adds timeline points to the recent-updates cache collection."""
        try:
            figure_doc = self.db.collection('selected-figures').document(self.figure_id).get()
            if not figure_doc.exists:
                print(f"    -> Warning: Figure {self.figure_id} not found, skipping cache")
                return
            
            figure_data = figure_doc.to_dict()
            timeline_points = event_data.get('timeline_points', [])
            if not timeline_points or len(timeline_points) == 0:
                print(f"    -> Warning: No timeline points found for event, skipping cache")
                return
            
            event_title = event_data.get('event_title', '')
            event_summary = event_data.get('event_summary', '')
            
            from firebase_admin import firestore
            cache_ref = self.db.collection('recent-updates')
            
            def extract_publish_date(source_id: str) -> str:
                """Extracts publish date from sourceId format like 'AEN20250418...'"""
                try:
                    import re
                    match = re.search(r'(\d{8})', source_id)
                    if match:
                        date_str = match.group(1)
                        year = date_str[0:4]
                        month = date_str[4:6]
                        day = date_str[6:8]
                        return f"{year}-{month}-{day}"
                except Exception as e:
                    print(f"    -> Warning: Could not extract date from sourceId {source_id}: {e}")
                
                from datetime import datetime
                return datetime.now().strftime('%Y-%m-%d')
            
            for point in timeline_points:
                point_date = point.get('date')
                point_description = point.get('description', '')
                point_source_ids = point.get('sourceIds', [])
                
                if not point_date or not point_description:
                    continue
                
                most_recent_source_id = point_source_ids[-1] if point_source_ids else source_id
                publish_date = extract_publish_date(most_recent_source_id)
                
                existing_query = cache_ref.where('figureId', '==', self.figure_id) \
                                       .where('eventTitle', '==', event_title) \
                                       .where('eventPointDate', '==', point_date) \
                                       .where('eventPointDescription', '==', point_description) \
                                       .limit(1) \
                                       .stream()
                
                existing_docs = list(existing_query)
                
                cache_doc = {
                    'figureId': self.figure_id,
                    'figureName': figure_data.get('name', ''),
                    'figureProfilePic': figure_data.get('profilePic', ''),
                    'eventTitle': event_title,
                    'eventSummary': event_summary,
                    'mainCategory': main_category,
                    'subcategory': subcategory,
                    'eventYears': event_data.get('event_years', []),
                    'eventPointDate': point_date,
                    'eventPointDescription': point_description,
                    'eventPointSourceIds': point_source_ids,
                    'publishDate': publish_date,
                    'mostRecentSourceId': most_recent_source_id,
                    'allTimelinePoints': timeline_points,
                    'lastUpdated': firestore.SERVER_TIMESTAMP
                }
                
                if existing_docs:
                    existing_doc = existing_docs[0]
                    existing_doc.reference.update(cache_doc)
                    print(f"    -> ✓ Updated cache point ({publish_date}): {point_description[:50]}...")
                else:
                    cache_doc['createdAt'] = firestore.SERVER_TIMESTAMP
                    cache_ref.add(cache_doc)
                    print(f"    -> ✓ Added cache point ({publish_date}): {point_description[:50]}...")
            
            import random
            if random.random() < 0.1:
                self._cleanup_recent_updates_cache()
            
        except Exception as e:
            print(f"    -> Error adding to recent-updates cache: {e}")
    
    def _cleanup_recent_updates_cache(self) -> None:
        """Keeps the recent-updates cache at a manageable size."""
        try:
            cache_ref = self.db.collection('recent-updates')
            all_docs = list(cache_ref.order_by('publishDate', direction='DESCENDING').stream())
            
            if len(all_docs) > 200:
                docs_to_delete = all_docs[200:]
                batch = self.db.batch()
                delete_count = 0
                
                for doc in docs_to_delete:
                    batch.delete(doc.reference)
                    delete_count += 1
                    
                    if delete_count % 500 == 0:
                        batch.commit()
                        batch = self.db.batch()
                
                if delete_count % 500 != 0:
                    batch.commit()
                    
                print(f"    -> ✓ Cleaned up {len(docs_to_delete)} old cache entries (keeping latest 200)")
                
        except Exception as e:
            print(f"    -> Error cleaning up cache: {e}")

    # =================================================================================
    # MAIN PROCESSING METHODS (ENHANCED WITH DEDUPLICATION)
    # =================================================================================
    
    async def run_incremental_update(self):
        """
        Processes new articles and updates the timeline incrementally.
        NOW WITH SMART DEDUPLICATION!
        """
        print("\n--- Starting Incremental Timeline Update (with deduplication) ---")
        
        # 1. Get unprocessed summaries
        try:
            articles_to_process = []
            article_ref = self.db.collection('selected-figures').document(self.figure_id).collection('article-summaries')
            articles_to_process = list(article_ref.where('is_processed_for_timeline', '==', False).stream())
        except Exception as e:
            print(f"Error fetching unprocessed articles: {e}")
            await self.news_manager.close()
            return {}
            
        print(f"Found {len(articles_to_process)} unprocessed articles for figure: {self.figure_id}")
        
        if len(articles_to_process) == 0:
            print("No new articles to process. Exiting.")
            await self.news_manager.close()
            return
        
        # 2. COLLECT ALL EVENT POINTS FROM ALL ARTICLES FIRST (before processing)
        all_event_points_by_category = defaultdict(lambda: defaultdict(list))
        article_to_events_map = {}  # Track which articles contributed to which events
        
        print("\n📊 Phase 1: Collecting and grouping all event points...")
        all_categories = self._get_all_subcategories()
        
        for article_snapshot in articles_to_process:
            source_id = article_snapshot.id
            article_data = article_snapshot.to_dict()
            event_contents = article_data.get('event_contents')

            if not event_contents or not isinstance(event_contents, dict):
                print(f"  -> Article {source_id} has no 'event_contents'. Marking as processed.")
                article_ref = self.db.collection('selected-figures').document(self.figure_id).collection('article-summaries').document(source_id)
                article_ref.update({"is_processed_for_timeline": True})
                continue

            print(f"  -> Collecting events from article: {source_id}")
            article_events = []
            
            for date, summary in event_contents.items():
                if not date or not summary: 
                    continue
                
                # Create mini-event
                new_event_point = self._create_mini_event(source_id, date, summary)
                
                # Categorize it
                main_cat, sub_cat = await self._recategorize_event(new_event_point, all_categories)
                if not main_cat or not sub_cat:
                    continue
                
                # Store for deduplication
                event_with_category = {
                    'event_point': new_event_point,
                    'source_id': source_id,
                    'date': date,
                    'description': summary
                }
                all_event_points_by_category[main_cat][sub_cat].append(event_with_category)
                article_events.append(event_with_category)
            
            article_to_events_map[source_id] = article_events
        
        # 3. DEDUPLICATE WITHIN EACH SUBCATEGORY
        print("\n🔍 Phase 2: Deduplicating similar events...")
        deduplicated_events_by_category = defaultdict(lambda: defaultdict(list))
        
        for main_cat, subcats in all_event_points_by_category.items():
            for sub_cat, event_list in subcats.items():
                print(f"\n  -> Checking duplicates in [{main_cat}] > [{sub_cat}]...")
                print(f"     Found {len(event_list)} event points to analyze")
                
                # Extract just the timeline points for deduplication
                timeline_points = []
                for evt in event_list:
                    point = evt['event_point']['timeline_points'][0]
                    point['sourceId'] = evt['source_id']  # Keep track of source
                    timeline_points.append(point)
                
                # Deduplicate
                deduplicated_points = await self.deduplicator.merge_similar_events(timeline_points)
                
                # Rebuild event objects with merged sources
                for dedupe_point in deduplicated_points:
                    deduplicated_events_by_category[main_cat][sub_cat].append({
                        'event_point': {
                            'event_title': dedupe_point['description'],
                            'event_summary': f"On {dedupe_point['date']}, an event occurred: {dedupe_point['description']}",
                            'timeline_points': [dedupe_point]
                        },
                        'source_ids': dedupe_point.get('sourceIds', []),
                        'date': dedupe_point['date'],
                        'description': dedupe_point['description']
                    })
        
        # 4. NOW PROCESS DEDUPLICATED EVENTS
        print("\n⚙️ Phase 3: Processing deduplicated events into timeline...")
        newly_added_events = []
        processed_articles = set()
        
        for main_cat, subcats in deduplicated_events_by_category.items():
            for sub_cat, event_list in subcats.items():
                print(f"\n  -> Processing [{main_cat}] > [{sub_cat}]: {len(event_list)} unique events")
                
                # Fetch existing events
                timeline_doc_ref = self.db.collection('selected-figures').document(self.figure_id).collection(CURATED_TIMELINE_COLLECTION).document(main_cat)
                existing_main_category_data = timeline_doc_ref.get().to_dict() or {}
                curated_events_for_subcategory = existing_main_category_data.get(sub_cat, [])

                # Apply context limit
                limited_context_events = curated_events_for_subcategory
                if len(curated_events_for_subcategory) > self.RECENT_EVENTS_CONTEXT_LIMIT:
                    sorted_events = sorted(curated_events_for_subcategory, key=self._get_sort_date)
                    limited_context_events = sorted_events[-self.RECENT_EVENTS_CONTEXT_LIMIT:]

                # Process each deduplicated event
                for event_data in event_list:
                    new_event_point = event_data['event_point']
                    source_ids = event_data['source_ids']
                    
                    print(f"    -> Processing: '{new_event_point.get('event_title')[:60]}...'")
                    if len(source_ids) > 1:
                        print(f"       (Merged from {len(source_ids)} articles)")
                    
                    # Curation AI call
                    ai_decision = await self._call_curation_api(sub_cat, limited_context_events, new_event_point)
                    
                    if not ai_decision or "action" not in ai_decision or "event_json" not in ai_decision:
                        print("    Action: Curation AI failed. Skipping.")
                        continue

                    action = ai_decision.get("action")
                    event_json = ai_decision.get("event_json")
                    
                    event_for_tracking = {
                        **event_json,
                        'main_category': main_cat,
                        'subcategory': sub_cat,
                        'event_date': event_data['date']
                    }
                    newly_added_events.append(event_for_tracking)

                    # Apply decision
                    if action == "CREATE_NEW":
                        curated_events_for_subcategory.append(self._add_event_years(event_json))
                        print(f"    Action: CREATE_NEW ✓")
                        # For new events, save the entire event to recent updates
                        event_for_recent_updates = event_json
                    elif action == "UPDATE_EXISTING":
                        target_title = ai_decision.get("target_event_title")
                        found_and_updated = False
                        if target_title:
                            for idx, event in enumerate(curated_events_for_subcategory):
                                if event.get("event_title") == target_title:
                                    curated_events_for_subcategory[idx] = self._add_event_years(event_json)
                                    found_and_updated = True
                                    break
                        if not found_and_updated:
                            curated_events_for_subcategory.append(self._add_event_years(event_json))
                        print(f"    Action: UPDATE_EXISTING ✓")
                        # For updated events, only save the new timeline point to recent updates
                        # Find the new point (it should be from new_event_point which has 1 timeline point)
                        event_for_recent_updates = {
                            'event_title': event_json['event_title'],
                            'event_summary': event_json['event_summary'],
                            'timeline_points': [new_event_point['timeline_points'][0]]  # Only the new point
                        }
                    
                    # Save to Firestore
                    existing_main_category_data[sub_cat] = curated_events_for_subcategory
                    timeline_doc_ref.set(existing_main_category_data)
                    
                    # Increment counter
                    self.increment_facts_counter(1)
                    
                    # Add to cache
                    self.add_to_recent_updates_cache(
                        event_data=event_for_recent_updates,
                        main_category=main_cat,
                        subcategory=sub_cat,
                        source_id=source_ids[0] if source_ids else '',
                        action=action
                    )
                    
                    # Track which articles were involved
                    processed_articles.update(source_ids)
        
        # 5. Mark ALL processed articles as done
        print("\n📝 Phase 4: Marking articles as processed...")
        for article_snapshot in articles_to_process:
            article_ref = self.db.collection('selected-figures').document(self.figure_id).collection('article-summaries').document(article_snapshot.id)
            article_ref.update({"is_processed_for_timeline": True})
            print(f"  -> Marked {article_snapshot.id} as processed")
            
        # 6. Notifications
        if newly_added_events:
            print(f"\n📬 Triggering notifications for {len(newly_added_events)} new events...")
            try:
                await notify_timeline_update(self.figure_id, newly_added_events)
            except Exception as e:
                print(f"⚠️ Warning: Failed to send notifications: {e}")
            
        await self.news_manager.close()
        print("\n--- Incremental Update Complete ---")
        print(f"✓ Processed {len(processed_articles)} articles")
        print(f"✓ Created/updated {len(newly_added_events)} timeline events")
        
        return {"new_events": newly_added_events}


async def main():
    """Parses arguments and runs the update process."""
    parser = argparse.ArgumentParser(
        description="Runs an incremental timeline update with smart deduplication."
    )
    parser.add_argument(
        "--figure",
        type=str,
        help="Optional: The ID of a single figure to process."
    )
    args = parser.parse_args()

    news_manager = NewsManager()
    db = news_manager.db
    
    figure_ids_to_process = []
    if args.figure:
        figure_ids_to_process.append(args.figure)
        print(f"\n--- Running update for: {args.figure.upper()} ---")
    else:
        print("\n--- Running update for all figures ---")
        try:
            all_figure_docs = db.collection('selected-figures').stream()
            figure_ids_to_process = [doc.id for doc in all_figure_docs]
            print(f"Found {len(figure_ids_to_process)} figures")
        except Exception as e:
            print(f"Error fetching figures: {e}")
            return
            
    for figure_id in figure_ids_to_process:
        print(f"\n{'='*25} PROCESSING: {figure_id.upper()} {'='*25}")
        engine = CurationEngine(figure_id=figure_id)
        await engine.run_incremental_update()

if __name__ == "__main__":
    asyncio.run(main())
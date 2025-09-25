import asyncio
import json
import argparse
from collections import defaultdict
from setup_firebase_deepseek import NewsManager
from typing import Union, Optional, Dict, Any, List

# --- CONFIGURATION ---
CURATED_TIMELINE_COLLECTION = "curated-timeline"

class CurationEngine:
    def __init__(self, figure_id: str):
        self.figure_id = figure_id
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
        print(f"✓ CurationEngine initialized for figure: {self.figure_id}")

    async def _recategorize_event(self, event_data: dict, all_categories: dict) -> Union[tuple[str, str], None]:
        """
        Takes a single event object and determines its correct main and subcategory.
        """
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
        1. First, select the single most appropriate `main_category` from the top-level keys in the options above (e.g., "Creative Works", "Live & Broadcast").
        2. Second, from the list of subcategories *ONLY under your chosen main_category*, select the single most appropriate `subcategory`.
        3. The `subcategory` value in your response MUST be a direct child of the `main_category` value.

        Your response must be a single JSON object with two keys: "main_category" and "subcategory".

        # A valid example based on the provided category list
        Example: {{ "main_category": "Live & Broadcast", "subcategory": "Broadcast Appearances" }}
        """

        try:
            response = await self.ai_client.chat.completions.create(
                model=self.ai_model,
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                response_format={"type": "json_object"}
            )
            result = json.loads(response.choices[0].message.content)
            main_cat = result.get("main_category")
            sub_cat = result.get("subcategory")

            if main_cat and sub_cat and main_cat in all_categories and sub_cat in all_categories[main_cat]:
                return main_cat, sub_cat
            else:
                print(f"    Warning: AI returned an invalid category pairing: {main_cat} / {sub_cat}. Will skip this event for now.")
                return None, None

        except Exception as e:
            print(f"    Error during event re-categorization: {e}")
            return None, None

    def _create_mini_event(self, source_id: str, date: str, summary: str) -> Dict[str, Any]:
        """
        Takes a single data point from an article's 'event_contents' and formats it
        into a standardized "mini-event" object.
        """
        return {
            "event_title": summary,
            "event_summary": f"On {date}, an event occurred: {summary}",
            "timeline_points": [{
                "date": date,
                "description": summary,
                "sourceIds": [source_id]
            }]
        }

    async def _call_curation_api(self, subcategory_name: str, existing_events: list, new_event_data_point: dict) -> Union[dict, None]:
        """
        Takes a new data point and decides if it should be merged into an
        existing event or used to create a new one. Includes multiple layers of
        prompt size management and a clarified prompt for structural accuracy.
        """
        # --- Configuration (Unchanged) ---
        MAX_RETRIES = 3
        RETRY_DELAY_SECONDS = 5
        MAX_CONTEXT_CHARACTERS = 8000
        MAX_NEW_EVENT_CHARACTERS = 2000

        # --- System Prompt (Unchanged) ---
        system_prompt = """
        You are an Expert Timeline Curator. Your primary goal is to maintain a clean and readable timeline with concise, **one-phrase event titles**.

        You will receive a new piece of information and a list of existing events. Your task is to integrate the new information into the timeline.
        - If the new information belongs to a *specific, closely related* existing event, update that event.
        - If it represents a distinct new topic, create a new event.

        **CRITICAL TITLE RULE 1:** The `event_title` you create must be a short, descriptive phrase summarizing a specific event (e.g., "District 9: Unlock World Tour", "Debut Album 'I am NOT'", "KCON 2019 Japan Performance").
        **CRITICAL TITLE RULE 2:** **AVOID creating overly broad, generic titles** like "Career Highlights," "Group Activities," or "Formation and Rise of Stray Kids." An album release in one year should NOT be merged with a Spotify data report from another year. Each distinct achievement or release should likely be its own event.

        You will ALWAYS return a complete `event_json` object with a concise title and a well-written summary.
        """
        
        # --- Truncate the incoming new_event_data_point (Unchanged) ---
        original_summary = new_event_data_point.get("event_summary", "")
        if len(original_summary) > MAX_NEW_EVENT_CHARACTERS:
            print(f"    --> Truncating overly long new event summary (from {len(original_summary)} to {MAX_NEW_EVENT_CHARACTERS} chars).")
            new_event_data_point = new_event_data_point.copy()
            truncated_summary = original_summary[:MAX_NEW_EVENT_CHARACTERS]
            new_event_data_point["event_summary"] = truncated_summary
            if new_event_data_point.get("event_title") == original_summary:
                new_event_data_point["event_title"] = truncated_summary

        # --- Dynamic Context Builder (Unchanged) ---
        recent_events = []
        current_char_count = 0
        for event in reversed(existing_events):
            event_str = json.dumps(event)
            if current_char_count + len(event_str) > MAX_CONTEXT_CHARACTERS:
                print(f"    Context character limit reached. Using {len(recent_events)} most recent events.")
                break
            recent_events.insert(0, event)
            current_char_count += len(event_str)

        # --- FINALIZED USER PROMPT ---
        user_prompt = f"""
        You are curating the timeline for the subcategory: "{subcategory_name}".

        Here are the most recent existing curated events that fit within the context limit:
        {json.dumps(recent_events, indent=2)}

        ---
        Here is the new information to integrate. Note that its "event_title" is just a long description; your job is to fix this by creating a concise, SPECIFIC title.

        New Information Point:
        {json.dumps(new_event_data_point, indent=2)}
        ---

        **INSTRUCTIONS FOR YOUR RESPONSE:**
        Your response MUST be a single JSON object with two top-level keys: "action" and "event_json".

        1.  The `action` key's value must be the string "CREATE_NEW" if the new info is a distinct event.
            The JSON for this case is:
            {{
              "action": "CREATE_NEW",
              "event_json": {{
                "event_title": "A new, short, SPECIFIC one-phrase title for this event",
                "event_summary": "A brief summary of this new event based on the new information.",
                "timeline_points": [ ... the timeline point from the new information ... ]
              }}
            }}

        2.  The `action` key's value must be the string "UPDATE_EXISTING" if the new info is DIRECTLY related to an existing event.
            The JSON for this case requires the `target_event_title` key:
            {{
              "action": "UPDATE_EXISTING",
              "target_event_title": "The exact title of the event to update",
              "event_json": {{
                "event_title": "The new or existing concise, SPECIFIC title for the combined event",
                "event_summary": "An updated summary covering all timeline points.",
                "timeline_points": [ ... all combined and sorted points ... ]
              }}
            }}
        """

        # --- API Call with Retry Logic (Unchanged) ---
        for attempt in range(MAX_RETRIES):
            try:
                response = await self.ai_client.chat.completions.create(
                    model=self.ai_model,
                    messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                    response_format={"type": "json_object"}
                )
                return json.loads(response.choices[0].message.content)
            except Exception as e:
                print(f"    Error during curation API call (Attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    print(f"    Retrying in {RETRY_DELAY_SECONDS} seconds...")
                    await asyncio.sleep(RETRY_DELAY_SECONDS)
                else:
                    print("    All retries failed. Skipping this point.")
                    return None
        
        return None

    def _get_all_subcategories(self) -> dict:
        """
        Returns a predefined, hardcoded dictionary of main and subcategories
        to ensure consistency across the entire timeline.
        """
        print("Loading predefined category structure...")
        
        predefined_categories = {
            "Creative Works": ["Music", "Film & TV", "Publications & Art", "Awards & Honors"],
            "Live & Broadcast": ["Concerts & Tours", "Fan Events", "Broadcast Appearances"],
            "Public Relations": ["Media Interviews", "Endorsements & Ambassadors", "Social & Digital"],
            "Personal Milestones": ["Relationships & Family", "Health & Service", "Education & Growth"],
            "Incidents & Controversies": ["Legal & Scandal", "Accidents & Emergencies", "Public Backlash"]
        }
        
        print(f"Loaded {len(predefined_categories)} main categories.")
        return predefined_categories

    def _fetch_articles_with_events(self) -> list:
        """
        Fetches all articles for the figure that have not been processed yet
        and contain the 'event_contents' map.
        """
        from google.cloud.firestore_v1.base_query import FieldFilter
        
        articles_ref = self.db.collection('selected-figures').document(self.figure_id).collection('article-summaries')
        query = articles_ref.where(filter=FieldFilter('is_processed_for_timeline', '!=', True))
        
        docs = query.stream()
        articles = []
        for doc in docs:
            data = doc.to_dict()
            if 'event_contents' in data and isinstance(data['event_contents'], dict):
                articles.append({
                    "sourceId": doc.id,
                    "event_contents": data['event_contents']
                })
        return articles
    
    def _add_event_years(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates and adds the 'event_years' field to an event object.
        It extracts all unique years from the timeline_points dates,
        handling both 'YYYY-MM-DD' and 'YYYY' formats.
        """
        years = set()
        for point in event.get('timeline_points', []):
            date_str = point.get('date', '')
            if date_str and isinstance(date_str, str):
                try:
                    if '-' in date_str:
                        year = int(date_str.split('-')[0])
                    else:
                        year = int(date_str)
                    
                    years.add(year)
                except (ValueError, IndexError) as e:
                    print(f"    Warning: Could not parse year from date '{date_str}' in event '{event.get('event_title', 'Untitled')}'. Error: {e}")
        
        event['event_years'] = sorted(list(years), reverse=True)
        return event
    
    async def run_initial_migration(self):
        print("--- Starting Enhanced Timeline Migration (V2) ---")
        all_categories = self._get_all_subcategories()

        # PHASE 1: EXTRACT ALL GRANULAR EVENTS FROM 'event_contents'
        print("\n--- Phase 1: Extracting all granular events from article 'event_contents' field ---")
        staged_events = []
        processed_source_ids = set()
        
        articles_to_process = self._fetch_articles_with_events()
        print(f"  -> Found {len(articles_to_process)} unprocessed articles with 'event_contents'.")

        for article in articles_to_process:
            source_id = article['sourceId']
            event_contents = article['event_contents']
            
            for date, summary in event_contents.items():
                if date and summary:
                    mini_event = self._create_mini_event(source_id, date, summary)
                    staged_events.append(mini_event)
            
            processed_source_ids.add(source_id)
        
        print(f"\n--- Phase 1 Complete: Extracted {len(staged_events)} individual event points. ---")

        # PHASE 2: RE-CATEGORIZE EACH GRANULAR EVENT
        print("\n--- Phase 2: Re-categorizing each event point based on its content ---")
        recategorized_timeline = defaultdict(lambda: defaultdict(list))
        for i, event in enumerate(staged_events):
            print(f"  -> Re-categorizing event {i + 1}/{len(staged_events)}: '{event.get('event_title', 'Untitled')}'")
            main_cat, sub_cat = await self._recategorize_event(event, all_categories)
            
            if main_cat and sub_cat:
                recategorized_timeline[main_cat][sub_cat].append(event)
                print(f"    -> Classified into: [{main_cat}] > [{sub_cat}]")
            else:
                print(f"    -> SKIPPED due to categorization failure.")
                
        print("\n--- Phase 2 Complete: All event points have been re-categorized. ---")

        # PHASE 3: CURATE AND MERGE WITHIN CORRECTED CATEGORIES
        print("\n--- Phase 3: Curating timelines by merging related event points ---")
        final_timeline = defaultdict(dict)

        for main_cat, sub_cat_data in recategorized_timeline.items():
            for sub_cat, events_to_process in sub_cat_data.items():
                print(f"\n--- Curating: [{main_cat}] > [{sub_cat}] ({len(events_to_process)} points) ---")
                
                curated_events_for_subcategory = []
                sorted_events = sorted(events_to_process, key=lambda x: x['timeline_points'][0]['date'])

                for i, new_event_point in enumerate(sorted_events):
                    print(f"  -> Processing point {i + 1}/{len(sorted_events)}: '{new_event_point.get('event_title')}'")
                    
                    ai_decision = await self._call_curation_api(sub_cat, curated_events_for_subcategory, new_event_point)
                    
                    if not ai_decision or "action" not in ai_decision or "event_json" not in ai_decision:
                        print("    Action: Curation AI failed or returned invalid format. Skipping point.")
                        continue

                    action = ai_decision.get("action")
                    event_json = ai_decision.get("event_json")

                    if action == "CREATE_NEW":
                        curated_events_for_subcategory.append(event_json)
                        print(f"    Action: CREATED NEW event with title '{event_json.get('event_title')}'")
                    
                    elif action == "UPDATE_EXISTING":
                        target_title = ai_decision.get("target_event_title")
                        if not target_title:
                            print("    Action: UPDATE decision received, but no target title provided. Adding as new.")
                            curated_events_for_subcategory.append(event_json)
                            continue
                        
                        found_and_updated = False
                        for idx, event in enumerate(curated_events_for_subcategory):
                            if event.get("event_title") == target_title:
                                curated_events_for_subcategory[idx] = event_json
                                found_and_updated = True
                                print(f"    Action: UPDATED event, new title is '{event_json.get('event_title')}'")
                                break
                        
                        if not found_and_updated:
                            print(f"    Action: UPDATE failed (target '{target_title}' not found). Adding as new.")
                            curated_events_for_subcategory.append(event_json)
                    else:
                        print(f"    Action: Unknown action '{action}'. Skipping point.")

                final_timeline[main_cat][sub_cat] = curated_events_for_subcategory
                
        # PHASE 4: ENRICHING FINAL DATA WITH EVENT_YEARS
        print("\n--- Phase 4: Enriching final events with calculated year data ---")
        for main_cat, sub_cat_data in final_timeline.items():
            for sub_cat, events in sub_cat_data.items():
                final_timeline[main_cat][sub_cat] = [self._add_event_years(event) for event in events]
        print("--- Phase 4 Complete. All events enriched. ---")
        
        # PHASE 5: MARK PROCESSED ARTICLES IN FIRESTORE
        print("\n--- Phase 5: Marking processed articles in Firestore ---")
        if not processed_source_ids:
            print("No source IDs were processed, skipping update.")
        else:
            articles_ref = self.db.collection('selected-figures').document(self.figure_id).collection('article-summaries')
            batch = self.db.batch()
            for source_id in processed_source_ids:
                article_ref = articles_ref.document(source_id)
                batch.update(article_ref, {"is_processed_for_timeline": True})
            batch.commit()
            print(f"--- Phase 5 Complete. Marked {len(processed_source_ids)} articles as processed. ---")
        
        print("\n--- Migration processing complete. Saving to Firestore... ---")
        timeline_collection_ref = self.db.collection('selected-figures').document(self.figure_id).collection(CURATED_TIMELINE_COLLECTION)
        
        # --- REMOVED: Deletion of old timeline data ---
        # print("Clearing old timeline data...")
        # for doc in timeline_collection_ref.stream():
        #     doc.reference.delete()
        # print("Old data cleared.")
            
        for main_cat, sub_cat_data in final_timeline.items():
            timeline_collection_ref.document(main_cat).set(sub_cat_data)
        print(f"Successfully saved data for {len(final_timeline)} main categories.")


async def main():
    """
    Parses command-line arguments and runs the migration engine.
    """
    parser = argparse.ArgumentParser(
        description="""
        Runs the V2 timeline migration process for a specific figure.
        This script extracts events from articles, categorizes them, curates them
        into a structured timeline, and saves the result to Firestore.
        """
    )
    parser.add_argument(
        "figure_id",
        type=str,
        help="The ID of the figure to process (e.g., 'newjeans')."
    )
    
    args = parser.parse_args()
    
    engine = CurationEngine(figure_id=args.figure_id)
    await engine.run_initial_migration()

if __name__ == "__main__":
    asyncio.run(main())
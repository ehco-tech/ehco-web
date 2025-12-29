import asyncio
import argparse
import sys
from google.cloud.firestore_v1.base_query import FieldFilter
from utilities.setup_firebase_deepseek import NewsManager # Assuming this sets up your clients
from typing import Dict, Any, List

# --- CONFIGURATION ---
CURATED_TIMELINE_COLLECTION = "curated-timeline"

class EventYearsBackfiller:
    def __init__(self, figure_id: str):
        self.figure_id = figure_id
        try:
            self.news_manager = NewsManager()
            self.db = self.news_manager.db
            self.timeline_ref = self.db.collection('selected-figures').document(figure_id).collection(CURATED_TIMELINE_COLLECTION)
            print(f"✓ EventYearsBackfiller initialized for figure: {self.figure_id}")
        except Exception as e:
            print(f"Error: Failed to connect to Firestore for figure {figure_id}. Details: {e}")
            sys.exit(1) # Exit if connection fails

    def _extract_years_from_timeline_points(self, timeline_points: List[Dict[str, Any]]) -> List[int]:
        """
        Extracts and returns a sorted list of unique years from a list of timeline points,
        handling both 'YYYY-MM-DD' and 'YYYY' date formats.
        """
        years = set()
        for point in timeline_points:
            date_str = point.get('date', '')
            if date_str and isinstance(date_str, str):
                try:
                    # Attempt to extract year from 'YYYY-MM-DD' format first
                    if '-' in date_str:
                        year = int(date_str.split('-')[0])
                    # If no hyphen, assume 'YYYY' format
                    else:
                        year = int(date_str)
                    
                    years.add(year)
                except (ValueError, IndexError) as e:
                    print(f"    Warning: Could not parse year from date '{date_str}'. Error: {e}")
        
        return sorted(list(years), reverse=True)

    async def run_backfill(self):
        """
        Iterates through all timeline events for the specified figure and
        updates their 'event_years' field based on 'timeline_points' dates.
        """
        print(f"\n--- Starting Backfill for 'event_years' for figure: {self.figure_id} ---")

        try:
            all_events_data = self._fetch_timeline_events()

            if not all_events_data:
                print(f"! No timeline data found for figure '{self.figure_id}'. Skipping backfill.")
                return

            print(f"\n-> Processing {len(all_events_data)} main category documents...")
            
            batch = self.db.batch()
            documents_updated_count = 0
            events_updated_count = 0

            for main_cat_id, main_cat_data in all_events_data.items():
                updated_main_cat_data = main_cat_data.copy() # Work on a copy of the main category document data
                main_cat_doc_modified = False # Flag if this document needs to be updated

                for sub_cat_name, events in main_cat_data.items():
                    if not isinstance(events, list): # Ensure 'events' is a list
                        continue

                    # Create a new list for events in this subcategory to hold modified events
                    updated_events_list = []
                    sub_cat_modified = False # Flag if any event in this subcategory was modified

                    for event in events:
                        original_event_years = event.get('event_years', [])
                        
                        # Calculate the new event_years based on timeline_points
                        new_event_years = self._extract_years_from_timeline_points(event.get('timeline_points', []))

                        # Compare the original and new event_years
                        # Convert to set for comparison to ignore order, then back to sorted list for assignment
                        if set(original_event_years) != set(new_event_years):
                            event['event_years'] = new_event_years
                            events_updated_count += 1
                            event_modified = True
                            print(f"  Updated 'event_years' for event: '{event.get('event_title', 'Untitled')}' from {original_event_years} to {new_event_years}")
                        else:
                            event_modified = False # No change to event_years for this event

                        updated_events_list.append(event) # Add the (potentially modified) event to the list
                        if event_modified:
                            sub_cat_modified = True

                    # If any event in this subcategory was modified, update the subcategory data in the copy
                    if sub_cat_modified:
                        updated_main_cat_data[sub_cat_name] = updated_events_list
                        main_cat_doc_modified = True

                # If the main category document was modified, add it to the batch
                if main_cat_doc_modified:
                    doc_ref = self.timeline_ref.document(main_cat_id)
                    batch.set(doc_ref, updated_main_cat_data) # Use set to overwrite the entire document
                    documents_updated_count += 1
                    print(f"  Preparing update for document: {main_cat_id}")

            if documents_updated_count > 0:
                print(f"\nCommitting batch for figure '{self.figure_id}'...")
                # await batch.commit() # Commit the batch asynchronously
                batch.commit()
                print(f"✅ Successfully updated {documents_updated_count} documents for figure '{self.figure_id}'.")
                print(f"  - Updated 'event_years' for {events_updated_count} events.")
            else:
                print(f"\nNo documents required 'event_years' update for figure '{self.figure_id}'. Already up-to-date.")

        except Exception as e:
            print(f"\n❌ An error occurred during the 'event_years' backfill process for '{self.figure_id}': {e}")
            print("The process may be partially complete.")
        finally:
            await self.news_manager.close() # Ensure NewsManager connection is closed

    def _fetch_timeline_events(self) -> dict:
        """Helper to fetch all existing timeline documents for the figure."""
        all_events = {}
        try:
            docs = self.timeline_ref.stream()
            for doc in docs:
                all_events[doc.id] = doc.to_dict()
            return all_events
        except Exception as e:
            print(f"Error fetching timeline events for {self.figure_id}: {e}")
            return {}

async def main():
    """
    Parses command-line arguments and runs the 'event_years' backfill process.
    Allows processing a single figure or all figures.
    """
    parser = argparse.ArgumentParser(
        description="""
        A utility to backfill and update the 'event_years' field for existing timeline events
        in Firestore, based on dates found in their 'timeline_points'.
        Handles both 'YYYY-MM-DD' and 'YYYY' date formats.
        """
    )
    parser.add_argument(
        "--figure",
        type=str,
        help="Optional: The ID of a single figure to process (e.g., 'newjeans'). If not provided, all figures will be processed."
    )
    
    args = parser.parse_args()

    if args.figure:
        print(f"--- Running 'event_years' backfill for specified figure: {args.figure} ---")
        backfiller = EventYearsBackfiller(figure_id=args.figure)
        await backfiller.run_backfill()
    else:
        print("--- Running 'event_years' backfill for ALL Figures in 'selected-figures' collection ---")
        manager = NewsManager() # Use NewsManager to get db connection for fetching figure IDs
        db = manager.db

        figure_ids = []
        try:
            print("Fetching all figure IDs from 'selected-figures' collection...")
            figures_ref = db.collection('selected-figures')
            docs = figures_ref.stream()
            for doc in docs:
                figure_ids.append(doc.id)
            print(f"Found {len(figure_ids)} figures to process.")
        except Exception as e:
            print(f"Error fetching figure IDs: {e}")
            await manager.close()
            sys.exit(1) # Exit if we can't even get the list of figures

        await manager.close() # Close the initial manager connection after fetching IDs

        if not figure_ids:
            print("No figures found to process. Exiting.")
            return

        for figure_id in figure_ids:
            backfiller = EventYearsBackfiller(figure_id=figure_id)
            await backfiller.run_backfill()
            await asyncio.sleep(1) # Small delay between figures

        print("\n--- ALL FIGURE 'EVENT_YEARS' BACKFILLS COMPLETED ---")

if __name__ == "__main__":
    # To run this script:
    #   For a specific figure: python backfill_event_years.py --figure_id your_figure_id
    #   For all figures:      python backfill_event_years.py
    asyncio.run(main())
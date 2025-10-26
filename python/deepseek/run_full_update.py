# Modified version that uses the debug UpdateTracker

import asyncio
import argparse
from typing import List
import json
import logging

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger('run_full_update')

# --- Core Dependencies ---
from setup_firebase_deepseek import NewsManager
from predefined_public_figure_extractor import PredefinedPublicFigureExtractor

# --- Import Updater Classes from Their Respective Files ---
from UPDATE_article_categorizer import (
    PublicFigureSummaryCategorizer as ArticleCategorizer,
)
from UPDATE_wiki_content import PublicFigureWikiUpdater as WikiContentUpdater
from UPDATE_timeline import CurationEngine
from compact_overview import CompactOverview
from compact_event_summaries_descriptions import DataUpdater as TimelineCompactor
from related_figures import RelatedFiguresUpdater

# --- Import the debug UpdateTracker ---
from update_tracker import UpdateTracker


# The orchestrator class with UpdateTracker integration
class MasterUpdater:
    def __init__(self):
        logger.info("Initializing MasterUpdater")
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.update_tracker = UpdateTracker(db=self.db)
        logger.info("MasterUpdater initialized successfully")

    async def get_all_figure_ids(self) -> List[str]:
        """Fetches all document IDs from the 'selected-figures' collection."""
        logger.info("Fetching all figure IDs from Firestore...")
        docs = self.db.collection("selected-figures").stream()
        ids = [doc.id for doc in docs]
        logger.info(f"Found {len(ids)} figures.")
        return ids

    async def run_full_update_for_figure(
        self, figure_id: str, related_updater: RelatedFiguresUpdater
    ):
        """
        Runs the complete, ordered update and compaction pipeline for a single figure.
        """
        logger.info(f"STARTING FULL UPDATE FOR: {figure_id.upper()}")

        # STEP 1: Categorize new article summaries
        logger.info("STEP 1 of 6: Categorizing new articles")
        categorizer = ArticleCategorizer()
        categorization_result = await categorizer.process_summaries(figure_id=figure_id)
        
        # Debug the categorization result structure
        logger.debug(f"Categorization result type: {type(categorization_result)}")
        if categorization_result:
            if hasattr(categorization_result, 'new_articles'):
                logger.info(f"Found {len(categorization_result.new_articles)} new articles")
                for i, article in enumerate(categorization_result.new_articles[:3]):
                    logger.debug(f"Article {i+1} data: {article}")
            else:
                logger.warning("categorization_result has no 'new_articles' attribute")
        else:
            logger.warning("categorization_result is None or empty")
        
        # Track significant article categorizations
        if categorization_result and hasattr(categorization_result, 'new_articles') and categorization_result.new_articles:
            for article in categorization_result.new_articles[:3]:  # Limit to 3 most significant
                try:
                    logger.info(f"Adding news update for article: {article.get('title', 'New Article')}")
                    update_id = self.update_tracker.add_news_update(
                        figure_id=figure_id,
                        headline=article.get('title', 'New Article'),
                        summary=article.get('summary', 'No summary available'),
                        source=article.get('source', 'Unknown source'),
                        source_url=article.get('url', None)
                    )
                    logger.info(f"News update added with ID: {update_id}")
                except Exception as e:
                    logger.error(f"Error adding news update: {e}")
                    import traceback
                    traceback.print_exc()

        # STEP 2: Update Wiki Content with new summaries
        logger.info("STEP 2 of 6: Updating wiki content")
        wiki_updater = WikiContentUpdater()
        wiki_result = await wiki_updater.update_all_wiki_content(specific_figure_id=figure_id)
        
        # Debug the wiki result structure
        logger.debug(f"Wiki result type: {type(wiki_result)}")
        if wiki_result:
            if hasattr(wiki_result, 'updated_sections'):
                logger.info(f"Found {len(wiki_result.updated_sections)} updated wiki sections")
                for i, section in enumerate(wiki_result.updated_sections):
                    logger.debug(f"Section {i+1} data: {section}")
            else:
                logger.warning("wiki_result has no 'updated_sections' attribute")
        else:
            logger.warning("wiki_result is None or empty")
        
        # Track wiki updates
        if wiki_result and hasattr(wiki_result, 'updated_sections'):
            for section in wiki_result.updated_sections:
                try:
                    logger.info(f"Adding wiki update for section: {section.get('title', 'Profile Update')}")
                    update_id = self.update_tracker.add_wiki_update(
                        figure_id=figure_id,
                        section_title=section.get('title', 'Profile Update'),
                        update_summary=section.get('summary', 'Profile information was updated')
                    )
                    logger.info(f"Wiki update added with ID: {update_id}")
                except Exception as e:
                    logger.error(f"Error adding wiki update: {e}")
                    import traceback
                    traceback.print_exc()

        # STEP 3: Update Curated Timeline and mark articles as processed
        logger.info("STEP 3 of 6: Updating curated timeline")
        curation_engine = CurationEngine(figure_id=figure_id)
        timeline_result = await curation_engine.run_incremental_update()
        
        # Debug the timeline result structure
        logger.debug(f"Timeline result type: {type(timeline_result)}")
        if timeline_result:
            if hasattr(timeline_result, 'new_events'):
                logger.info(f"Found {len(timeline_result.new_events)} new timeline events")
                for i, event in enumerate(timeline_result.new_events[:5]):
                    logger.debug(f"Event {i+1} data: {event}")
            else:
                logger.warning("timeline_result has no 'new_events' attribute")
        else:
            logger.warning("timeline_result is None or empty")
        
        # Track timeline updates
        if timeline_result and hasattr(timeline_result, 'new_events'):
            for event in timeline_result.new_events[:5]:  # Limit to 5 most significant
                try:
                    logger.info(f"Adding timeline update for event: {event.get('title', 'Timeline Update')}")
                    update_id = self.update_tracker.add_timeline_update(
                        figure_id=figure_id,
                        event_title=event.get('title', 'Timeline Update'),
                        event_description=event.get('description', 'New event added to timeline'),
                        event_date=event.get('date', 'Unknown date'),
                        source=event.get('source', None)
                    )
                    logger.info(f"Timeline update added with ID: {update_id}")
                except Exception as e:
                    logger.error(f"Error adding timeline update: {e}")
                    import traceback
                    traceback.print_exc()

        # STEP 4: Compact Wiki/Overview documents
        logger.info("STEP 4 of 6: Compacting wiki overviews")
        overview_compactor = CompactOverview()
        await overview_compactor.compact_figure_overview(figure_id=figure_id)

        # STEP 5: Compact Timeline event summaries and descriptions
        logger.info("STEP 5 of 6: Compacting timeline events")
        timeline_compactor = TimelineCompactor(figure_id=figure_id)
        await timeline_compactor.run_update()

        # STEP 6: Update related figures count
        logger.info("STEP 6 of 6: Updating related figures count")
        # The 'related_updater' was created outside and passed in for efficiency
        related_result = related_updater.update_for_figure(figure_id)

        # Create a general update for the entire process completion
        try:
            logger.info("Adding final system update for process completion")
            update_id = self.update_tracker.add_update(
                figure_id=figure_id,
                update_type='system',
                title='Profile Fully Updated',
                description=f'Complete refresh of {figure_id} profile with latest information',
                additional_data={'update_steps': 6}
            )
            logger.info(f"System update added with ID: {update_id}")
        except Exception as e:
            logger.error(f"Error adding system update: {e}")
            import traceback
            traceback.print_exc()

        logger.info(f"FULL UPDATE COMPLETE FOR: {figure_id.upper()}")

    async def close_db_manager(self):
        # A helper to close the underlying manager if needed, though each class handles its own.
        await self.db._client.close()


async def main():
    """
    Main entry point for the master updater script.
    DEFAULT: Runs complete update (ingestion + processing) when no arguments provided.
    """
    parser = argparse.ArgumentParser(
        description="A master script to update and process data for public figures in Firestore.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    # Keep all your existing arguments
    parser.add_argument(
        '--figure',
        type=str,
        help="The ID of a single figure to process (e.g., 'newjeans')."
    )
    parser.add_argument(
        '--all-figures',
        action='store_true',
        help="Run the full update process for ALL figures in the database."
    )
    parser.add_argument(
        '--process-updated',
        action='store_true',
        help="Run update ONLY for figures found during the last ingestion."
    )
    parser.add_argument(
        '--run-ingestion',
        action='store_true',
        help="ONLY run the initial article ingestion process to find new figure mentions."
    )
    parser.add_argument(
        '--ingestion-limit',
        type=int,
        help="Limit the number of new articles to process during ingestion."
    )
    parser.add_argument(
        '--csv',
        type=str,
        default="./python/deepseek/k_celebrities_master.csv",
        help="Path to the CSV file for the article ingestion process."
    )

    args = parser.parse_args()
    master_updater = MasterUpdater()

    # Check if ANY argument was provided
    any_arg_provided = any([
        args.figure,
        args.all_figures,
        args.process_updated,
        args.run_ingestion
    ])

    # DEFAULT BEHAVIOR: Complete update when no arguments provided
    if not any_arg_provided:
        logger.info("=== RUNNING DEFAULT COMPLETE UPDATE ===")
        
        # STEP 1: Run ingestion to find updated figures
        logger.info("--- PHASE 1: INGESTION ---")
        extractor = PredefinedPublicFigureExtractor(csv_filepath=args.csv)
        updated_figure_names = await extractor.process_new_articles(limit=args.ingestion_limit)

        if updated_figure_names:
            logger.info(f"Ingestion found {len(updated_figure_names)} figures with new articles: {', '.join(updated_figure_names)}")
            # Convert names to the document ID format
            figure_ids = [name.lower().replace(" ", "").replace("-", "").replace(".", "") for name in updated_figure_names]
            
            # STEP 2: Immediately process those figures
            logger.info(f"--- PHASE 2: PROCESSING {len(figure_ids)} UPDATED FIGURES ---")
            
            related_figures_updater = RelatedFiguresUpdater()
            for i, figure_id in enumerate(figure_ids):
                logger.info(f"--- Processing Updated Figure {i+1}/{len(figure_ids)} ---")
                await master_updater.run_full_update_for_figure(figure_id, related_figures_updater)
            
            logger.info("Complete update process finished!")
        else:
            logger.info("Ingestion complete. No new figures with articles were found.")
            logger.info("No processing needed.")
        
        return  # Exit here for default behavior

    # ALL YOUR EXISTING CONDITIONS REMAIN THE SAME:
    if args.run_ingestion:
        print("--- Running in INGESTION-ONLY mode ---")
        extractor = PredefinedPublicFigureExtractor(csv_filepath=args.csv)
        updated_figure_names = await extractor.process_new_articles(limit=args.ingestion_limit)

        if updated_figure_names:
            print(f"\nIngestion found {len(updated_figure_names)} figures with new articles: {', '.join(updated_figure_names)}")
            figure_ids = [name.lower().replace(" ", "").replace("-", "").replace(".", "") for name in updated_figure_names]
            
            with open("figures_to_update.json", "w") as f:
                json.dump(figure_ids, f)
            print("Successfully saved list to 'figures_to_update.json'.")
            print("Run the next step with: python run_full_update.py --process-updated")
        else:
            print("\nIngestion complete. No new figures with articles were found.")

    elif args.figure:
        related_figures_updater = RelatedFiguresUpdater()
        await master_updater.run_full_update_for_figure(args.figure, related_figures_updater)

    elif args.all_figures:
        print("\nPre-calculating all figure relationships for efficiency...")
        related_figures_updater = RelatedFiguresUpdater()
        
        all_ids = await master_updater.get_all_figure_ids()
        if not all_ids:
            print("No figures found to process.")
            return
            
        for i, figure_id in enumerate(all_ids):
            print(f"\n\n--- Processing Figure {i+1}/{len(all_ids)} ---")
            await master_updater.run_full_update_for_figure(figure_id, related_figures_updater)
        
        print("\n\nAll figures have been processed!")
        
    elif args.process_updated:
        print("--- Running in PROCESS-UPDATED mode ---")
        try:
            with open("figures_to_update.json", "r") as f:
                ids_to_process = json.load(f)
            
            if not ids_to_process:
                print("'figures_to_update.json' is empty. No figures to process.")
                return

            print(f"Found {len(ids_to_process)} figures to process from file.")
            
            related_figures_updater = RelatedFiguresUpdater()
            for i, figure_id in enumerate(ids_to_process):
                print(f"\n\n--- Processing Figure {i+1}/{len(ids_to_process)} ---")
                await master_updater.run_full_update_for_figure(figure_id, related_figures_updater)
            
            print("\n\nAll updated figures have been processed!")

        except FileNotFoundError:
            print("ERROR: 'figures_to_update.json' not found.")
            print("Please run the ingestion first with: python run_full_update.py --run-ingestion")


if __name__ == "__main__":
    asyncio.run(main())
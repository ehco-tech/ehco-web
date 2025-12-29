"""
Script to run the full update pipeline for NEW figures only.
Reads figure names from a CSV file and processes only those figures through:
- Article categorization
- Wiki content updates
- Timeline creation
- Document compaction
- Timeline compaction
- Related figures updates
"""

import asyncio
import argparse
import csv
import os
import logging
from typing import List

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s'
)
logger = logging.getLogger('run_update_for_new_figures')

# Import the same updater classes as run_full_update.py
from setup_firebase_deepseek import NewsManager
from UPDATE_article_categorizer import PublicFigureSummaryCategorizer as ArticleCategorizer
from UPDATE_wiki_content import PublicFigureWikiUpdater as WikiContentUpdater
from UPDATE_timeline import CurationEngine
from compact_overview import CompactOverview
from compact_event_summaries_descriptions import DataUpdater as TimelineCompactor
from related_figures import RelatedFiguresUpdater


class NewFiguresUpdater:
    """Runs the full update pipeline for figures specified in a CSV file"""

    def __init__(self):
        logger.info("Initializing NewFiguresUpdater")
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        logger.info("NewFiguresUpdater initialized successfully")

    def load_figure_names_from_csv(self, csv_filepath: str) -> List[str]:
        """
        Load figure names from CSV file and convert to document IDs.

        Args:
            csv_filepath: Path to CSV file with Name column

        Returns:
            List of figure document IDs (lowercase, no spaces/dashes/dots)
        """
        if not os.path.exists(csv_filepath):
            logger.error(f"CSV file not found: {csv_filepath}")
            return []

        figure_names = []

        try:
            with open(csv_filepath, 'r', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)

                # Check if Name column exists
                first_row = next(reader, None)
                if first_row is None:
                    logger.error("CSV file is empty")
                    return []

                if 'Name' not in first_row:
                    logger.error("CSV file must have a 'Name' column")
                    return []

                # Reset to beginning and re-read
                csvfile.seek(0)
                reader = csv.DictReader(csvfile)

                for row in reader:
                    name = row.get('Name', '').strip()
                    if name:
                        figure_names.append(name)

            logger.info(f"Loaded {len(figure_names)} figure names from CSV")
            return figure_names

        except Exception as e:
            logger.error(f"Error loading CSV file: {e}")
            return []

    def convert_name_to_doc_id(self, name: str) -> str:
        """
        Convert figure name to document ID format.
        Same logic as used throughout the codebase.

        Args:
            name: Figure name (e.g., "SHINee", "IU (Lee Ji-eun)")

        Returns:
            Document ID (e.g., "shinee", "iuleejieun")
        """
        return name.lower().replace(" ", "").replace("-", "").replace(".", "").replace("(", "").replace(")", "")

    async def run_full_update_for_figure(self, figure_id: str, related_updater: RelatedFiguresUpdater):
        """
        Runs the complete, ordered update and compaction pipeline for a single figure.
        This is the SAME logic as in run_full_update.py
        """
        logger.info(f"STARTING FULL UPDATE FOR: {figure_id.upper()}")

        # STEP 1: Categorize new article summaries
        logger.info("STEP 1 of 6: Categorizing new articles")
        categorizer = ArticleCategorizer()
        categorization_result = await categorizer.process_summaries(figure_id=figure_id)

        if categorization_result:
            if hasattr(categorization_result, 'new_articles'):
                logger.info(f"Found {len(categorization_result.new_articles)} new articles")

        # STEP 2: Update Wiki Content with new summaries
        logger.info("STEP 2 of 6: Updating wiki content")
        wiki_updater = WikiContentUpdater()
        wiki_result = await wiki_updater.update_all_wiki_content(specific_figure_id=figure_id)

        if wiki_result:
            if hasattr(wiki_result, 'updated_sections'):
                logger.info(f"Found {len(wiki_result.updated_sections)} updated wiki sections")

        # STEP 3: Update Curated Timeline and mark articles as processed
        logger.info("STEP 3 of 6: Updating curated timeline")
        curation_engine = CurationEngine(figure_id=figure_id)
        timeline_result = await curation_engine.run_incremental_update()

        if timeline_result and isinstance(timeline_result, dict) and 'new_events' in timeline_result:
            logger.info(f"Found {len(timeline_result['new_events'])} new timeline events")

        # STEP 4: Run the document compactor
        logger.info("STEP 4 of 6: Running document compactor")
        compactor = CompactOverview()
        compaction_result = await compactor.compact_figure_overview(figure_id=figure_id)

        # STEP 5: Run the timeline compactor
        logger.info("STEP 5 of 6: Running timeline compactor")
        timeline_compactor = TimelineCompactor(figure_id=figure_id)
        await timeline_compactor.run_update()

        # STEP 6: Update related figures count
        logger.info("STEP 6 of 6: Updating related figures count")
        related_result = related_updater.update_for_figure(figure_id)

        logger.info(f"FULL UPDATE COMPLETE FOR: {figure_id.upper()}\n")

    async def process_figures_from_csv(self, csv_filepath: str):
        """
        Main method to process all figures from CSV file through the full pipeline.

        Args:
            csv_filepath: Path to CSV file containing figure names
        """
        logger.info("="*60)
        logger.info("NEW FIGURES FULL UPDATE PIPELINE")
        logger.info("="*60)
        logger.info(f"CSV file: {csv_filepath}")

        # Load figure names from CSV
        figure_names = self.load_figure_names_from_csv(csv_filepath)

        if not figure_names:
            logger.error("No figures found in CSV file. Exiting.")
            return

        # Convert names to document IDs
        figure_ids = [self.convert_name_to_doc_id(name) for name in figure_names]

        logger.info(f"Processing {len(figure_ids)} figures through full pipeline")
        logger.info(f"Preview: {', '.join(figure_ids[:5])}{'...' if len(figure_ids) > 5 else ''}")
        logger.info("="*60 + "\n")

        # Create related figures updater once for efficiency
        related_figures_updater = RelatedFiguresUpdater()

        # Process each figure
        for i, figure_id in enumerate(figure_ids):
            logger.info(f"--- Processing Figure {i+1}/{len(figure_ids)}: {figure_id} ---")

            try:
                await self.run_full_update_for_figure(figure_id, related_figures_updater)
            except Exception as e:
                logger.error(f"Error processing figure '{figure_id}': {e}")
                logger.info(f"Continuing with next figure...")
                continue

        logger.info("\n" + "="*60)
        logger.info("ALL FIGURES PROCESSED SUCCESSFULLY")
        logger.info("="*60)

    async def close_db_manager(self):
        """Close async clients"""
        # Close the DeepSeek API client
        await self.news_manager.close()
        # Note: Firestore Admin SDK doesn't require explicit connection closing


async def main():
    parser = argparse.ArgumentParser(
        description='Run full update pipeline for NEW figures specified in CSV file',
        formatter_class=argparse.RawTextHelpFormatter
    )

    parser.add_argument(
        '--csv',
        type=str,
        default="new_figures_1217.csv",
        help="Path to CSV file containing ONLY the newly added figures (default: new_figures_1217.csv)"
    )

    args = parser.parse_args()

    # Create updater and process figures
    updater = NewFiguresUpdater()

    try:
        await updater.process_figures_from_csv(args.csv)
    finally:
        await updater.close_db_manager()


if __name__ == "__main__":
    asyncio.run(main())

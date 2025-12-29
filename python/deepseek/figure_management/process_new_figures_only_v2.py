"""
Script to process NEW figures only across ALL existing articles.
This script reads from a separate CSV file containing only newly added figures
and searches for them in all articles, regardless of the public_figures_processed marker.

VERSION 2: With improved error handling and retry logic
"""

import asyncio
import argparse
from typing import List, Set
from predefined_public_figure_extractor import PredefinedPublicFigureExtractor
from utilities.setup_firebase_deepseek import NewsManager
from firebase_admin import firestore
import json
import re


class NewFiguresProcessor(PredefinedPublicFigureExtractor):
    """
    Extended processor that searches for new figures in ALL articles,
    ignoring the public_figures_processed marker.
    """

    async def _find_mentioned_figures_with_retry(self, text, max_retries=3):
        """
        Enhanced version with retry logic and better error handling.
        """
        if not text or not isinstance(text, str):
            print("Empty or invalid text provided")
            return []

        for attempt in range(max_retries):
            try:
                print(f"  Attempt {attempt + 1}/{max_retries} to find mentioned figures...")

                # Use the parent class method
                result = await self._find_mentioned_figures(text)

                # If we got a valid result, return it
                if result is not None:
                    return result

                # If empty result, wait before retry
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2  # 2, 4, 6 seconds
                    print(f"  Empty response. Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)

            except Exception as e:
                print(f"  Error on attempt {attempt + 1}: {str(e)}")
                if attempt < max_retries - 1:
                    wait_time = (attempt + 1) * 2
                    print(f"  Waiting {wait_time}s before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    print(f"  Max retries reached. Skipping this article.")
                    return []

        return []

    async def process_new_figures_in_all_articles(self, limit=None, batch_size=5, start_after_article_id=None):
        """
        Process new figures from the CSV across ALL articles in the database.
        This ignores the public_figures_processed marker.

        Args:
            limit (int, optional): Limit the number of articles to process
            batch_size (int, optional): Process articles in batches with delays
            start_after_article_id (str, optional): Article ID to resume processing after (useful if interrupted)

        Returns:
            dict: Statistics about the processing
        """
        print(f"\n=== Processing {len(self.predefined_names)} NEW figures across ALL articles ===")
        print(f"New figures to search for: {', '.join(self.predefined_names)}\n")

        stats = {
            "articles_processed": 0,
            "articles_with_new_figures": 0,
            "new_figure_mentions": 0,
            "summaries_created": 0,
            "figures_found": set(),
            "errors": 0
        }

        try:
            # Fetch ALL articles from the database
            print("Fetching all articles from database...")
            query = self.news_manager.db.collection("newsArticles")
            query = query.order_by("contentID", direction=firestore.Query.DESCENDING)

            # Add start_after functionality for resuming interrupted processing
            if start_after_article_id:
                print(f"Resuming processing after article ID: {start_after_article_id}")
                start_doc_ref = self.news_manager.db.collection("newsArticles").document(start_after_article_id)
                start_doc = start_doc_ref.get()
                if start_doc.exists:
                    query = query.start_after(start_doc)
                    print(f"Successfully positioned query to start after article: {start_after_article_id}")
                else:
                    print(f"⚠ Warning: Article ID '{start_after_article_id}' not found. Starting from beginning.")

            if limit:
                query = query.limit(limit)
                print(f"Limited to processing {limit} articles")

            articles = [{"id": doc.id, "data": doc.to_dict()} for doc in query.stream()]

            if not articles:
                print("No articles found in database.")
                return stats

            print(f"Found {len(articles)} total articles to search through.\n")

            # Process each article
            for i, article in enumerate(articles):
                article_id = article["id"]
                article_data = article.get("data", {})
                body = article_data.get("body", "")

                # Batch progress with pause
                if i > 0 and i % batch_size == 0:
                    print(f"\n--- Batch pause (processed {i} articles) ---")
                    print("Waiting 5 seconds to avoid rate limiting...")
                    await asyncio.sleep(5)
                    print("Resuming...\n")

                # Progress indicator
                print(f"\n[{i+1}/{len(articles)}] Processing article: {article_id}")
                stats["articles_processed"] += 1

                if not body:
                    print("  ⚠ No body content, skipping")
                    continue

                # Search for NEW figures in this article with retry logic
                try:
                    mentioned_new_figures = await self._find_mentioned_figures_with_retry(body)
                except Exception as e:
                    print(f"  ✗ Failed to process article: {e}")
                    stats["errors"] += 1
                    continue

                # Apply hierarchy expansion
                if mentioned_new_figures:
                    mentioned_new_figures = self._expand_mentioned_figures_with_hierarchy(mentioned_new_figures)

                if not mentioned_new_figures:
                    print("  → No new figures found")
                    continue

                # Found new figures in this article!
                print(f"  ✓ Found NEW figures: {', '.join(mentioned_new_figures)}")

                stats["articles_with_new_figures"] += 1
                stats["new_figure_mentions"] += len(mentioned_new_figures)
                stats["figures_found"].update(mentioned_new_figures)

                # Update the article's public_figures array to include the new figures
                existing_figures = article_data.get("public_figures", [])
                updated_figures = list(set(existing_figures + mentioned_new_figures))

                self.news_manager.db.collection("newsArticles").document(article_id).update({
                    "public_figures": updated_figures
                })

                # Process each new figure mention
                for public_figure_name in mentioned_new_figures:
                    try:
                        await self.process_single_figure_mention(
                            public_figure_name=public_figure_name,
                            article_id=article_id,
                            article_data=article_data
                        )
                        stats["summaries_created"] += 1
                        print(f"    → Created summary for {public_figure_name}")
                    except Exception as e:
                        print(f"    ✗ Failed to create summary for {public_figure_name}: {e}")
                        stats["errors"] += 1

            # Print final statistics
            print("\n" + "="*60)
            print("PROCESSING COMPLETE - STATISTICS")
            print("="*60)
            print(f"Total articles searched: {stats['articles_processed']}")
            print(f"Articles with new figures: {stats['articles_with_new_figures']}")
            print(f"Total new figure mentions: {stats['new_figure_mentions']}")
            print(f"Summaries created: {stats['summaries_created']}")
            print(f"Errors encountered: {stats['errors']}")
            print(f"\nNew figures actually found in articles ({len(stats['figures_found'])}):")
            for figure in sorted(stats['figures_found']):
                print(f"  - {figure}")
            print("="*60 + "\n")

            return stats

        except Exception as e:
            print(f"Fatal error during processing: {e}")
            raise
        finally:
            await self.news_manager.close()


async def main():
    parser = argparse.ArgumentParser(
        description='Process NEW figures only across ALL existing articles (V2 with retry logic)',
        formatter_class=argparse.RawTextHelpFormatter
    )

    parser.add_argument(
        '--csv',
        type=str,
        default="new_figures_1216.csv",
        help="Path to CSV file containing ONLY the newly added figures"
    )

    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help="Limit the number of articles to process (for testing)"
    )

    parser.add_argument(
        '--batch-size',
        type=int,
        default=5,
        help="Number of articles to process before pausing (default: 5)"
    )

    parser.add_argument(
        '--start-after',
        type=str,
        default=None,
        help="Article ID to resume processing after (useful if script was interrupted)"
    )

    args = parser.parse_args()

    print("\n" + "="*60)
    print("NEW FIGURES PROCESSOR V2 (with retry logic)")
    print("="*60)
    print(f"CSV file: {args.csv}")
    print(f"Batch size: {args.batch_size} articles")
    if args.limit:
        print(f"Article limit: {args.limit} (testing mode)")
    else:
        print("Article limit: None (processing ALL articles)")
    if args.start_after:
        print(f"Resume point: Starting after article '{args.start_after}'")
    print("="*60 + "\n")

    # Create processor with the new figures CSV
    processor = NewFiguresProcessor(csv_filepath=args.csv)

    # Process new figures across all articles
    await processor.process_new_figures_in_all_articles(
        limit=args.limit,
        batch_size=args.batch_size,
        start_after_article_id=args.start_after
    )

    print("\n✓ Processing complete!\n")


if __name__ == "__main__":
    asyncio.run(main())

"""
Script to process NEW figures only across ALL existing articles.
This script reads from a separate CSV file containing only newly added figures
and searches for them in all articles, regardless of the public_figures_processed marker.
"""

import asyncio
import argparse
from typing import List, Set
from predefined_public_figure_extractor import PredefinedPublicFigureExtractor
from setup_firebase_deepseek import NewsManager
from firebase_admin import firestore
import time


class NewFiguresProcessor(PredefinedPublicFigureExtractor):
    """
    Extended processor that searches for new figures in ALL articles,
    ignoring the public_figures_processed marker.
    """

    async def process_new_figures_in_all_articles(self, limit=None):
        """
        Process new figures from the CSV across ALL articles in the database.
        This ignores the public_figures_processed marker.

        Args:
            limit (int, optional): Limit the number of articles to process

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
            "figures_found": set()
        }

        try:
            # Fetch ALL articles from the database
            print("Fetching all articles from database...")
            query = self.news_manager.db.collection("newsArticles")
            query = query.order_by("contentID", direction=firestore.Query.DESCENDING)

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

                # Progress indicator every 10 articles
                if (i + 1) % 10 == 0:
                    print(f"Progress: {i+1}/{len(articles)} articles processed...")

                stats["articles_processed"] += 1

                if not body:
                    continue

                # Add a small delay to avoid rate limiting
                await asyncio.sleep(0.5)

                # Search for NEW figures in this article
                mentioned_new_figures = await self._find_mentioned_figures(body)

                # Apply hierarchy expansion
                mentioned_new_figures = self._expand_mentioned_figures_with_hierarchy(mentioned_new_figures)

                if not mentioned_new_figures:
                    continue

                # Found new figures in this article!
                print(f"\n[Article {i+1}/{len(articles)}] ID: {article_id}")
                print(f"  Found NEW figures: {', '.join(mentioned_new_figures)}")

                stats["articles_with_new_figures"] += 1
                stats["new_figure_mentions"] += len(mentioned_new_figures)
                stats["figures_found"].update(mentioned_new_figures)

                # Update the article's public_figures array to include the new figures
                # (this adds to existing figures without removing old ones)
                existing_figures = article_data.get("public_figures", [])
                updated_figures = list(set(existing_figures + mentioned_new_figures))

                self.news_manager.db.collection("newsArticles").document(article_id).update({
                    "public_figures": updated_figures
                })

                # Process each new figure mention
                for public_figure_name in mentioned_new_figures:
                    await self.process_single_figure_mention(
                        public_figure_name=public_figure_name,
                        article_id=article_id,
                        article_data=article_data
                    )
                    stats["summaries_created"] += 1

            # Print final statistics
            print("\n" + "="*60)
            print("PROCESSING COMPLETE - STATISTICS")
            print("="*60)
            print(f"Total articles searched: {stats['articles_processed']}")
            print(f"Articles with new figures: {stats['articles_with_new_figures']}")
            print(f"Total new figure mentions: {stats['new_figure_mentions']}")
            print(f"Summaries created: {stats['summaries_created']}")
            print(f"\nNew figures actually found in articles:")
            for figure in sorted(stats['figures_found']):
                print(f"  - {figure}")
            print("="*60 + "\n")

            return stats

        except Exception as e:
            print(f"Error during processing: {e}")
            raise
        finally:
            await self.news_manager.close()


async def main():
    parser = argparse.ArgumentParser(
        description='Process NEW figures only across ALL existing articles',
        formatter_class=argparse.RawTextHelpFormatter
    )

    parser.add_argument(
        '--csv',
        type=str,
        default="new_figures_1216.csv",
        help="Path to CSV file containing ONLY the newly added figures (default: new_figures.csv)"
    )

    parser.add_argument(
        '--limit',
        type=int,
        default=None,
        help="Limit the number of articles to process (for testing)"
    )

    args = parser.parse_args()

    print("\n" + "="*60)
    print("NEW FIGURES PROCESSOR")
    print("="*60)
    print(f"CSV file: {args.csv}")
    if args.limit:
        print(f"Article limit: {args.limit} (testing mode)")
    else:
        print("Article limit: None (processing ALL articles)")
    print("="*60 + "\n")

    # Create processor with the new figures CSV
    processor = NewFiguresProcessor(csv_filepath=args.csv)

    # Process new figures across all articles
    await processor.process_new_figures_in_all_articles(limit=args.limit)

    print("\n✓ Processing complete!\n")


if __name__ == "__main__":
    asyncio.run(main())

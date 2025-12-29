"""
Script to update the totalArticles counter in Firestore stats/counters document.

This script:
1. Counts all documents in the 'newsArticles' collection
2. Updates the stats/counters document with the current count

Designed to run as part of automated workflows (GitHub Actions).

Usage:
    python update_article_counter.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utilities.setup_firebase_deepseek import NewsManager
from firebase_admin import firestore

class ArticleCounterUpdater:
    def __init__(self):
        """Initialize the article counter updater."""
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        print("✓ ArticleCounterUpdater initialized")
    
    def count_articles(self):
        """Count total number of documents in newsArticles collection."""
        try:
            articles_ref = self.db.collection('newsArticles')
            
            # Stream all documents and count them
            articles = list(articles_ref.stream())
            count = len(articles)
            
            print(f"\n📊 Counting Articles...")
            print(f"   Total Articles: {count:,}")
            
            return count
            
        except Exception as e:
            print(f"❌ Error counting articles: {e}")
            raise
    
    def update_counter(self, total_articles):
        """Update the totalArticles counter in stats/counters document."""
        try:
            stats_ref = self.db.collection('stats').document('counters')
            
            # Update the counter
            stats_ref.update({
                'totalArticles': total_articles,
                'lastUpdated': firestore.SERVER_TIMESTAMP
            })
            
            print(f"\n✅ Successfully updated article counter!")
            print(f"   Location: stats/counters")
            print(f"   Total Articles: {total_articles:,}")
            
            return True
            
        except Exception as e:
            print(f"\n❌ Error updating counter: {e}")
            raise
    
    def run(self):
        """Execute the counter update process."""
        print("\n" + "="*60)
        print("ARTICLE COUNTER UPDATE")
        print("="*60)
        
        # Count articles
        total_articles = self.count_articles()
        
        # Update Firestore
        self.update_counter(total_articles)
        
        print("\n" + "="*60 + "\n")


def main():
    """Run the article counter update."""
    updater = ArticleCounterUpdater()
    updater.run()


if __name__ == "__main__":
    main()
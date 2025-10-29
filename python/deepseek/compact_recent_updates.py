"""
Compact Recent Updates Script

This script compacts the 'eventPointDescription' field in the 'recent-updates' collection
to make descriptions more concise for display on the homepage feed.

Usage:
    python compact_recent_updates.py
    python compact_recent_updates.py --limit 50
    python compact_recent_updates.py --force  # Re-compact already compacted entries
"""

import asyncio
import argparse
from setup_firebase_deepseek import NewsManager
from typing import Optional


class RecentUpdatesCompactor:
    """Compacts eventPointDescription in recent-updates collection for better display."""
    
    MAX_DESCRIPTION_LENGTH = 150  # Target length for descriptions
    
    def __init__(self):
        """Initialize the compactor with NewsManager."""
        self.manager = NewsManager()
        self.db = self.manager.db
        self.client = self.manager.client
        self.model = self.manager.model
        print("✓ RecentUpdatesCompactor initialized")
    
    async def compact_description(self, description: str) -> str:
        """
        Uses AI to create a concise version of the event point description.
        
        Args:
            description: Original long description
            
        Returns:
            Compacted description (max ~150 characters)
        """
        system_prompt = """You are an expert at creating concise, engaging news headlines and descriptions.
Your task is to condense event descriptions into short, punchy summaries that capture the key information.

Rules:
1. Maximum 150 characters
2. Focus on WHO, WHAT, WHEN
3. Remove unnecessary details
4. Keep specific dates, names, locations
5. Use active voice
6. Make it engaging and newsworthy"""

        user_prompt = f"""Condense this event description to maximum 150 characters while keeping the key information:

Original: "{description}"

Create a short, engaging summary that captures the essence of what happened."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            )
            
            compacted = response.choices[0].message.content.strip()
            
            # Remove quotes if AI added them
            if compacted.startswith('"') and compacted.endswith('"'):
                compacted = compacted[1:-1]
            if compacted.startswith("'") and compacted.endswith("'"):
                compacted = compacted[1:-1]
            
            # Ensure it's not too long
            if len(compacted) > self.MAX_DESCRIPTION_LENGTH:
                compacted = compacted[:self.MAX_DESCRIPTION_LENGTH-3] + "..."
            
            return compacted
            
        except Exception as e:
            print(f"    Error during AI compaction: {e}")
            # Fallback: simple truncation
            if len(description) > self.MAX_DESCRIPTION_LENGTH:
                return description[:self.MAX_DESCRIPTION_LENGTH-3] + "..."
            return description
    
    async def compact_all_updates(self, limit: Optional[int] = None, force: bool = False):
        """
        Compacts eventPointDescription for all entries in recent-updates collection.
        
        Args:
            limit: Maximum number of documents to process (None = all)
            force: If True, re-compact already compacted entries
        """
        print("\n--- Starting Recent Updates Compaction ---")
        
        try:
            # Get all documents from recent-updates
            cache_ref = self.db.collection('recent-updates')
            
            # Order by publishDate to process most recent first
            query = cache_ref.order_by('publishDate', direction='DESCENDING')
            
            if limit:
                query = query.limit(limit)
            
            all_docs = list(query.stream())
            
            print(f"Found {len(all_docs)} documents in recent-updates collection")
            
            if len(all_docs) == 0:
                print("No documents to process. Exiting.")
                return
            
            # Process each document
            processed_count = 0
            skipped_count = 0
            error_count = 0
            
            for idx, doc in enumerate(all_docs):
                doc_data = doc.to_dict()
                doc_id = doc.id
                
                # Check if already compacted
                is_compacted = doc_data.get('isDescriptionCompacted', False)
                
                if is_compacted and not force:
                    skipped_count += 1
                    if idx < 5:  # Show first few
                        print(f"  [{idx+1}/{len(all_docs)}] Skipping {doc_id} - already compacted")
                    continue
                
                # Get the description
                description = doc_data.get('eventPointDescription', '')
                
                if not description:
                    skipped_count += 1
                    print(f"  [{idx+1}/{len(all_docs)}] Skipping {doc_id} - no description")
                    continue
                
                # Check if description is already short enough
                if len(description) <= self.MAX_DESCRIPTION_LENGTH and not force:
                    # Mark as compacted without AI call
                    doc.reference.update({
                        'isDescriptionCompacted': True
                    })
                    skipped_count += 1
                    print(f"  [{idx+1}/{len(all_docs)}] {doc_id} - already short enough")
                    continue
                
                # Compact the description
                print(f"  [{idx+1}/{len(all_docs)}] Compacting {doc_id}...")
                print(f"    Original ({len(description)} chars): {description[:80]}...")
                
                try:
                    compacted_description = await self.compact_description(description)
                    
                    # Update the document
                    from firebase_admin import firestore
                    doc.reference.update({
                        'eventPointDescription': compacted_description,
                        'originalEventPointDescription': description,  # Backup
                        'isDescriptionCompacted': True,
                        'compactedAt': firestore.SERVER_TIMESTAMP
                    })
                    
                    processed_count += 1
                    print(f"    Compacted ({len(compacted_description)} chars): {compacted_description}")
                    print(f"    ✓ Updated successfully")
                    
                except Exception as e:
                    error_count += 1
                    print(f"    ✗ Error processing {doc_id}: {e}")
            
            # Summary
            print(f"\n--- Compaction Complete ---")
            print(f"Total documents: {len(all_docs)}")
            print(f"Processed: {processed_count}")
            print(f"Skipped: {skipped_count}")
            print(f"Errors: {error_count}")
            
        except Exception as e:
            print(f"Error during compaction: {e}")
        
        finally:
            await self.manager.close()
    
    async def compact_recent_n(self, n: int = 50):
        """
        Compacts only the N most recent updates.
        Useful for daily runs to compact only new entries.
        
        Args:
            n: Number of most recent updates to check/compact
        """
        print(f"\n--- Compacting {n} Most Recent Updates ---")
        await self.compact_all_updates(limit=n, force=False)


async def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Compact eventPointDescription in recent-updates collection for better display.",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        '--limit',
        type=int,
        help='Maximum number of documents to process (default: all)',
        default=None
    )
    
    parser.add_argument(
        '--force',
        action='store_true',
        help='Re-compact already compacted entries'
    )
    
    parser.add_argument(
        '--recent',
        type=int,
        help='Compact only the N most recent updates (useful for daily runs)',
        default=None
    )
    
    args = parser.parse_args()
    
    compactor = RecentUpdatesCompactor()
    
    if args.recent:
        # Compact only recent entries (for scheduled runs)
        await compactor.compact_recent_n(n=args.recent)
    else:
        # Compact all or limited entries
        await compactor.compact_all_updates(limit=args.limit, force=args.force)


if __name__ == "__main__":
    asyncio.run(main())
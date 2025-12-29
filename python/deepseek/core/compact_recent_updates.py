"""
Compact Recent Updates Script

This script compacts the 'eventPointDescription' and 'eventSummary' fields in the 'recent-updates' collection
to make descriptions more concise for display on the homepage feed.

Usage:
    python compact_recent_updates.py
    python compact_recent_updates.py --limit 50
    python compact_recent_updates.py --force  # Re-compact already compacted entries
    python compact_recent_updates.py --fields summary  # Compact only eventSummary
    python compact_recent_updates.py --fields description  # Compact only eventPointDescription
    python compact_recent_updates.py --fields both  # Compact both (default)
"""

import asyncio
import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utilities.setup_firebase_deepseek import NewsManager
from typing import Optional, Literal


class RecentUpdatesCompactor:
    """Compacts eventPointDescription and eventSummary in recent-updates collection for better display."""
    
    MAX_DESCRIPTION_LENGTH = 150  # Target length for eventPointDescription
    MAX_SUMMARY_LENGTH = 200      # Target length for eventSummary
    
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
    
    async def compact_summary(self, summary: str) -> str:
        """
        Uses AI to create a concise version of the event summary.
        
        Args:
            summary: Original long summary
            
        Returns:
            Compacted summary (max ~200 characters)
        """
        system_prompt = """You are an expert at creating concise, engaging news summaries.
Your task is to condense event summaries into clear, informative paragraphs that capture the essential details.

Rules:
1. Maximum 200 characters
2. Focus on the main facts and implications
3. Keep it professional and informative
4. Preserve important context and details
5. Use clear, direct language
6. Maintain the tone of news reporting"""

        user_prompt = f"""Condense this event summary to maximum 200 characters while keeping the essential information:

Original: "{summary}"

Create a concise summary that captures the key facts and implications."""

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
            if len(compacted) > self.MAX_SUMMARY_LENGTH:
                compacted = compacted[:self.MAX_SUMMARY_LENGTH-3] + "..."
            
            return compacted
            
        except Exception as e:
            print(f"    Error during AI compaction: {e}")
            # Fallback: simple truncation
            if len(summary) > self.MAX_SUMMARY_LENGTH:
                return summary[:self.MAX_SUMMARY_LENGTH-3] + "..."
            return summary
    
    async def compact_all_updates(
        self, 
        limit: Optional[int] = None, 
        force: bool = False,
        fields: Literal['both', 'description', 'summary'] = 'both'
    ):
        """
        Compacts fields for all entries in recent-updates collection.
        
        Args:
            limit: Maximum number of documents to process (None = all)
            force: If True, re-compact already compacted entries
            fields: Which fields to compact ('both', 'description', 'summary')
        """
        print("\n--- Starting Recent Updates Compaction ---")
        print(f"Fields to compact: {fields}")
        
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
                
                # Determine which fields need processing
                should_process_description = fields in ['both', 'description']
                should_process_summary = fields in ['both', 'summary']
                
                # Check if already compacted
                is_description_compacted = doc_data.get('isDescriptionCompacted', False)
                is_summary_compacted = doc_data.get('isSummaryCompacted', False)
                
                # Skip if both are already compacted (when processing both)
                if fields == 'both' and is_description_compacted and is_summary_compacted and not force:
                    skipped_count += 1
                    if idx < 5:
                        print(f"  [{idx+1}/{len(all_docs)}] Skipping {doc_id} - both fields already compacted")
                    continue
                
                # Skip if specific field is already compacted
                if fields == 'description' and is_description_compacted and not force:
                    skipped_count += 1
                    if idx < 5:
                        print(f"  [{idx+1}/{len(all_docs)}] Skipping {doc_id} - description already compacted")
                    continue
                
                if fields == 'summary' and is_summary_compacted and not force:
                    skipped_count += 1
                    if idx < 5:
                        print(f"  [{idx+1}/{len(all_docs)}] Skipping {doc_id} - summary already compacted")
                    continue
                
                print(f"  [{idx+1}/{len(all_docs)}] Processing {doc_id}...")
                
                # Prepare update data
                from firebase_admin import firestore
                update_data = {}
                needs_update = False
                
                # Process eventPointDescription
                if should_process_description and (not is_description_compacted or force):
                    description = doc_data.get('eventPointDescription', '')
                    
                    if description:
                        # Check if already short enough
                        if len(description) <= self.MAX_DESCRIPTION_LENGTH and not force:
                            update_data['isDescriptionCompacted'] = True
                            needs_update = True
                            print(f"    Description already short enough ({len(description)} chars)")
                        else:
                            print(f"    Compacting description ({len(description)} chars): {description[:60]}...")
                            try:
                                compacted_description = await self.compact_description(description)
                                update_data['eventPointDescription'] = compacted_description
                                update_data['originalEventPointDescription'] = description
                                update_data['isDescriptionCompacted'] = True
                                update_data['descriptionCompactedAt'] = firestore.SERVER_TIMESTAMP
                                needs_update = True
                                print(f"    ✓ Compacted description ({len(compacted_description)} chars): {compacted_description}")
                            except Exception as e:
                                error_count += 1
                                print(f"    ✗ Error compacting description: {e}")
                    else:
                        print(f"    No description to compact")
                
                # Process eventSummary
                if should_process_summary and (not is_summary_compacted or force):
                    summary = doc_data.get('eventSummary', '')
                    
                    if summary:
                        # Check if already short enough
                        if len(summary) <= self.MAX_SUMMARY_LENGTH and not force:
                            update_data['isSummaryCompacted'] = True
                            needs_update = True
                            print(f"    Summary already short enough ({len(summary)} chars)")
                        else:
                            print(f"    Compacting summary ({len(summary)} chars): {summary[:60]}...")
                            try:
                                compacted_summary = await self.compact_summary(summary)
                                update_data['eventSummary'] = compacted_summary
                                update_data['originalEventSummary'] = summary
                                update_data['isSummaryCompacted'] = True
                                update_data['summaryCompactedAt'] = firestore.SERVER_TIMESTAMP
                                needs_update = True
                                print(f"    ✓ Compacted summary ({len(compacted_summary)} chars): {compacted_summary}")
                            except Exception as e:
                                error_count += 1
                                print(f"    ✗ Error compacting summary: {e}")
                    else:
                        print(f"    No summary to compact")
                
                # Update the document if there are changes
                if needs_update:
                    try:
                        doc.reference.update(update_data)
                        processed_count += 1
                        print(f"    ✓ Document updated successfully")
                    except Exception as e:
                        error_count += 1
                        print(f"    ✗ Error updating document: {e}")
                else:
                    skipped_count += 1
                    print(f"    No updates needed")
            
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
    
    async def compact_recent_n(
        self, 
        n: int = 50,
        fields: Literal['both', 'description', 'summary'] = 'both'
    ):
        """
        Compacts only the N most recent updates.
        Useful for daily runs to compact only new entries.
        
        Args:
            n: Number of most recent updates to check/compact
            fields: Which fields to compact ('both', 'description', 'summary')
        """
        print(f"\n--- Compacting {n} Most Recent Updates ---")
        await self.compact_all_updates(limit=n, force=False, fields=fields)


async def main():
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="Compact eventPointDescription and eventSummary in recent-updates collection for better display.",
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
    
    parser.add_argument(
        '--fields',
        type=str,
        choices=['both', 'description', 'summary'],
        default='both',
        help='Which fields to compact: both (default), description (eventPointDescription only), or summary (eventSummary only)'
    )
    
    args = parser.parse_args()
    
    compactor = RecentUpdatesCompactor()
    
    if args.recent:
        # Compact only recent entries (for scheduled runs)
        await compactor.compact_recent_n(n=args.recent, fields=args.fields)
    else:
        # Compact all or limited entries
        await compactor.compact_all_updates(limit=args.limit, force=args.force, fields=args.fields)


if __name__ == "__main__":
    asyncio.run(main())
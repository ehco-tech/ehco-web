"""
MANAGE_backups.py

View and restore backups created by the repair scripts.

Usage:
    python MANAGE_backups.py --list                     # List all backups
    python MANAGE_backups.py --list --figure gdragon    # List backups for specific figure
    python MANAGE_backups.py --restore gdragon article_12345  # Restore specific document
    python MANAGE_backups.py --delete-backups --figure gdragon  # Delete backups after confirming repairs
"""

import asyncio
import argparse
from typing import List, Dict, Any
import logging
from datetime import datetime

from utilities.setup_firebase_deepseek import NewsManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('manage_backups')


class BackupManager:
    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        
    async def close(self):
        await self.news_manager.close()
    
    async def list_all_backups(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        List all backups across all figures.
        Returns dict mapping figure_id to list of backup documents.
        """
        logger.info("Scanning all figures for backups...")
        all_backups = {}
        
        figures_ref = self.db.collection("selected-figures").stream()
        
        for figure_doc in figures_ref:
            figure_id = figure_doc.id
            backups = await self.list_figure_backups(figure_id, verbose=False)
            
            if backups:
                all_backups[figure_id] = backups
        
        # Summary
        total_backups = sum(len(backups) for backups in all_backups.values())
        logger.info(f"\n{'='*60}")
        logger.info(f"BACKUP SUMMARY")
        logger.info(f"Figures with backups: {len(all_backups)}")
        logger.info(f"Total backups: {total_backups}")
        logger.info(f"{'='*60}\n")
        
        if all_backups:
            logger.info("Backups by figure:")
            for fig_id, backups in all_backups.items():
                logger.info(f"  {fig_id}: {len(backups)} backups")
        
        return all_backups
    
    async def list_figure_backups(self, figure_id: str, verbose: bool = True) -> List[Dict[str, Any]]:
        """
        List all backups for a specific figure.
        """
        if verbose:
            logger.info(f"\nListing backups for: {figure_id}")
            logger.info("=" * 80)
        
        backups = []
        
        try:
            backup_ref = self.db.collection("selected-figures").document(figure_id) \
                            .collection("article-summaries-backup").stream()
            
            for backup_doc in backup_ref:
                backup_data = backup_doc.to_dict()
                backups.append({
                    "document_id": backup_doc.id,
                    "original_document_id": backup_data.get("original_document_id", backup_doc.id),
                    "title": backup_data.get("title", "Unknown"),
                    "backup_timestamp": backup_data.get("backup_timestamp", "Unknown"),
                    "backup_reason": backup_data.get("backup_reason", "Unknown"),
                    "full_data": backup_data
                })
            
            if verbose:
                if backups:
                    logger.info(f"Found {len(backups)} backups:\n")
                    for backup in backups:
                        logger.info(f"  Document ID: {backup['document_id']}")
                        logger.info(f"  Original ID: {backup['original_document_id']}")
                        logger.info(f"  Title: {backup['title']}")
                        logger.info(f"  Timestamp: {backup['backup_timestamp']}")
                        logger.info(f"  Reason: {backup['backup_reason']}")
                        logger.info(f"  " + "-" * 76)
                else:
                    logger.info("No backups found for this figure.")
            
        except Exception as e:
            logger.error(f"Error listing backups for {figure_id}: {e}")
        
        return backups
    
    async def restore_backup(self, figure_id: str, document_id: str) -> bool:
        """
        Restore a backed-up document to the article-summaries collection.
        """
        logger.info(f"\nRestoring backup: {figure_id}/{document_id}")
        
        try:
            # Get the backup document
            backup_ref = self.db.collection("selected-figures").document(figure_id) \
                            .collection("article-summaries-backup").document(document_id)
            backup_doc = backup_ref.get()
            
            if not backup_doc.exists:
                logger.error(f"Backup document not found: {document_id}")
                return False
            
            backup_data = backup_doc.to_dict()
            
            # Remove backup metadata before restoring
            restore_data = {k: v for k, v in backup_data.items() 
                          if k not in ['backup_timestamp', 'backup_reason', 'original_document_id']}
            
            # Get the original document ID (might be different from backup doc ID)
            original_doc_id = backup_data.get('original_document_id', document_id)
            
            logger.info(f"  Title: {backup_data.get('title', 'Unknown')}")
            logger.info(f"  Restoring to: article-summaries/{original_doc_id}")
            
            # Restore to article-summaries
            restore_ref = self.db.collection("selected-figures").document(figure_id) \
                             .collection("article-summaries").document(original_doc_id)
            restore_ref.set(restore_data)
            
            logger.info(f"  ✅ Successfully restored {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Error restoring backup: {e}")
            return False
    
    async def delete_backups(self, figure_id: str, confirm: bool = False) -> int:
        """
        Delete all backups for a figure (after confirming repairs worked).
        Returns number of backups deleted.
        """
        if not confirm:
            logger.warning("⚠️  This will permanently delete backups!")
            logger.warning("   Add --confirm flag if you're sure.")
            return 0
        
        logger.info(f"\nDeleting backups for: {figure_id}")
        
        backups = await self.list_figure_backups(figure_id, verbose=False)
        
        if not backups:
            logger.info("No backups to delete.")
            return 0
        
        deleted = 0
        for backup in backups:
            try:
                self.db.collection("selected-figures").document(figure_id) \
                   .collection("article-summaries-backup").document(backup['document_id']).delete()
                deleted += 1
                logger.info(f"  ✓ Deleted backup: {backup['document_id']}")
            except Exception as e:
                logger.error(f"  ✗ Failed to delete {backup['document_id']}: {e}")
        
        logger.info(f"\n✅ Deleted {deleted} backups")
        return deleted


async def main():
    parser = argparse.ArgumentParser(
        description="Manage backups created by repair scripts",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        '--list',
        action='store_true',
        help="List all backups (or use with --figure for specific figure)"
    )
    
    parser.add_argument(
        '--figure',
        type=str,
        help="Specify a figure ID"
    )
    
    parser.add_argument(
        '--restore',
        nargs=2,
        metavar=('FIGURE_ID', 'DOCUMENT_ID'),
        help="Restore a specific backup: --restore gdragon article_12345"
    )
    
    parser.add_argument(
        '--delete-backups',
        action='store_true',
        help="Delete all backups for a figure (requires --figure and --confirm)"
    )
    
    parser.add_argument(
        '--confirm',
        action='store_true',
        help="Confirm destructive operations"
    )
    
    args = parser.parse_args()
    
    manager = BackupManager()
    
    try:
        if args.list:
            if args.figure:
                await manager.list_figure_backups(args.figure)
            else:
                await manager.list_all_backups()
        
        elif args.restore:
            figure_id, document_id = args.restore
            await manager.restore_backup(figure_id, document_id)
        
        elif args.delete_backups:
            if not args.figure:
                logger.error("Please specify --figure with --delete-backups")
            else:
                await manager.delete_backups(args.figure, confirm=args.confirm)
        
        else:
            parser.print_help()
    
    except Exception as e:
        logger.error(f"Error: {e}")
        raise
    finally:
        await manager.close()


if __name__ == "__main__":
    asyncio.run(main())
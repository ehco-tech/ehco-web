"""
REPAIR_malformed_summaries_ENHANCED.py

Enhanced version that can handle:
1. Complete valid JSON objects in summary field
2. Incomplete/truncated JSON 
3. Malformed JSON strings
4. Mixed content with JSON embedded

This addresses cases where JSON is cut off mid-string, like:
{
  "summary": "...",
  "events": [
    {"date": "2018-05-20", "event": "..."}
  "

Usage: Same as original REPAIR_malformed_summaries.py
"""

import asyncio
import argparse
import json
import re
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import logging

from setup_firebase_deepseek import NewsManager
from firestore_utils import FirestoreScanner

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('repair_malformed_enhanced')


class EnhancedMalformedSummaryRepairer:
    def __init__(self, create_backup: bool = False):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.create_backup = create_backup
        self.issues_found = []
        self.scanner = FirestoreScanner(batch_size=50, delay_between_batches=1.0)
        
    async def close(self):
        """Close the database connection"""
        await self.news_manager.close()
    
    def detect_malformed_summary(self, summary_text: str) -> Optional[Dict[str, Any]]:
        """
        Detect if a summary field contains malformed JSON - including incomplete JSON.
        Returns the parsed/extracted data if malformed, None if it's fine.
        """
        if not summary_text or not isinstance(summary_text, str):
            return None
        
        stripped = summary_text.strip()
        
        # Check if it looks like JSON
        if not (stripped.startswith('{') and 
                ('"summary"' in summary_text or '"events"' in summary_text)):
            return None
        
        # Try 1: Parse as complete valid JSON
        try:
            parsed = json.loads(summary_text)
            if isinstance(parsed, dict) and 'summary' in parsed:
                logger.info("Found malformed summary (valid JSON object in summary field)")
                return parsed
        except json.JSONDecodeError:
            # Not valid JSON, try to extract/repair it
            pass
        
        # Try 2: Extract from incomplete/malformed JSON
        logger.warning("Found potential malformed summary with invalid JSON, attempting extraction")
        return self._extract_from_incomplete_json(summary_text)
    
    def _extract_from_incomplete_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract data from incomplete or malformed JSON strings.
        Handles cases where JSON is truncated mid-string.
        """
        result = {}
        
        try:
            # Extract summary field
            summary_match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"', text, re.DOTALL)
            if summary_match:
                result['summary'] = summary_match.group(1)
                logger.info("  ✓ Extracted summary field")
            else:
                logger.warning("  ✗ Could not extract summary field")
                return None
            
            # Extract events array
            events = []
            
            # Find all event objects, even if incomplete
            event_pattern = r'\{\s*"date"\s*:\s*"([^"]+)"\s*,\s*"event"\s*:\s*"((?:[^"\\]|\\.)*)"'
            event_matches = re.finditer(event_pattern, text, re.DOTALL)
            
            for match in event_matches:
                event = {
                    "date": match.group(1),
                    "event": match.group(2)
                }
                events.append(event)
            
            if events:
                result['events'] = events
                logger.info(f"  ✓ Extracted {len(events)} events")
            else:
                logger.warning("  ⚠ No events found (may not exist in original)")
                result['events'] = []
            
            # Only return if we at least got the summary
            if 'summary' in result:
                return result
            
        except Exception as e:
            logger.debug(f"Could not extract from incomplete JSON: {e}")
        
        return None
    
    def _clean_extracted_text(self, text: str) -> str:
        """
        Clean up extracted text by unescaping JSON escape sequences.
        """
        # Unescape common JSON escape sequences
        text = text.replace('\\"', '"')
        text = text.replace('\\n', '\n')
        text = text.replace('\\t', '\t')
        text = text.replace('\\\\', '\\')
        return text
    
    async def scan_figure(self, figure_id: str) -> List[Dict[str, Any]]:
        """
        Scan a single figure's article-summaries for malformed data.
        Returns a list of issues found.
        """
        logger.info(f"Scanning figure: {figure_id}")
        issues = []
        
        try:
            summaries_ref = self.db.collection("selected-figures").document(figure_id) \
                               .collection("article-summaries").stream()
            
            summary_count = 0
            for summary_doc in summaries_ref:
                summary_count += 1
                summary_data = summary_doc.to_dict()
                summary_text = summary_data.get("summary", "")
                
                # Check if this summary is malformed
                parsed_data = self.detect_malformed_summary(summary_text)
                
                if parsed_data:
                    issue = {
                        "figure_id": figure_id,
                        "document_id": summary_doc.id,
                        "original_data": summary_data,
                        "parsed_data": parsed_data,
                        "title": summary_data.get("title", "Unknown"),
                        "url": summary_data.get("url", "Unknown")
                    }
                    issues.append(issue)
                    logger.warning(f"  ⚠️  Found malformed summary: {summary_doc.id}")
                    logger.warning(f"      Title: {issue['title']}")
            
            logger.info(f"  Scanned {summary_count} summaries, found {len(issues)} issues")
            
        except Exception as e:
            logger.error(f"Error scanning figure {figure_id}: {e}")
        
        return issues
    
    async def scan_all_figures(self) -> List[Dict[str, Any]]:
        """
        Scan all figures in the database for malformed summaries.
        Uses safe batching to prevent timeout errors.
        """
        logger.info("Starting full database scan with safe batching...")
        all_issues = []

        # Use FirestoreScanner to safely fetch all figures
        collection_ref = self.db.collection("selected-figures")
        figure_docs = self.scanner.scan_collection_safe(collection_ref)
        figure_count = len(figure_docs)

        logger.info(f"Found {figure_count} figures to scan")

        for idx, figure_doc in enumerate(figure_docs, 1):
            logger.info(f"Progress: {idx}/{figure_count}")
            figure_id = figure_doc.id
            issues = await self.scan_figure(figure_id)
            all_issues.extend(issues)
        
        logger.info(f"\n{'='*60}")
        logger.info(f"SCAN COMPLETE")
        logger.info(f"Total figures scanned: {figure_count}")
        logger.info(f"Total issues found: {len(all_issues)}")
        logger.info(f"{'='*60}\n")
        
        # Group by figure for reporting
        issues_by_figure = {}
        for issue in all_issues:
            fig_id = issue['figure_id']
            if fig_id not in issues_by_figure:
                issues_by_figure[fig_id] = []
            issues_by_figure[fig_id].append(issue)
        
        if issues_by_figure:
            logger.info("Issues found in the following figures:")
            for fig_id, fig_issues in issues_by_figure.items():
                logger.info(f"  - {fig_id}: {len(fig_issues)} malformed summaries")
        
        return all_issues
    
    async def backup_document(self, figure_id: str, document_id: str, data: Dict[str, Any]):
        """
        Create a backup of a document before modifying it.
        """
        backup_collection = self.db.collection("selected-figures").document(figure_id) \
                               .collection("article-summaries-backup")
        
        backup_data = {
            **data,
            "backup_timestamp": datetime.now(timezone.utc).isoformat(),
            "backup_reason": "malformed_summary_repair_enhanced",
            "original_document_id": document_id
        }
        
        backup_collection.document(document_id).set(backup_data)
        logger.info(f"    Created backup for document {document_id}")
    
    async def repair_document(self, issue: Dict[str, Any], create_backup: bool = False) -> bool:
        """
        Repair a single malformed document.
        Returns True if successful, False otherwise.
        """
        figure_id = issue['figure_id']
        document_id = issue['document_id']
        parsed_data = issue['parsed_data']
        original_data = issue['original_data']
        
        logger.info(f"Repairing: {figure_id}/{document_id}")
        logger.info(f"  Title: {issue['title']}")
        
        try:
            # Create backup if requested
            if create_backup:
                await self.backup_document(figure_id, document_id, original_data)
            
            # Clean the extracted summary text
            clean_summary = self._clean_extracted_text(parsed_data.get("summary", ""))
            
            # Prepare the corrected data
            corrected_data = {
                "summary": clean_summary,
            }
            
            # Handle events if they exist - save as fields in the SAME document
            events = parsed_data.get("events", [])
            if events and isinstance(events, list):
                # Build event_contents mapping (using DATE as key, not index!)
                event_contents = {}
                event_dates = []
                
                for event in events:
                    if isinstance(event, dict) and 'date' in event and 'event' in event:
                        date_key = event.get("date", "")
                        # Clean the event text
                        clean_event_text = self._clean_extracted_text(event.get("event", ""))
                        
                        # Add to event_contents with DATE as key (matches your structure)
                        event_contents[date_key] = clean_event_text
                        
                        # Add to event_dates array
                        event_dates.append(date_key)
                
                # Add to corrected_data
                if event_contents:
                    corrected_data["event_contents"] = event_contents
                    corrected_data["event_dates"] = event_dates
                    logger.info(f"  ✓ Prepared {len(event_contents)} events for event_contents field")
                    logger.info(f"  ✓ Prepared {len(event_dates)} dates for event_dates field")
            
            # Get the document reference
            doc_ref = self.db.collection("selected-figures").document(figure_id) \
                         .collection("article-summaries").document(document_id)
            
            # Update the document with all corrected fields
            doc_ref.update(corrected_data)
            logger.info(f"  ✓ Updated document fields")
            
            logger.info(f"  ✅ Successfully repaired {document_id}")
            return True
            
        except Exception as e:
            logger.error(f"  ❌ Error repairing {document_id}: {e}")
            return False
    
    async def repair_all_issues(self, issues: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Repair all found issues.
        Returns statistics about the repair operation.
        """
        if not issues:
            logger.info("No issues to repair")
            return {"total": 0, "success": 0, "failed": 0}
        
        logger.info(f"\n{'='*60}")
        logger.info(f"Starting repair of {len(issues)} malformed summaries")
        logger.info(f"Backup mode: {'ENABLED' if self.create_backup else 'DISABLED'}")
        logger.info(f"{'='*60}\n")
        
        stats = {"total": len(issues), "success": 0, "failed": 0}
        
        for idx, issue in enumerate(issues, 1):
            logger.info(f"\n[{idx}/{len(issues)}] Processing:")
            success = await self.repair_document(issue, self.create_backup)
            
            if success:
                stats["success"] += 1
            else:
                stats["failed"] += 1
        
        logger.info(f"\n{'='*60}")
        logger.info(f"REPAIR COMPLETE")
        logger.info(f"Total processed: {stats['total']}")
        logger.info(f"Successful: {stats['success']}")
        logger.info(f"Failed: {stats['failed']}")
        logger.info(f"{'='*60}\n")
        
        return stats


async def main():
    parser = argparse.ArgumentParser(
        description="Enhanced tool to diagnose and repair malformed article-summary data (handles incomplete JSON)",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        '--scan-only',
        action='store_true',
        help="Only scan for issues, don't repair anything"
    )
    
    parser.add_argument(
        '--figure',
        type=str,
        help="Scan/repair only a specific figure (e.g., 'gdragon')"
    )
    
    parser.add_argument(
        '--fix-all',
        action='store_true',
        help="Repair all found issues"
    )
    
    parser.add_argument(
        '--backup',
        action='store_true',
        help="Create backups before repairing (recommended)"
    )
    
    args = parser.parse_args()
    
    # Create repairer instance
    repairer = EnhancedMalformedSummaryRepairer(create_backup=args.backup)
    
    try:
        # Determine what to do
        if args.figure:
            # Scan specific figure
            logger.info(f"\n{'='*60}")
            logger.info(f"Scanning specific figure: {args.figure}")
            logger.info(f"{'='*60}\n")
            issues = await repairer.scan_figure(args.figure)
        else:
            # Scan all figures
            issues = await repairer.scan_all_figures()
        
        # Store issues for potential repair
        repairer.issues_found = issues
        
        # If scan-only mode, just report and exit
        if args.scan_only:
            if issues:
                logger.info("\n📋 SCAN RESULTS:")
                for issue in issues:
                    logger.info(f"\n  Figure: {issue['figure_id']}")
                    logger.info(f"  Document: {issue['document_id']}")
                    logger.info(f"  Title: {issue['title']}")
                    logger.info(f"  Summary preview: {issue['parsed_data'].get('summary', '')[:100]}...")
                    logger.info(f"  Events count: {len(issue['parsed_data'].get('events', []))}")
            else:
                logger.info("\n✅ No malformed summaries found!")
            return
        
        # If fix-all mode, repair the issues
        if args.fix_all and issues:
            stats = await repairer.repair_all_issues(issues)
        elif issues and not args.fix_all:
            logger.info("\n💡 Issues found but --fix-all not specified.")
            logger.info("   Run with --fix-all to repair these issues.")
            logger.info("   Add --backup to create backups before repairing (recommended).")
        
    except Exception as e:
        logger.error(f"Error in main execution: {e}")
        raise
    finally:
        await repairer.close()


if __name__ == "__main__":
    asyncio.run(main())
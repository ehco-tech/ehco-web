"""
VALIDATE_data_integrity.py

This script validates data integrity at various stages of the update pipeline.
It can be run standalone or integrated into your run_full_update.py script.

Usage:
    python VALIDATE_data_integrity.py --figure gdragon           # Validate specific figure
    python VALIDATE_data_integrity.py --all                      # Validate all figures
    python VALIDATE_data_integrity.py --figure gdragon --verbose # Detailed output
    
Integration example:
    from VALIDATE_data_integrity import DataIntegrityValidator
    
    validator = DataIntegrityValidator()
    issues = await validator.validate_figure(figure_id)
    if issues:
        logger.warning(f"Data integrity issues found: {issues}")
"""

import asyncio
import argparse
import json
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime, UTC

from utilities.setup_firebase_deepseek import NewsManager

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data_integrity_validator')


class DataIntegrityValidator:
    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        
    async def close(self):
        """Close the database connection"""
        await self.news_manager.close()
    
    def validate_summary_field(self, summary_data: Dict[str, Any]) -> List[str]:
        """
        Validate that a summary field contains proper string data, not JSON objects.
        Returns a list of issues found (empty list if valid).
        """
        issues = []
        summary_text = summary_data.get("summary", "")
        
        if not summary_text:
            issues.append("Summary field is empty or missing")
            return issues
        
        if not isinstance(summary_text, str):
            issues.append(f"Summary field is not a string (type: {type(summary_text).__name__})")
            return issues
        
        # Check if it looks like a JSON object
        if summary_text.strip().startswith('{'):
            try:
                parsed = json.loads(summary_text)
                if isinstance(parsed, dict):
                    if 'summary' in parsed or 'events' in parsed:
                        issues.append("Summary field contains JSON object (should be plain text)")
            except json.JSONDecodeError:
                # It starts with { but isn't valid JSON - still suspicious
                if '"summary"' in summary_text or '"events"' in summary_text:
                    issues.append("Summary field contains malformed JSON-like text")
        
        return issues
    
    def validate_categories(self, summary_data: Dict[str, Any]) -> List[str]:
        """
        Validate that category fields are properly set.
        """
        issues = []
        
        valid_main_categories = [
            "Creative Works",
            "Live & Broadcast", 
            "Public Relations",
            "Personal Milestones",
            "Incidents & Controversies"
        ]
        
        main_category = summary_data.get("mainCategory")
        subcategory = summary_data.get("subcategory")
        
        if not main_category:
            issues.append("Missing mainCategory field")
        elif main_category not in valid_main_categories:
            issues.append(f"Invalid mainCategory: '{main_category}'")
        
        if not subcategory:
            issues.append("Missing subcategory field")
        
        return issues
    
    def validate_events_structure(self, events_data: List[Dict[str, Any]]) -> List[str]:
        """
        Validate that events in a subcollection have proper structure.
        """
        issues = []
        
        for idx, event in enumerate(events_data):
            if not isinstance(event, dict):
                issues.append(f"Event {idx} is not a dictionary")
                continue
            
            if 'date' not in event:
                issues.append(f"Event {idx} missing 'date' field")
            elif not isinstance(event['date'], str):
                issues.append(f"Event {idx} 'date' field is not a string")
            
            if 'event' not in event:
                issues.append(f"Event {idx} missing 'event' field")
            elif not isinstance(event['event'], str):
                issues.append(f"Event {idx} 'event' field is not a string")
        
        return issues
    
    async def validate_article_summary(
        self, 
        figure_id: str, 
        document_id: str,
        check_events: bool = True
    ) -> Dict[str, Any]:
        """
        Validate a single article-summary document.
        Returns a dict with validation results.
        """
        result = {
            "document_id": document_id,
            "valid": True,
            "issues": [],
            "warnings": []
        }
        
        try:
            doc_ref = self.db.collection("selected-figures").document(figure_id) \
                         .collection("article-summaries").document(document_id)
            doc = doc_ref.get()
            
            if not doc.exists:
                result["valid"] = False
                result["issues"].append("Document does not exist")
                return result
            
            summary_data = doc.to_dict()
            
            # Validate summary field
            summary_issues = self.validate_summary_field(summary_data)
            if summary_issues:
                result["valid"] = False
                result["issues"].extend(summary_issues)
            
            # Validate categories
            category_issues = self.validate_categories(summary_data)
            if category_issues:
                result["warnings"].extend(category_issues)
            
            # Check if is_processed_for_timeline exists
            if "is_processed_for_timeline" not in summary_data:
                result["warnings"].append("Missing is_processed_for_timeline field")
            
            # Validate events subcollection if requested
            if check_events:
                events_ref = doc_ref.collection("events").stream()
                events = [event_doc.to_dict() for event_doc in events_ref]
                
                if events:
                    event_issues = self.validate_events_structure(events)
                    if event_issues:
                        result["warnings"].extend(event_issues)
            
        except Exception as e:
            result["valid"] = False
            result["issues"].append(f"Error during validation: {str(e)}")
        
        return result
    
    async def validate_figure(
        self, 
        figure_id: str,
        check_events: bool = True,
        verbose: bool = False
    ) -> Dict[str, Any]:
        """
        Validate all article-summaries for a single figure.
        Returns summary statistics and issues found.
        """
        logger.info(f"Validating figure: {figure_id}")
        
        stats = {
            "figure_id": figure_id,
            "total_documents": 0,
            "valid_documents": 0,
            "documents_with_issues": 0,
            "documents_with_warnings": 0,
            "issues": [],
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            summaries_ref = self.db.collection("selected-figures").document(figure_id) \
                               .collection("article-summaries").stream()
            
            # Convert to list to avoid long-running stream timeout
            summaries_list = list(summaries_ref)
            logger.info(f"  Found {len(summaries_list)} documents to validate")
            
            for idx, summary_doc in enumerate(summaries_list, 1):
                stats["total_documents"] += 1
                document_id = summary_doc.id
                
                # Progress indicator for large collections
                if idx % 100 == 0:
                    logger.info(f"  Progress: {idx}/{len(summaries_list)} documents validated...")
                
                validation_result = await self.validate_article_summary(
                    figure_id, 
                    document_id,
                    check_events
                )
                
                if validation_result["valid"]:
                    stats["valid_documents"] += 1
                else:
                    stats["documents_with_issues"] += 1
                    stats["issues"].append(validation_result)
                    
                    if verbose:
                        logger.warning(f"  Issues in {document_id}:")
                        for issue in validation_result["issues"]:
                            logger.warning(f"    - {issue}")
                
                if validation_result["warnings"]:
                    stats["documents_with_warnings"] += 1
                    
                    if verbose:
                        logger.info(f"  Warnings in {document_id}:")
                        for warning in validation_result["warnings"]:
                            logger.info(f"    - {warning}")
            
            # Summary
            logger.info(f"  Total documents: {stats['total_documents']}")
            logger.info(f"  Valid: {stats['valid_documents']}")
            logger.info(f"  With issues: {stats['documents_with_issues']}")
            logger.info(f"  With warnings: {stats['documents_with_warnings']}")
            
            if stats["documents_with_issues"] > 0:
                logger.warning(f"  ⚠️  Found {stats['documents_with_issues']} documents with data integrity issues!")
            else:
                logger.info(f"  ✅ All documents passed validation")
            
        except Exception as e:
            logger.error(f"Error validating figure {figure_id}: {e}")
            stats["error"] = str(e)
        
        return stats
    
    async def validate_all_figures(
        self,
        check_events: bool = True,
        verbose: bool = False
    ) -> Dict[str, Any]:
        """
        Validate all figures in the database.
        """
        logger.info("Starting full database validation...")
        
        all_stats = {
            "total_figures": 0,
            "figures_with_issues": 0,
            "total_documents": 0,
            "total_issues": 0,
            "figure_results": [],
            "timestamp": datetime.now().isoformat()
        }
        
        figures_ref = self.db.collection("selected-figures").stream()
        
        for figure_doc in figures_ref:
            figure_id = figure_doc.id
            all_stats["total_figures"] += 1
            
            figure_stats = await self.validate_figure(figure_id, check_events, verbose)
            
            all_stats["total_documents"] += figure_stats["total_documents"]
            all_stats["total_issues"] += figure_stats["documents_with_issues"]
            
            if figure_stats["documents_with_issues"] > 0:
                all_stats["figures_with_issues"] += 1
                all_stats["figure_results"].append(figure_stats)
        
        # Final summary
        logger.info(f"\n{'='*60}")
        logger.info(f"VALIDATION COMPLETE")
        logger.info(f"Total figures: {all_stats['total_figures']}")
        logger.info(f"Total documents: {all_stats['total_documents']}")
        logger.info(f"Figures with issues: {all_stats['figures_with_issues']}")
        logger.info(f"Total documents with issues: {all_stats['total_issues']}")
        logger.info(f"{'='*60}\n")
        
        if all_stats["figures_with_issues"] > 0:
            logger.warning("⚠️  Data integrity issues found:")
            for figure_result in all_stats["figure_results"]:
                logger.warning(f"  - {figure_result['figure_id']}: "
                             f"{figure_result['documents_with_issues']} documents with issues")
        else:
            logger.info("✅ All figures passed validation!")
        
        return all_stats
    
    async def quick_validation_check(self, figure_id: str) -> bool:
        """
        Quick validation check that returns True if everything is OK, False if issues found.
        Useful for integration into update pipelines.
        """
        stats = await self.validate_figure(figure_id, check_events=False, verbose=False)
        return stats["documents_with_issues"] == 0


async def main():
    parser = argparse.ArgumentParser(
        description="Validate data integrity in article-summaries",
        formatter_class=argparse.RawTextHelpFormatter
    )
    
    parser.add_argument(
        '--figure',
        type=str,
        help="Validate a specific figure (e.g., 'gdragon')"
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help="Validate all figures"
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help="Show detailed output for each issue"
    )
    
    parser.add_argument(
        '--skip-events',
        action='store_true',
        help="Skip validation of events subcollections (faster)"
    )
    
    parser.add_argument(
        '--export',
        type=str,
        help="Export validation results to JSON file"
    )
    
    args = parser.parse_args()
    
    validator = DataIntegrityValidator()
    check_events = not args.skip_events
    
    try:
        if args.figure:
            # Validate specific figure
            logger.info(f"\n{'='*60}")
            logger.info(f"Validating figure: {args.figure}")
            logger.info(f"{'='*60}\n")
            
            stats = await validator.validate_figure(
                args.figure,
                check_events=check_events,
                verbose=args.verbose
            )
            
            if args.export:
                with open(args.export, 'w') as f:
                    json.dump(stats, f, indent=2)
                logger.info(f"\nResults exported to {args.export}")
            
        elif args.all:
            # Validate all figures
            stats = await validator.validate_all_figures(
                check_events=check_events,
                verbose=args.verbose
            )
            
            if args.export:
                with open(args.export, 'w') as f:
                    json.dump(stats, f, indent=2)
                logger.info(f"\nResults exported to {args.export}")
        else:
            logger.error("Please specify either --figure <id> or --all")
            parser.print_help()
    
    except Exception as e:
        logger.error(f"Error in validation: {e}")
        raise
    finally:
        await validator.close()


if __name__ == "__main__":
    asyncio.run(main())
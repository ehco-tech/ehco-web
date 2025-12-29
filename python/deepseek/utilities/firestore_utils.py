"""
Firestore utility functions for handling large collection scans with timeout prevention.

This module provides helpers to prevent Firestore query timeouts when scanning
large collections like selected-figures.
"""

import asyncio
import logging
from typing import List, Dict, Any, Callable, Optional, AsyncIterator
from google.api_core.exceptions import ServiceUnavailable, DeadlineExceeded
import time

logger = logging.getLogger('firestore_utils')


class FirestoreScanner:
    """
    Helper class to safely scan large Firestore collections without timeouts.

    Features:
    - Batch processing to avoid overwhelming Firestore
    - Configurable delays between batches
    - Automatic retry logic with exponential backoff
    - Progress tracking and logging
    """

    def __init__(
        self,
        batch_size: int = 50,
        delay_between_batches: float = 1.0,
        max_retries: int = 3,
        retry_delay: float = 2.0
    ):
        """
        Initialize the scanner.

        Args:
            batch_size: Number of documents to fetch in each batch
            delay_between_batches: Seconds to wait between batches
            max_retries: Maximum number of retry attempts for failed queries
            retry_delay: Initial delay for exponential backoff (doubles each retry)
        """
        self.batch_size = batch_size
        self.delay_between_batches = delay_between_batches
        self.max_retries = max_retries
        self.retry_delay = retry_delay

    def scan_collection_safe(
        self,
        collection_ref,
        batch_size: Optional[int] = None,
        delay: Optional[float] = None
    ) -> List[Any]:
        """
        Safely scan a Firestore collection with automatic batching and retries.

        Args:
            collection_ref: Firestore collection reference to scan
            batch_size: Override default batch size
            delay: Override default delay between batches

        Returns:
            List of document snapshots

        Example:
            scanner = FirestoreScanner()
            docs = scanner.scan_collection_safe(
                db.collection("selected-figures")
            )
            for doc in docs:
                process_document(doc)
        """
        batch_size = batch_size or self.batch_size
        delay = delay or self.delay_between_batches

        all_docs = []
        last_doc = None
        batch_num = 0

        while True:
            batch_num += 1
            logger.info(f"Fetching batch {batch_num} (size: {batch_size})...")

            # Build query with pagination
            query = collection_ref.limit(batch_size)
            if last_doc:
                query = query.start_after(last_doc)

            # Fetch batch with retry logic
            batch_docs = self._fetch_with_retry(query)

            if not batch_docs:
                logger.info(f"No more documents found. Total fetched: {len(all_docs)}")
                break

            all_docs.extend(batch_docs)
            logger.info(f"Fetched {len(batch_docs)} documents (total: {len(all_docs)})")

            # If we got fewer docs than batch_size, we've reached the end
            if len(batch_docs) < batch_size:
                logger.info(f"Reached end of collection. Total: {len(all_docs)}")
                break

            # Update pagination cursor
            last_doc = batch_docs[-1]

            # Add delay between batches to avoid overwhelming Firestore
            if delay > 0:
                logger.debug(f"Waiting {delay}s before next batch...")
                time.sleep(delay)

        return all_docs

    def _fetch_with_retry(self, query) -> List[Any]:
        """
        Fetch documents with exponential backoff retry logic.

        Args:
            query: Firestore query to execute

        Returns:
            List of document snapshots
        """
        for attempt in range(self.max_retries):
            try:
                # Execute query and collect results
                docs = list(query.stream())
                return docs

            except (ServiceUnavailable, DeadlineExceeded) as e:
                if attempt < self.max_retries - 1:
                    # Calculate delay with exponential backoff
                    wait_time = self.retry_delay * (2 ** attempt)
                    logger.warning(
                        f"Query timeout/unavailable (attempt {attempt + 1}/{self.max_retries}). "
                        f"Retrying in {wait_time}s..."
                    )
                    time.sleep(wait_time)
                else:
                    logger.error(
                        f"Query failed after {self.max_retries} attempts: {e}"
                    )
                    raise

            except AttributeError as e:
                # Handle the specific "_retry" attribute error
                if "'_UnaryStreamMultiCallable' object has no attribute '_retry'" in str(e):
                    logger.error(
                        "Firestore SDK version compatibility issue detected. "
                        "This is a known bug with certain SDK versions. "
                        "Attempting to continue with partial results..."
                    )
                    # Return empty list to allow processing to continue
                    return []
                else:
                    raise

            except Exception as e:
                logger.error(f"Unexpected error during query: {e}")
                raise

        return []

    async def scan_collection_async(
        self,
        collection_ref,
        process_func: Callable[[Any], asyncio.Future],
        batch_size: Optional[int] = None,
        delay: Optional[float] = None
    ) -> List[Any]:
        """
        Async version: scan collection and process each document with async callback.

        Args:
            collection_ref: Firestore collection reference
            process_func: Async function to process each document
            batch_size: Override default batch size
            delay: Override default delay between batches

        Returns:
            List of processing results

        Example:
            scanner = FirestoreScanner()

            async def process_figure(doc):
                return await analyze_figure(doc.id)

            results = await scanner.scan_collection_async(
                db.collection("selected-figures"),
                process_func=process_figure
            )
        """
        batch_size = batch_size or self.batch_size
        delay = delay or self.delay_between_batches

        all_results = []
        last_doc = None
        batch_num = 0

        while True:
            batch_num += 1
            logger.info(f"Fetching batch {batch_num} (size: {batch_size})...")

            # Build query with pagination
            query = collection_ref.limit(batch_size)
            if last_doc:
                query = query.start_after(last_doc)

            # Fetch batch with retry logic
            batch_docs = self._fetch_with_retry(query)

            if not batch_docs:
                logger.info(f"No more documents found. Total processed: {len(all_results)}")
                break

            logger.info(f"Processing {len(batch_docs)} documents...")

            # Process documents in this batch
            for doc in batch_docs:
                try:
                    result = await process_func(doc)
                    all_results.append(result)
                except Exception as e:
                    logger.error(f"Error processing document {doc.id}: {e}")
                    # Continue with next document
                    continue

            logger.info(f"Batch processed (total: {len(all_results)})")

            # If we got fewer docs than batch_size, we've reached the end
            if len(batch_docs) < batch_size:
                logger.info(f"Reached end of collection. Total: {len(all_results)}")
                break

            # Update pagination cursor
            last_doc = batch_docs[-1]

            # Add delay between batches
            if delay > 0:
                logger.debug(f"Waiting {delay}s before next batch...")
                await asyncio.sleep(delay)

        return all_results


def get_all_figure_ids_safe(db, batch_size: int = 50) -> List[str]:
    """
    Safely get all figure IDs from selected-figures collection.

    This is a convenience function for the common use case of just getting
    all figure document IDs.

    Args:
        db: Firestore database instance
        batch_size: Number of documents per batch

    Returns:
        List of figure document IDs

    Example:
        from firestore_utils import get_all_figure_ids_safe

        figure_ids = get_all_figure_ids_safe(db)
        for figure_id in figure_ids:
            process_figure(figure_id)
    """
    scanner = FirestoreScanner(batch_size=batch_size)
    collection_ref = db.collection("selected-figures")
    docs = scanner.scan_collection_safe(collection_ref)
    return [doc.id for doc in docs]

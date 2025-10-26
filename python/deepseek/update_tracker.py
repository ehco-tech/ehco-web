# debug_update_tracker.py
# Enhanced version with debugging output

import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from firebase_admin import firestore
import hashlib
import logging
import json
import traceback

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('UpdateTracker')

class UpdateTracker:
    """
    Tracks and stores updates related to public figures in a dedicated Firestore collection.
    Manages the creation of standardized update documents for display on the frontend.
    """
    
    def __init__(self, db=None):
        """
        Initialize the UpdateTracker with a Firestore database instance.
        
        Args:
            db: Firestore database instance. If None, will attempt to use the default instance.
        """
        logger.info("Initializing UpdateTracker")
        try:
            if db is None:
                # If no db provided, use the default Firebase app
                from firebase_admin import firestore
                self.db = firestore.client()
                logger.info("Using default Firestore client")
            else:
                self.db = db
                logger.info("Using provided Firestore client")
            
            # Collection reference for updates
            self.updates_collection = self.db.collection('figure-updates')
            logger.info(f"Updates collection reference: {self.updates_collection._path}")
            
            # Collection reference for figures (to get their data)
            self.figures_collection = self.db.collection('selected-figures')
            logger.info(f"Figures collection reference: {self.figures_collection._path}")
        except Exception as e:
            logger.error(f"Error initializing UpdateTracker: {e}")
            traceback.print_exc()
    
    def add_update(
        self,
        figure_id: str,
        update_type: str,
        title: str,
        description: str,
        source: Optional[str] = None,
        source_url: Optional[str] = None,
        related_ids: Optional[List[str]] = None,
        additional_data: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a new update document to the updates collection.
        
        Args:
            figure_id: ID of the public figure this update relates to
            update_type: Type of update (e.g., 'timeline', 'wiki', 'news')
            title: Short title of the update
            description: More detailed description of the update
            source: Optional source name (e.g., 'JTBC News', 'Billboard')
            source_url: Optional URL to the source
            related_ids: Optional list of related figure IDs
            additional_data: Optional additional data specific to the update type
        
        Returns:
            The ID of the newly created update document
        """
        logger.info(f"Adding update for figure_id: {figure_id}, type: {update_type}, title: {title}")
        
        try:
            # Get figure data for the update
            logger.info(f"Fetching figure data for {figure_id}")
            figure_doc = self.db.collection('selected-figures').document(figure_id).get()
            
            if not figure_doc.exists:
                logger.error(f"Figure with ID '{figure_id}' not found in database")
                return None
                
            figure_data = figure_doc.to_dict()
            logger.info(f"Figure data retrieved: {figure_data.get('name', 'Unknown')}")
            
            # Create update document
            update_doc = {
                'figure_id': figure_id,
                'figure_name': figure_data.get('name', ''),
                'figure_profile_pic': figure_data.get('profilePic', ''),
                'update_type': update_type,
                'title': title,
                'description': description,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'verified': True,  # Default to verified since it's system-generated
                'visible': True,   # Default to visible
            }
            
            # Add optional fields if provided
            if source:
                update_doc['source'] = source
                logger.info(f"Adding source: {source}")
            if source_url:
                update_doc['source_url'] = source_url
                logger.info(f"Adding source_url: {source_url}")
            if related_ids:
                update_doc['related_ids'] = related_ids
                logger.info(f"Adding related_ids: {related_ids}")
            if additional_data:
                update_doc['additional_data'] = additional_data
                logger.info(f"Adding additional_data: {json.dumps(additional_data, default=str)}")
                
            # Create content hash to avoid duplicates
            content_to_hash = f"{figure_id}:{title}:{description}"
            hash_id = hashlib.md5(content_to_hash.encode()).hexdigest()
            update_doc['content_hash'] = hash_id
            logger.info(f"Created content hash: {hash_id}")
            
            # Check for duplicate updates in the last 24 hours
            logger.info("Checking for duplicate updates")
            query = self.updates_collection.where('content_hash', '==', hash_id)
            
            # Get query results
            existing_docs = query.get()
            
            # If a similar update already exists, don't create a duplicate
            if len(existing_docs) > 0:
                logger.info(f"Found duplicate update. Skipping. (hash: {hash_id})")
                return existing_docs[0].id
            
            logger.info("No duplicates found. Creating new update document.")
            # Create the new update document
            # Replace the existing code in add_update method
            try:
                logger.debug(f"Document to add: {json.dumps(update_doc, default=str)}")
                new_doc_ref = self.updates_collection.add(update_doc)
                
                # Check what type is actually being returned
                logger.debug(f"Type of add() return value: {type(new_doc_ref)}")
                
                # If it's a tuple as your code expects
                if isinstance(new_doc_ref, tuple):
                    logger.info("Add method returned a tuple, extracting document reference")
                    # Make sure we're accessing the correct element
                    logger.debug(f"Tuple contents: {new_doc_ref}")
                    if len(new_doc_ref) > 0:
                        # Check if the first element is a document reference
                        if hasattr(new_doc_ref[0], 'id'):
                            doc_ref = new_doc_ref[0]
                        else:
                            # If it's not what we expect, let's try the second element if it exists
                            if len(new_doc_ref) > 1 and hasattr(new_doc_ref[1], 'id'):
                                doc_ref = new_doc_ref[1]
                            else:
                                # Last resort - create a unique ID
                                logger.warning("Could not find document reference in tuple, generating a random ID")
                                import uuid
                                return str(uuid.uuid4())
                elif hasattr(new_doc_ref, 'id'):
                    # It's a document reference directly
                    logger.info("Add method returned a document reference")
                    doc_ref = new_doc_ref
                else:
                    # It's neither a tuple with a doc ref nor a doc ref itself
                    logger.warning(f"Unexpected return type from add(): {type(new_doc_ref)}")
                    import uuid
                    return str(uuid.uuid4())
                
                logger.info(f"Successfully created new update: {title} (id: {doc_ref.id})")
                return doc_ref.id
            except Exception as e:
                logger.error(f"Error adding document to Firestore: {e}")
                traceback.print_exc()
                return None
        except Exception as e:
            logger.error(f"Error in add_update: {e}")
            traceback.print_exc()
            return None
    
    def add_timeline_update(
        self, 
        figure_id: str, 
        event_title: str, 
        event_description: str,
        event_date: str,
        source: Optional[str] = None,
        source_url: Optional[str] = None
    ) -> str:
        """
        Add a timeline-specific update to the updates collection.
        
        Args:
            figure_id: ID of the public figure
            event_title: Title of the timeline event
            event_description: Description of the timeline event
            event_date: Date of the event in string format
            source: Optional source name
            source_url: Optional URL to the source
        
        Returns:
            The ID of the newly created update document
        """
        logger.info(f"Adding timeline update for figure_id: {figure_id}, event: {event_title}")
        
        title = f"Timeline Update: {event_title}"
        description = event_description
        
        additional_data = {
            'event_date': event_date,
            'event_type': 'timeline'
        }
        
        logger.info(f"Timeline update data: title='{title}', date='{event_date}'")
        
        return self.add_update(
            figure_id=figure_id,
            update_type='timeline',
            title=title,
            description=description,
            source=source,
            source_url=source_url,
            additional_data=additional_data
        )
    
    def add_wiki_update(
        self, 
        figure_id: str,
        section_title: str,
        update_summary: str,
        source: Optional[str] = None
    ) -> str:
        """
        Add a wiki content update to the updates collection.
        
        Args:
            figure_id: ID of the public figure
            section_title: Title of the wiki section that was updated
            update_summary: Summary of what was updated
            source: Optional source of the information
        
        Returns:
            The ID of the newly created update document
        """
        logger.info(f"Adding wiki update for figure_id: {figure_id}, section: {section_title}")
        
        title = f"Profile Updated: {section_title}"
        
        return self.add_update(
            figure_id=figure_id,
            update_type='wiki',
            title=title,
            description=update_summary,
            source=source
        )
    
    def add_news_update(
        self,
        figure_id: str,
        headline: str,
        summary: str,
        source: str,
        source_url: Optional[str] = None,
        related_ids: Optional[List[str]] = None
    ) -> str:
        """
        Add a news update to the updates collection.
        
        Args:
            figure_id: ID of the public figure
            headline: News headline
            summary: Summary of the news article
            source: Source of the news (e.g., 'CNN', 'Soompi')
            source_url: URL to the news article
            related_ids: IDs of other figures mentioned in the article
        
        Returns:
            The ID of the newly created update document
        """
        logger.info(f"Adding news update for figure_id: {figure_id}, headline: {headline}")
        
        return self.add_update(
            figure_id=figure_id,
            update_type='news',
            title=headline,
            description=summary,
            source=source,
            source_url=source_url,
            related_ids=related_ids
        )
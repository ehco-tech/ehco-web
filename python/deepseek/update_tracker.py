# update_tracker.py
# Responsible for tracking and storing updates in a dedicated Firestore collection

import time
from datetime import datetime
from typing import Dict, List, Any, Optional
from firebase_admin import firestore
import hashlib

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
        if db is None:
            # If no db provided, use the default Firebase app
            from firebase_admin import firestore
            self.db = firestore.client()
        else:
            self.db = db
        
        # Collection reference for updates
        self.updates_collection = self.db.collection('figure-updates')
        
        # Collection reference for figures (to get their data)
        self.figures_collection = self.db.collection('selected-figures')
    
    async def add_update(
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
        # Get figure data for the update
        figure_doc = await self.db.collection('selected-figures').document(figure_id).get()
        figure_data = figure_doc.to_dict()
        
        if not figure_data:
            raise ValueError(f"Figure with ID '{figure_id}' not found in database")
        
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
        if source_url:
            update_doc['source_url'] = source_url
        if related_ids:
            update_doc['related_ids'] = related_ids
        if additional_data:
            update_doc['additional_data'] = additional_data
            
        # Create content hash to avoid duplicates
        content_to_hash = f"{figure_id}:{title}:{description}"
        hash_id = hashlib.md5(content_to_hash.encode()).hexdigest()
        update_doc['content_hash'] = hash_id
        
        # Check for duplicate updates in the last 24 hours
        yesterday_timestamp = datetime.now().timestamp() - (24 * 60 * 60)
        query = self.updates_collection.where('content_hash', '==', hash_id).where(
            'timestamp', '>=', yesterday_timestamp
        )
        
        existing_docs = await query.get()
        
        # If a similar update already exists, don't create a duplicate
        if existing_docs:
            print(f"Skipping duplicate update: {title} (hash: {hash_id})")
            return existing_docs[0].id
            
        # Create the new update document
        new_doc_ref = await self.updates_collection.add(update_doc)
        print(f"Created new update: {title} (id: {new_doc_ref.id})")
        
        return new_doc_ref.id
    
    async def add_timeline_update(
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
        title = f"Timeline Update: {event_title}"
        description = event_description
        
        additional_data = {
            'event_date': event_date,
            'event_type': 'timeline'
        }
        
        return await self.add_update(
            figure_id=figure_id,
            update_type='timeline',
            title=title,
            description=description,
            source=source,
            source_url=source_url,
            additional_data=additional_data
        )
    
    async def add_wiki_update(
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
        title = f"Profile Updated: {section_title}"
        
        return await self.add_update(
            figure_id=figure_id,
            update_type='wiki',
            title=title,
            description=update_summary,
            source=source
        )
    
    async def add_news_update(
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
        return await self.add_update(
            figure_id=figure_id,
            update_type='news',
            title=headline,
            description=summary,
            source=source,
            source_url=source_url,
            related_ids=related_ids
        )
    
    async def get_latest_updates(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get the latest updates across all figures.
        
        Args:
            limit: Maximum number of updates to retrieve
        
        Returns:
            List of update documents
        """
        query = self.updates_collection.where('visible', '==', True).order_by(
            'timestamp', direction=firestore.Query.DESCENDING
        ).limit(limit)
        
        docs = await query.get()
        
        updates = []
        for doc in docs:
            update_data = doc.to_dict()
            update_data['id'] = doc.id
            updates.append(update_data)
            
        return updates
    
    async def get_updates_for_figure(self, figure_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get updates for a specific figure.
        
        Args:
            figure_id: ID of the public figure
            limit: Maximum number of updates to retrieve
        
        Returns:
            List of update documents
        """
        query = self.updates_collection.where('figure_id', '==', figure_id).where(
            'visible', '==', True
        ).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        
        docs = await query.get()
        
        updates = []
        for doc in docs:
            update_data = doc.to_dict()
            update_data['id'] = doc.id
            updates.append(update_data)
            
        return updates
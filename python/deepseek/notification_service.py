# python/deepseek/notification_service.py

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from setup_firebase_deepseek import NewsManager
import uuid

class NotificationService:
    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
    
    async def get_users_with_favorited_figure(self, figure_id: str) -> List[str]:
        """Find all users who have the given figure in their favorites"""
        try:
            # Query user-favorites collection to find users with this figure
            favorites_collection = self.db.collection('user-favorites')
            
            # Get all user favorites documents
            docs = favorites_collection.stream()
            affected_users = []
            
            for doc in docs:
                user_data = doc.to_dict()
                favorites = user_data.get('favorites', [])
                
                # Check if this figure is in user's favorites
                for favorite in favorites:
                    if favorite.get('figureId') == figure_id:
                        affected_users.append(doc.id)  # doc.id is the user UID
                        break
            
            print(f"Found {len(affected_users)} users with {figure_id} in favorites")
            return affected_users
            
        except Exception as e:
            print(f"Error finding users with favorited figure {figure_id}: {e}")
            return []
    
    async def analyze_event_significance(self, event_data: Dict[str, Any]) -> str:
        """Use AI to determine if an event is 'major', 'regular', or 'minor'"""
        try:
            system_prompt = """You are an expert at analyzing celebrity and public figure news events. 
            Your job is to categorize events by their significance level.
            
            Categories:
            - MAJOR: Career milestones, controversies, major announcements, awards, scandals, relationship changes, health issues
            - REGULAR: Social media posts, appearances, performances, interviews, routine activities
            - MINOR: Background information updates, minor social media activity, small mentions
            
            Respond with only one word: MAJOR, REGULAR, or MINOR"""
            
            event_text = f"""
            Title: {event_data.get('event_title', '')}
            Summary: {event_data.get('event_summary', '')}
            Category: {event_data.get('main_category', '')} > {event_data.get('subcategory', '')}
            """
            
            response = await self.ai_client.chat.completions.create(
                model=self.ai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": event_text}
                ],
                max_tokens=10,
                temperature=0.1
            )
            
            significance = response.choices[0].message.content.strip().upper()
            if significance not in ['MAJOR', 'REGULAR', 'MINOR']:
                significance = 'REGULAR'  # Default fallback
                
            return significance
            
        except Exception as e:
            print(f"Error analyzing event significance: {e}")
            return 'REGULAR'  # Default fallback
    
    async def create_user_notifications(self, user_id: str, figure_id: str, figure_name: str, events: List[Dict[str, Any]]):
        """Create notifications for a specific user"""
        try:
            # Get user preferences to check if notifications are enabled
            user_prefs = await self.get_user_preferences(user_id)
            if not user_prefs.get('notifications', {}).get('enabled', True):
                return
            
            notifications_ref = self.db.collection('user-notifications').document(user_id)
            
            # Get existing notifications or create new document
            existing_doc = notifications_ref.get()
            if existing_doc.exists:
                current_notifications = existing_doc.to_dict().get('notifications', [])
            else:
                current_notifications = []
            
            # Process each event
            for event in events:
                # Analyze event significance
                significance = await self.analyze_event_significance(event)
                
                # Check user preferences for notification type
                major_only = user_prefs.get('notifications', {}).get('major_events_only', False)
                if major_only and significance != 'MAJOR':
                    continue
                
                # Create notification object
                notification = {
                    'id': str(uuid.uuid4()),
                    'figureId': figure_id,
                    'figureName': figure_name,
                    'eventTitle': event.get('event_title', ''),
                    'eventSummary': event.get('event_summary', '')[:200] + '...' if len(event.get('event_summary', '')) > 200 else event.get('event_summary', ''),
                    'eventCategory': f"{event.get('main_category', '')} > {event.get('subcategory', '')}",
                    'eventDate': event.get('event_date'),
                    'significance': significance.lower(),
                    'createdAt': datetime.now(),
                    'read': False,
                    'type': 'timeline_update'
                }
                
                current_notifications.append(notification)
            
            # Limit notifications per user (keep only latest 50)
            current_notifications = sorted(current_notifications, key=lambda x: x['createdAt'], reverse=True)[:50]
            
            # Update Firestore
            await asyncio.to_thread(notifications_ref.set, {
                'notifications': current_notifications,
                'lastUpdated': datetime.now()
            })
            
            print(f"Created {len([n for n in current_notifications if n['figureId'] == figure_id])} notifications for user {user_id}")
            
        except Exception as e:
            print(f"Error creating notifications for user {user_id}: {e}")
    
    async def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user notification preferences"""
        try:
            prefs_ref = self.db.collection('user-preferences').document(user_id)
            doc = prefs_ref.get()
            
            if doc.exists:
                return doc.to_dict()
            else:
                # Return default preferences
                return {
                    'notifications': {
                        'enabled': True,
                        'timeline_updates': True,
                        'major_events_only': False,
                        'newsletter': True,
                        'newsletter_frequency': 'weekly'
                    }
                }
        except Exception as e:
            print(f"Error getting user preferences for {user_id}: {e}")
            return {'notifications': {'enabled': True}}
    
    async def add_to_newsletter_queue(self, figure_id: str, figure_name: str, figure_image_url: str, events: List[Dict[str, Any]], affected_users: List[str]):
        """Add events to newsletter queue for batch processing"""
        try:
            if not affected_users or not events:
                return
            
            # Create or update newsletter batch for today
            today = datetime.now().date()
            batch_id = f"batch_{today.strftime('%Y_%m_%d')}"
            
            newsletter_ref = self.db.collection('newsletter-queue').document(batch_id)
            
            # Get existing batch or create new one
            existing_batch = newsletter_ref.get()
            if existing_batch.exists:
                batch_data = existing_batch.to_dict()
            else:
                batch_data = {
                    'scheduledFor': datetime.combine(today, datetime.min.time()) + timedelta(days=1, hours=9),  # Next day at 9 AM
                    'status': 'pending',
                    'userUpdates': {},
                    'createdAt': datetime.now()
                }
            
            # Add events for each affected user
            for user_id in affected_users:
                if user_id not in batch_data['userUpdates']:
                    batch_data['userUpdates'][user_id] = {'favoriteUpdates': []}
                
                # Find existing figure update or create new one
                figure_update = None
                for update in batch_data['userUpdates'][user_id]['favoriteUpdates']:
                    if update['figureId'] == figure_id:
                        figure_update = update
                        break
                
                if not figure_update:
                    figure_update = {
                        'figureId': figure_id,
                        'figureName': figure_name,
                        'figureImageUrl': figure_image_url,
                        'events': []
                    }
                    batch_data['userUpdates'][user_id]['favoriteUpdates'].append(figure_update)
                
                # Add new events (avoid duplicates)
                existing_event_titles = [e.get('event_title') for e in figure_update['events']]
                for event in events:
                    if event.get('event_title') not in existing_event_titles:
                        figure_update['events'].append(event)
            
            # Update Firestore
            await asyncio.to_thread(newsletter_ref.set, batch_data)
            print(f"Added newsletter queue entry for {len(affected_users)} users")
            
        except Exception as e:
            print(f"Error adding to newsletter queue: {e}")
    
    async def trigger_notifications_for_figure(self, figure_id: str, new_events: List[Dict[str, Any]]):
        """Main function to trigger all notifications for a figure update"""
        try:
            print(f"\n🔔 Triggering notifications for figure: {figure_id}")
            
            if not new_events:
                print("No new events to process")
                return
            
            # Get figure name for notifications
            figure_doc = self.db.collection('selected-figures').document(figure_id).get()
            if not figure_doc.exists:
                print(f"Figure document not found: {figure_id}")
                return
            
            figure_data = figure_doc.to_dict()
            figure_name = figure_data.get('name', figure_id)
            figure_image_url = figure_data.get('profilePic', '')

            # 1. Find all users who have this figure in favorites
            affected_users = await self.get_users_with_favorited_figure(figure_id)

            if not affected_users:
                print(f"No users have {figure_id} in favorites")
                return

            # 2. Create notifications for each user
            for user_id in affected_users:
                await self.create_user_notifications(user_id, figure_id, figure_name, new_events)

            # 3. Add to newsletter queue for batch processing
            await self.add_to_newsletter_queue(figure_id, figure_name, figure_image_url, new_events, affected_users)
            
            print(f"✅ Notifications triggered for {len(affected_users)} users with {len(new_events)} events")
            
        except Exception as e:
            print(f"Error triggering notifications for figure {figure_id}: {e}")


# Integration function to be called from UPDATE_timeline.py
async def notify_timeline_update(figure_id: str, new_events: List[Dict[str, Any]]):
    """
    Function to be called from UPDATE_timeline.py after successfully adding events.
    
    Usage in UPDATE_timeline.py:
    ```python
    from notification_service import notify_timeline_update
    
    # After successfully adding events to timeline
    if new_events_added:
        await notify_timeline_update(self.figure_id, new_events_added)
    ```
    """
    notification_service = NotificationService()
    await notification_service.trigger_notifications_for_figure(figure_id, new_events)


if __name__ == "__main__":
    # Test function
    async def test_notifications():
        service = NotificationService()
        
        # Test with sample event data
        test_events = [
            {
                'event_title': 'Test Event',
                'event_summary': 'This is a test event for notification system',
                'main_category': 'Entertainment',
                'subcategory': 'Music',
                'event_date': datetime.now()
            }
        ]
        
        await service.trigger_notifications_for_figure('test_figure', test_events)
    
    # Run test
    # asyncio.run(test_notifications())
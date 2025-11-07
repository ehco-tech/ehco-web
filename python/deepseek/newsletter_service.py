# python/deepseek/newsletter_service.py

import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from setup_firebase_deepseek import NewsManager
import os
from dotenv import load_dotenv

# SendGrid imports (replacing SMTP)
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

class NewsletterService:
    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
        load_dotenv()
        
        # SendGrid configuration (replacing SMTP)
        self.sendgrid_client = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
        self.from_email = os.getenv('EMAIL_ADDRESS')
        self.base_url = os.getenv('BASE_URL', 'https://yoursite.com')
        
        # Validate configuration
        if not os.getenv('SENDGRID_API_KEY'):
            raise ValueError("SENDGRID_API_KEY not found in environment variables")
        if not self.from_email:
            raise ValueError("EMAIL_ADDRESS not found in environment variables")
        
        print("✓ SendGrid newsletter service initialized successfully")
    
    async def process_newsletter_queue(self, batch_id: Optional[str] = None):
        """Process newsletter queue and send emails"""
        try:
            if batch_id:
                # Process specific batch
                batch_ref = self.db.collection('newsletter-queue').document(batch_id)
                batch_doc = batch_ref.get()
                if batch_doc.exists:
                    await self._process_single_batch(batch_id, batch_doc.to_dict())
            else:
                # Process all pending batches
                queue_collection = self.db.collection('newsletter-queue')
                pending_batches = queue_collection.where('status', '==', 'pending').stream()
                
                for batch_doc in pending_batches:
                    batch_data = batch_doc.to_dict()
                    scheduled_time = batch_data.get('scheduledFor')
                    
                    # Check if it's time to send - use UTC timezone-aware datetime
                    if scheduled_time and datetime.now(timezone.utc) >= scheduled_time:
                        await self._process_single_batch(batch_doc.id, batch_data)
        
        except Exception as e:
            print(f"Error processing newsletter queue: {e}")
    
    async def _process_single_batch(self, batch_id: str, batch_data: Dict[str, Any]):
        """Process a single newsletter batch"""
        try:
            print(f"Processing newsletter batch: {batch_id}")
            
            # Update batch status
            batch_ref = self.db.collection('newsletter-queue').document(batch_id)
            await asyncio.to_thread(batch_ref.update, {'status': 'processing'})
            
            user_updates = batch_data.get('userUpdates', {})
            successful_sends = 0
            failed_sends = 0
            
            for user_id, user_data in user_updates.items():
                try:
                    # Get user preferences and email
                    user_prefs = await self._get_user_email_and_prefs(user_id)
                    if not user_prefs:
                        continue
                    
                    # Check if user wants newsletters
                    if not user_prefs.get('newsletter_enabled', True):
                        continue
                    
                    # Generate and send newsletter
                    await self._send_user_newsletter(user_id, user_prefs, user_data['favoriteUpdates'])
                    successful_sends += 1
                    
                except Exception as e:
                    print(f"Failed to send newsletter to user {user_id}: {e}")
                    failed_sends += 1
            
            # Update batch status
            await asyncio.to_thread(batch_ref.update, {
                'status': 'sent' if failed_sends == 0 else 'partial',
                'processedAt': datetime.now(timezone.utc),
                'stats': {
                    'successful_sends': successful_sends,
                    'failed_sends': failed_sends
                }
            })
            
            print(f"Newsletter batch {batch_id} processed: {successful_sends} sent, {failed_sends} failed")
            
        except Exception as e:
            print(f"Error processing batch {batch_id}: {e}")
            # Mark batch as failed
            batch_ref = self.db.collection('newsletter-queue').document(batch_id)
            await asyncio.to_thread(batch_ref.update, {'status': 'failed', 'error': str(e)})
    
    async def _get_user_email_and_prefs(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user email and newsletter preferences"""
        try:
            # Get user data from users collection
            user_ref = self.db.collection('users').document(user_id)
            user_doc = user_ref.get()
            
            if not user_doc.exists:
                return None
            
            user_data = user_doc.to_dict()
            email = user_data.get('email')
            
            if not email:
                return None
            
            # Get preferences
            prefs_ref = self.db.collection('user-preferences').document(user_id)
            prefs_doc = prefs_ref.get()
            
            if prefs_doc.exists:
                prefs = prefs_doc.to_dict()
            else:
                prefs = {'newsletter_enabled': True, 'newsletter_frequency': 'weekly'}
            
            return {
                'email': email,
                'name': user_data.get('displayName', 'there'),
                'newsletter_enabled': prefs.get('notifications', {}).get('newsletter', True),
                'newsletter_frequency': prefs.get('notifications', {}).get('newsletter_frequency', 'weekly')
            }
            
        except Exception as e:
            print(f"Error getting user email/prefs for {user_id}: {e}")
            return None
    
    async def _send_user_newsletter(self, user_id: str, user_prefs: Dict[str, Any], favorite_updates: List[Dict[str, Any]]):
        """Generate and send newsletter for a specific user"""
        try:
            if not favorite_updates:
                return
            
            # Generate newsletter content
            newsletter_html = await self._generate_newsletter_html(user_prefs, favorite_updates)
            subject = await self._generate_newsletter_subject(favorite_updates)
            
            # Send email
            await self._send_email(
                to_email=user_prefs['email'],
                subject=subject,
                html_content=newsletter_html,
                user_id=user_id
            )
            
            print(f"Newsletter sent to {user_prefs['email']}")
            
        except Exception as e:
            print(f"Error sending newsletter to user {user_id}: {e}")
            raise
    
    async def _generate_newsletter_subject(self, favorite_updates: List[Dict[str, Any]]) -> str:
        """Generate newsletter subject line"""
        total_events = sum(len(update['events']) for update in favorite_updates)
        figure_count = len(favorite_updates)
        
        if figure_count == 1:
            figure_name = favorite_updates[0]['figureName']
            return f"New updates for {figure_name} - {total_events} events"
        else:
            return f"Your Favorites Update - {total_events} new events from {figure_count} figures"
    
    async def _generate_newsletter_html(self, user_prefs: Dict[str, Any], favorite_updates: List[Dict[str, Any]]) -> str:
        """Generate HTML content for the newsletter"""
        try:
            # Calculate totals
            total_events = sum(len(update['events']) for update in favorite_updates)
            figure_count = len(favorite_updates)
            
            # Sort updates by number of events (most active first)
            favorite_updates.sort(key=lambda x: len(x['events']), reverse=True)
            
            # Generate HTML
            html_content = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Favorites Update</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f9f9f9;
                    }}
                    .container {{
                        background: white;
                        border-radius: 12px;
                        padding: 30px;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    }}
                    .logo {{
                        text-align: center;
                        margin-bottom: 20px;
                    }}
                    .logo img {{
                        height: 40px;
                        width: auto;
                    }}
                    .header {{
                        text-align: center;
                        border-bottom: 2px solid #f0f0f0;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }}
                    .header h1 {{
                        color: #2c3e50;
                        margin: 0;
                        font-size: 28px;
                    }}
                    .summary {{
                        background: #e8f4fd;
                        padding: 20px;
                        border-radius: 8px;
                        margin-bottom: 30px;
                        text-align: center;
                    }}
                    .figure-update {{
                        border: 1px solid #e1e8ed;
                        border-radius: 8px;
                        margin-bottom: 25px;
                        overflow: hidden;
                    }}
                    .figure-header {{
                        background: #f8f9fa;
                        padding: 20px;
                        border-bottom: 1px solid #e1e8ed;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }}
                    .figure-avatar {{
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        background: #ddd;
                        object-fit: cover;
                        flex-shrink: 0;
                    }}
                    .figure-info {{
                        flex: 1;
                        min-width: 0;
                    }}
                    .figure-name {{
                        font-weight: 600;
                        color: #1a1a1a;
                        font-size: 18px;
                        margin-bottom: 4px;
                    }}
                    .event-count {{
                        color: #657786;
                        font-size: 14px;
                    }}
                    .events-list {{
                        padding: 20px;
                    }}
                    .event-item {{
                        margin-bottom: 15px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid #f0f0f0;
                    }}
                    .event-item:last-child {{
                        border-bottom: none;
                        margin-bottom: 0;
                    }}
                    .event-title {{
                        font-weight: 600;
                        color: #1a1a1a;
                        margin-bottom: 5px;
                    }}
                    .event-summary {{
                        color: #657786;
                        font-size: 14px;
                        margin-bottom: 5px;
                    }}
                    .event-meta {{
                        font-size: 12px;
                        color: #9ca3af;
                    }}
                    .cta-button {{
                        display: inline-block;
                        background: #e91e63;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 6px;
                        font-weight: 600;
                        margin: 10px 5px;
                    }}
                    .footer {{
                        text-align: center;
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #e1e8ed;
                        color: #657786;
                        font-size: 14px;
                    }}
                    .unsubscribe {{
                        color: #657786;
                        text-decoration: none;
                        font-size: 12px;
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <img src="{self.base_url}/ehco_logo-02.png" alt="EHCO Logo" />
                    </div>
                    <div class="header">
                        <h1>🌟 Your Favorites Update</h1>
                    </div>
                    
                    <div class="summary">
                        <p><strong>Hi there!</strong></p>
                        <p>You have <strong>{total_events} new update{'s' if total_events != 1 else ''}</strong> from <strong>{figure_count} of your favorite figure{'s' if figure_count != 1 else ''}</strong>.</p>
                    </div>
            """
            
            # Add each figure's updates
            for update in favorite_updates:
                figure_name = update['figureName']
                events = update['events']
                figure_id = update['figureId']
                
                # Get figure image URL (you may need to adjust this based on how you store profile pics)
                figure_image_url = update.get('figureImageUrl', '')
                
                # Limit to top 3 events for email brevity
                display_events = events[:3]
                remaining_count = len(events) - len(display_events)
                
                # Build avatar HTML - use image if available, otherwise fallback to colored circle
                if figure_image_url:
                    avatar_html = f'<img src="{figure_image_url}" class="figure-avatar" alt="{figure_name}" />'
                else:
                    avatar_html = '<div class="figure-avatar"></div>'
                
                html_content += f"""
                    <div class="figure-update">
                        <div class="figure-header">
                            {avatar_html}
                            <div class="figure-info">
                                <div class="figure-name">{figure_name}</div>
                                <div class="event-count">{len(events)} new event{'s' if len(events) != 1 else ''}</div>
                            </div>
                        </div>
                        <div class="events-list">
                """
                
                for event in display_events:
                    event_title = event.get('event_title', 'Untitled Event')
                    event_summary = event.get('event_summary', '')[:150]
                    if len(event.get('event_summary', '')) > 150:
                        event_summary += '...'
                    
                    event_date = event.get('event_date', '')
                    if isinstance(event_date, datetime):
                        event_date = event_date.strftime('%B %d, %Y')
                    
                    html_content += f"""
                            <div class="event-item">
                                <div class="event-title">{event_title}</div>
                                <div class="event-summary">{event_summary}</div>
                                <div class="event-meta">{event.get('main_category', '')} • {event_date}</div>
                            </div>
                    """
                
                if remaining_count > 0:
                    html_content += f"""
                            <div class="event-item">
                                <div class="event-title">+ {remaining_count} more event{'s' if remaining_count != 1 else ''}</div>
                                <div class="event-summary">View all updates for {figure_name}</div>
                            </div>
                    """
                
                html_content += f"""
                        </div>
                        <div style="text-align: center; padding: 15px;">
                            <a href="{self.base_url}/{figure_id}" class="cta-button">View All Updates</a>
                        </div>
                    </div>
                """
            
            # Add footer
            unsubscribe_url = f"{self.base_url}/profile/notifications"
            preferences_url = f"{self.base_url}/profile/notifications"
            home_url = self.base_url
            
            html_content += f"""
                    <div class="footer">
                        <p>Stay updated with your favorite public figures on EHCO!</p>
                        <p>
                            <a href="{home_url}" class="unsubscribe">Visit EHCO</a> | 
                            <a href="{preferences_url}" class="unsubscribe">Manage Preferences</a> | 
                            <a href="{unsubscribe_url}" class="unsubscribe">Unsubscribe</a>
                        </p>
                        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                            This email was sent because you have these figures in your favorites list.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            return html_content
            
        except Exception as e:
            print(f"Error generating newsletter HTML: {e}")
            return self._get_fallback_html(user_prefs, favorite_updates)
    
    def _get_fallback_html(self, user_prefs: Dict[str, Any], favorite_updates: List[Dict[str, Any]]) -> str:
        """Simple fallback HTML in case of generation errors"""
        total_events = sum(len(update['events']) for update in favorite_updates)
        figure_names = [update['figureName'] for update in favorite_updates]
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>Your Favorites Update</h1>
            <p>Hi {user_prefs['name']},</p>
            <p>You have {total_events} new updates from: {', '.join(figure_names)}</p>
            <p><a href="{self.base_url}">Visit our site to see all updates</a></p>
        </body>
        </html>
        """
    
    async def _send_email(self, to_email: str, subject: str, html_content: str, user_id: str):
        """Send email using SendGrid API"""
        try:
            from_email = Email(self.from_email)
            to_email_obj = To(to_email)
            
            mail = Mail(
                from_email=from_email,
                to_emails=to_email_obj,
                subject=subject,
                html_content=Content("text/html", html_content)
            )
            
            # Send email
            response = self.sendgrid_client.send(mail)
            
            if response.status_code == 202:
                print(f"Email sent successfully to {to_email} (SendGrid status: {response.status_code})")
            else:
                print(f"SendGrid returned status: {response.status_code}")
                print(f"Response body: {response.body}")
                raise Exception(f"SendGrid API error: {response.status_code}")
                
        except Exception as e:
            print(f"Error sending email via SendGrid to {to_email}: {e}")
            raise
    
    async def create_daily_newsletter_batch(self):
        """Create newsletter batch for daily frequency users"""
        try:
            print("Creating daily newsletter batch...")
            
            # Get users with daily newsletter preference
            prefs_collection = self.db.collection('user-preferences')
            daily_users_docs = prefs_collection.where('notifications.newsletter_frequency', '==', 'daily').stream()
            
            daily_users = [doc.id for doc in daily_users_docs]
            
            if not daily_users:
                print("No users with daily newsletter preference")
                return
            
            # Get yesterday's updates for these users
            yesterday = datetime.now().date() - timedelta(days=1)
            batch_id = f"daily_{yesterday.strftime('%Y_%m_%d')}"
            
            # Create batch document
            batch_data = {
                'scheduledFor': datetime.now(timezone.utc),  # Send immediately
                'status': 'pending',
                'userUpdates': {},
                'createdAt': datetime.now(timezone.utc),
                'type': 'daily'
            }
            
            # For each daily user, collect their favorites' updates from yesterday
            for user_id in daily_users:
                user_updates = await self._get_user_updates_for_date(user_id, yesterday)
                if user_updates:
                    batch_data['userUpdates'][user_id] = {'favoriteUpdates': user_updates}
            
            if batch_data['userUpdates']:
                newsletter_ref = self.db.collection('newsletter-queue').document(batch_id)
                await asyncio.to_thread(newsletter_ref.set, batch_data)
                print(f"Created daily newsletter batch for {len(batch_data['userUpdates'])} users")
            else:
                print("No updates found for daily newsletter")
                
        except Exception as e:
            print(f"Error creating daily newsletter batch: {e}")
    
    async def _get_user_updates_for_date(self, user_id: str, target_date) -> List[Dict[str, Any]]:
        """Get a user's favorite figures' updates for a specific date"""
        try:
            # Get user's favorites
            favorites_ref = self.db.collection('user-favorites').document(user_id)
            favorites_doc = favorites_ref.get()
            
            if not favorites_doc.exists:
                return []
            
            favorites_data = favorites_doc.to_dict()
            favorite_figures = [fav['figureId'] for fav in favorites_data.get('favorites', [])]
            
            if not favorite_figures:
                return []
            
            user_updates = []
            
            # For each favorite figure, check for updates on target date
            for figure_id in favorite_figures:
                figure_updates = await self._get_figure_updates_for_date(figure_id, target_date)
                if figure_updates:
                    # Get figure name and image
                    figure_doc = self.db.collection('selected-figures').document(figure_id).get()
                    if figure_doc.exists:
                        figure_data = figure_doc.to_dict()
                        figure_name = figure_data.get('name', figure_id)
                        figure_image_url = figure_data.get('profilePictureUrl', '')
                    else:
                        figure_name = figure_id
                        figure_image_url = ''
                    
                    user_updates.append({
                        'figureId': figure_id,
                        'figureName': figure_name,
                        'figureImageUrl': figure_image_url,
                        'events': figure_updates
                    })
            
            return user_updates
            
        except Exception as e:
            print(f"Error getting user updates for {user_id}: {e}")
            return []
    
    async def _get_figure_updates_for_date(self, figure_id: str, target_date) -> List[Dict[str, Any]]:
        """Get timeline updates for a figure on a specific date"""
        try:
            # This would need to be adapted based on how you store timeline update timestamps
            # For now, this is a placeholder implementation
            timeline_ref = self.db.collection('selected-figures').document(figure_id).collection('curated-timeline')
            
            # You might need to add a timestamp field to timeline events to make this work properly
            # This is a simplified version that gets recent events
            events = []
            
            return events
            
        except Exception as e:
            print(f"Error getting figure updates for {figure_id}: {e}")
            return []


# CLI functions for scheduling
async def send_daily_newsletters():
    """Function to be called by a scheduler for daily newsletters"""
    service = NewsletterService()
    await service.create_daily_newsletter_batch()
    await service.process_newsletter_queue()

async def send_weekly_newsletters():
    """Function to be called by a scheduler for weekly newsletters"""
    service = NewsletterService()
    # Process all pending weekly batches
    await service.process_newsletter_queue()

async def process_pending_newsletters():
    """Function to process all pending newsletter batches"""
    service = NewsletterService()
    await service.process_newsletter_queue()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Newsletter service CLI")
    parser.add_argument('--action', choices=['daily', 'weekly', 'process', 'test'], 
                       default='process', help='Action to perform')
    parser.add_argument('--batch-id', help='Specific batch ID to process')
    
    args = parser.parse_args()
    
    async def main():
        service = NewsletterService()
        
        if args.action == 'daily':
            await send_daily_newsletters()
        elif args.action == 'weekly':
            await send_weekly_newsletters()
        elif args.action == 'process':
            if args.batch_id:
                await service.process_newsletter_queue(args.batch_id)
            else:
                await service.process_newsletter_queue()
        elif args.action == 'test':
            # Test with sample data
            test_updates = [
                {
                    'figureId': 'test_figure',
                    'figureName': 'Test Celebrity',
                    'events': [
                        {
                            'event_title': 'Test Event',
                            'event_summary': 'This is a test event for the newsletter system',
                            'main_category': 'Entertainment',
                            'subcategory': 'Music',
                            'event_date': datetime.now()
                        }
                    ]
                }
            ]
            
            test_user_prefs = {
                'name': 'Test User',
                'email': 'test@example.com'
            }
            
            html = await service._generate_newsletter_html(test_user_prefs, test_updates)
            print("Generated HTML preview:")
            print(html[:500] + "...")
    
    asyncio.run(main())
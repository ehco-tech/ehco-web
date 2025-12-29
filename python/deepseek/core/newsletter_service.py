# python/deepseek/newsletter_service.py

import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utilities.setup_firebase_deepseek import NewsManager
import os
from dotenv import load_dotenv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# SendGrid imports (kept for future use if needed)
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

class NewsletterService:
    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
        self.ai_client = self.news_manager.client
        self.ai_model = self.news_manager.model
        load_dotenv()

        # Email provider configuration
        # Set EMAIL_PROVIDER to 'gmail' or 'sendgrid' (defaults to 'gmail')
        self.email_provider = os.getenv('EMAIL_PROVIDER', 'gmail').lower()
        self.from_email = os.getenv('EMAIL_ADDRESS')
        self.base_url = os.getenv('BASE_URL', 'https://yoursite.com')

        # Validate email address
        if not self.from_email:
            raise ValueError("EMAIL_ADDRESS not found in environment variables")

        # Initialize the selected email provider
        if self.email_provider == 'sendgrid':
            # SendGrid configuration (kept for future use)
            if not os.getenv('SENDGRID_API_KEY'):
                raise ValueError("SENDGRID_API_KEY not found in environment variables")
            self.sendgrid_client = sendgrid.SendGridAPIClient(api_key=os.getenv('SENDGRID_API_KEY'))
            print("✓ Newsletter service initialized successfully (using SendGrid)")
        elif self.email_provider == 'gmail':
            # Gmail SMTP configuration
            if not os.getenv('GMAIL_APP_PASSWORD'):
                raise ValueError("GMAIL_APP_PASSWORD not found in environment variables")
            self.gmail_password = os.getenv('GMAIL_APP_PASSWORD')
            self.smtp_server = 'smtp.gmail.com'
            self.smtp_port = 587
            print("✓ Newsletter service initialized successfully (using Gmail SMTP)")
        else:
            raise ValueError(f"Unsupported EMAIL_PROVIDER: {self.email_provider}. Use 'gmail' or 'sendgrid'")
    
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
                # Process all pending and partial batches
                queue_collection = self.db.collection('newsletter-queue')

                # Query for both 'pending' and 'partial' status batches
                pending_batches = queue_collection.where(field_path='status', op_string='==', value='pending').stream()
                partial_batches = queue_collection.where(field_path='status', op_string='==', value='partial').stream()

                # Combine both iterators
                all_batches = list(pending_batches) + list(partial_batches)

                for batch_doc in all_batches:
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
                        margin-bottom: 8px;
                        line-height: 1.3;
                    }}
                    .event-count {{
                        color: #657786;
                        font-size: 14px;
                        line-height: 1.4;
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
                
                # Get figure image URL and construct full URL
                figure_image_url = update.get('figureImageUrl', '')

                # Limit to top 3 events for email brevity
                display_events = events[:3]
                remaining_count = len(events) - len(display_events)

                # Build avatar HTML - use image if available, otherwise fallback to colored circle
                if figure_image_url:
                    # Construct full URL: remove leading slash if present, then combine with base_url
                    image_path = figure_image_url.lstrip('/')
                    full_image_url = f"{self.base_url}/{image_path}"
                    avatar_html = f'<img src="{full_image_url}" class="figure-avatar" alt="{figure_name}" />'
                else:
                    avatar_html = '<div class="figure-avatar"></div>'
                
                html_content += f"""
                    <div class="figure-update">
                        <div class="figure-header">
                            {avatar_html}
                            <div class="figure-info" style="flex: 1; min-width: 0; padding-left: 12px;">
                                <div class="figure-name" style="font-weight: 600; color: #1a1a1a; font-size: 18px; margin: 0 0 6px 0; line-height: 1.4;">{figure_name}</div>
                                <div class="event-count" style="color: #657786; font-size: 14px; margin: 0; line-height: 1.5;">{len(events)} new event{'s' if len(events) != 1 else ''}</div>
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
                            <a href="{self.base_url}/{figure_id}" class="cta-button" style="display: inline-block; background: #e91e63; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px;">View All Updates</a>
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
        """Send email using the configured email provider (Gmail SMTP or SendGrid)"""
        if self.email_provider == 'gmail':
            await self._send_email_gmail(to_email, subject, html_content, user_id)
        elif self.email_provider == 'sendgrid':
            await self._send_email_sendgrid(to_email, subject, html_content, user_id)

    async def _send_email_gmail(self, to_email: str, subject: str, html_content: str, user_id: str):
        """Send email using Gmail SMTP"""
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            # Format: "Display Name <email@address.com>"
            from_name = os.getenv('EMAIL_FROM_NAME', 'EHCO')
            message['From'] = f"{from_name} <{self.from_email}>"
            message['To'] = to_email

            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            message.attach(html_part)

            # Send email using Gmail SMTP
            def send_smtp():
                with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                    server.starttls()  # Enable TLS encryption
                    server.login(self.from_email, self.gmail_password)
                    server.send_message(message)

            # Run SMTP in thread to avoid blocking
            await asyncio.to_thread(send_smtp)

            print(f"Email sent successfully to {to_email} (via Gmail SMTP)")

        except Exception as e:
            print(f"Error sending email via Gmail SMTP to {to_email}: {e}")
            raise

    async def _send_email_sendgrid(self, to_email: str, subject: str, html_content: str, user_id: str):
        """Send email using SendGrid API (kept for future use)"""
        try:
            # Set sender display name
            from_name = os.getenv('EMAIL_FROM_NAME', 'EHCO')
            from_email = Email(self.from_email, from_name)
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
            daily_users_docs = prefs_collection.where(field_path='notifications.newsletter_frequency', op_string='==', value='daily').stream()
            
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
                        figure_image_url = figure_data.get('profilePic', '')
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
    parser.add_argument('--test-email', help='Email address to send test newsletter to')
    parser.add_argument('--send-test', action='store_true', help='Actually send the test email (default: just preview HTML)')
    
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
                    'figureId': 'bangchan',
                    'figureName': 'Bang Chan',
                    'figureImageUrl': '/images/bangchan.png',  # Test with real image
                    'events': [
                        {
                            'event_title': 'New Album Release Announcement',
                            'event_summary': 'Bang Chan announces upcoming solo album with a heartfelt message to fans. The album is set to feature collaborations with several renowned artists.',
                            'main_category': 'Entertainment',
                            'subcategory': 'Music',
                            'event_date': datetime.now()
                        },
                        {
                            'event_title': 'Instagram Live Session',
                            'event_summary': 'Hosted a surprise live session discussing music production tips and answering fan questions.',
                            'main_category': 'Social Media',
                            'subcategory': 'Instagram',
                            'event_date': datetime.now()
                        }
                    ]
                },
                {
                    'figureId': 'aespa',
                    'figureName': 'Aespa',
                    'figureImageUrl': '/images/aespa.png',
                    'events': [
                        {
                            'event_title': 'World Tour Dates Announced',
                            'event_summary': 'aespa reveals their 2024 world tour schedule, including stops in North America, Europe, and Asia.',
                            'main_category': 'Entertainment',
                            'subcategory': 'Concerts',
                            'event_date': datetime.now()
                        }
                    ]
                }
            ]

            # Use provided email or default
            test_email = args.test_email if args.test_email else 'test@example.com'

            test_user_prefs = {
                'name': 'Test User',
                'email': test_email
            }

            html = await service._generate_newsletter_html(test_user_prefs, test_updates)

            if args.send_test:
                # Actually send the test email
                print(f"Sending test newsletter to {test_email}...")
                subject = await service._generate_newsletter_subject(test_updates)
                await service._send_email(
                    to_email=test_email,
                    subject=subject,
                    html_content=html,
                    user_id='test_user'
                )
                print(f"✅ Test newsletter sent to {test_email}")
            else:
                # Just preview the HTML
                print("Generated HTML preview (use --send-test to actually send):")
                print(html[:500] + "...")
                print("\nTo send a test email, run:")
                print(f"  python newsletter_service.py --action test --test-email your@email.com --send-test")
    
    asyncio.run(main())
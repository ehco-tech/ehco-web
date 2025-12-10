# python/deepseek/manual_newsletter.py

import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from setup_firebase_deepseek import NewsManager
import os
from dotenv import load_dotenv
import argparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# SendGrid imports (kept for future use if needed)
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

class ManualNewsletterService:
    """Service for sending custom, ad-hoc newsletters to users"""

    def __init__(self):
        self.news_manager = NewsManager()
        self.db = self.news_manager.db
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
            print("✓ Manual newsletter service initialized successfully (using SendGrid)")
        elif self.email_provider == 'gmail':
            # Gmail SMTP configuration
            if not os.getenv('GMAIL_APP_PASSWORD'):
                raise ValueError("GMAIL_APP_PASSWORD not found in environment variables")
            self.gmail_password = os.getenv('GMAIL_APP_PASSWORD')
            self.smtp_server = 'smtp.gmail.com'
            self.smtp_port = 587
            print("✓ Manual newsletter service initialized successfully (using Gmail SMTP)")
        else:
            raise ValueError(f"Unsupported EMAIL_PROVIDER: {self.email_provider}. Use 'gmail' or 'sendgrid'")

    async def get_recipient_list(self, recipient_type: str = 'newsletter-enabled') -> List[Dict[str, Any]]:
        """
        Get list of recipients based on type

        Args:
            recipient_type: 'all', 'newsletter-enabled', or 'test'

        Returns:
            List of dicts with 'email', 'name', 'user_id'
        """
        recipients = []

        try:
            # Get all users
            users_ref = self.db.collection('users')
            users = users_ref.stream()

            for user_doc in users:
                user_id = user_doc.id
                user_data = user_doc.to_dict()
                email = user_data.get('email')

                if not email:
                    continue

                # Check newsletter preferences if needed
                if recipient_type == 'newsletter-enabled':
                    prefs_ref = self.db.collection('user-preferences').document(user_id)
                    prefs_doc = prefs_ref.get()

                    if prefs_doc.exists:
                        prefs = prefs_doc.to_dict()
                        newsletter_enabled = prefs.get('notifications', {}).get('newsletter', True)
                        if not newsletter_enabled:
                            continue

                recipients.append({
                    'user_id': user_id,
                    'email': email,
                    'name': user_data.get('displayName', 'there')
                })

            print(f"Found {len(recipients)} recipients ({recipient_type})")
            return recipients

        except Exception as e:
            print(f"Error getting recipient list: {e}")
            return []

    def generate_newsletter_html(
        self,
        subject: str,
        content: str,
        template: str = 'announcement',
        custom_styles: Optional[str] = None
    ) -> str:
        """
        Generate HTML newsletter with specified template

        Args:
            subject: Email subject line
            content: Main content (can include HTML)
            template: 'announcement', 'update', 'maintenance', or 'custom'
            custom_styles: Optional custom CSS styles

        Returns:
            Complete HTML email content
        """

        # Base styles
        base_styles = """
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
            }
            .container {
                background: white;
                border-radius: 12px;
                padding: 40px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .logo {
                text-align: center;
                margin-bottom: 30px;
            }
            .logo img {
                height: 50px;
                width: auto;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #2c3e50;
                margin: 0 0 10px 0;
                font-size: 32px;
            }
            .header .subtitle {
                color: #657786;
                font-size: 16px;
                margin: 0;
            }
            .content {
                margin: 30px 0;
                color: #1a1a1a;
                font-size: 16px;
                line-height: 1.8;
            }
            .content p {
                margin: 15px 0;
            }
            .content h2 {
                color: #2c3e50;
                margin: 25px 0 15px 0;
                font-size: 24px;
            }
            .content h3 {
                color: #2c3e50;
                margin: 20px 0 10px 0;
                font-size: 20px;
            }
            .content ul, .content ol {
                margin: 15px 0;
                padding-left: 30px;
            }
            .content li {
                margin: 8px 0;
            }
            .highlight-box {
                background: #e8f4fd;
                border-left: 4px solid #e91e63;
                padding: 20px;
                margin: 25px 0;
                border-radius: 4px;
            }
            .cta-button {
                display: inline-block;
                background: #e91e63;
                color: #ffffff !important;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
            }
            .cta-center {
                text-align: center;
                margin: 30px 0;
            }
            .footer {
                text-align: center;
                margin-top: 50px;
                padding-top: 30px;
                border-top: 2px solid #e1e8ed;
                color: #657786;
                font-size: 14px;
            }
            .footer a {
                color: #657786;
                text-decoration: none;
            }
            .footer a:hover {
                text-decoration: underline;
            }
        """

        # Template-specific header styling
        template_headers = {
            'announcement': {
                'emoji': '📢',
                'color': '#e91e63',
                'subtitle': 'Important Announcement'
            },
            'update': {
                'emoji': '🎉',
                'color': '#2196F3',
                'subtitle': 'Platform Update'
            },
            'maintenance': {
                'emoji': '🔧',
                'color': '#FF9800',
                'subtitle': 'Scheduled Maintenance'
            },
            'custom': {
                'emoji': '',
                'color': '#2c3e50',
                'subtitle': ''
            }
        }

        header_config = template_headers.get(template, template_headers['custom'])

        # Combine styles
        final_styles = base_styles
        if custom_styles:
            final_styles += f"\n{custom_styles}"

        # Build HTML
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{subject}</title>
            <style>
                {final_styles}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="logo">
                    <img src="{self.base_url}/ehco_logo-02.png" alt="EHCO Logo" />
                </div>

                <div class="header">
                    <h1 style="color: {header_config['color']};">
                        {header_config['emoji']} {subject}
                    </h1>
                    {f'<p class="subtitle">{header_config["subtitle"]}</p>' if header_config['subtitle'] else ''}
                </div>

                <div class="content">
                    {content}
                </div>

                <div class="footer">
                    <p>Thank you for being part of the EHCO community!</p>
                    <p>
                        <a href="{self.base_url}">Visit EHCO</a> |
                        <a href="{self.base_url}/profile/notifications">Manage Email Preferences</a>
                    </p>
                    <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                        © {datetime.now().year} EHCO. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        return html

    async def send_newsletter(
        self,
        subject: str,
        content: str,
        recipients: List[Dict[str, Any]],
        template: str = 'announcement',
        preview_only: bool = False,
        batch_size: int = 50
    ) -> Dict[str, Any]:
        """
        Send newsletter to recipients

        Args:
            subject: Email subject
            content: Email content (HTML allowed)
            recipients: List of recipient dicts
            template: Template type
            preview_only: If True, only generate HTML without sending
            batch_size: Number of emails to send in each batch

        Returns:
            Dict with send results
        """

        # Generate HTML
        html_content = self.generate_newsletter_html(subject, content, template)

        if preview_only:
            print("\n" + "="*60)
            print("PREVIEW MODE - Email will NOT be sent")
            print("="*60)
            print(f"\nSubject: {subject}")
            print(f"Template: {template}")
            print(f"Recipients: {len(recipients)} users")
            print("\n--- HTML Preview (first 1000 chars) ---")
            print(html_content[:1000])
            print("...\n")
            return {
                'preview': True,
                'html': html_content,
                'subject': subject,
                'recipient_count': len(recipients)
            }

        # Send emails
        print(f"\n📧 Sending newsletter to {len(recipients)} recipients...")
        print(f"Subject: {subject}")
        print(f"Template: {template}")

        results = {
            'total': len(recipients),
            'successful': 0,
            'failed': 0,
            'errors': [],
            'sent_at': datetime.now(timezone.utc)
        }

        # Send in batches with rate limiting
        for i in range(0, len(recipients), batch_size):
            batch = recipients[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(recipients) + batch_size - 1) // batch_size

            print(f"\nProcessing batch {batch_num}/{total_batches} ({len(batch)} emails)...")

            for recipient in batch:
                try:
                    await self._send_email(
                        to_email=recipient['email'],
                        subject=subject,
                        html_content=html_content,
                        user_id=recipient['user_id']
                    )
                    results['successful'] += 1

                except Exception as e:
                    results['failed'] += 1
                    error_msg = f"{recipient['email']}: {str(e)}"
                    results['errors'].append(error_msg)
                    print(f"  ✗ Failed: {error_msg}")

            # Small delay between batches to avoid rate limits
            if i + batch_size < len(recipients):
                await asyncio.sleep(1)

        # Log the send to Firestore
        await self._log_newsletter_send(subject, template, results)

        print(f"\n{'='*60}")
        print(f"Newsletter Send Complete!")
        print(f"{'='*60}")
        print(f"Total: {results['total']}")
        print(f"✓ Successful: {results['successful']}")
        print(f"✗ Failed: {results['failed']}")

        if results['errors']:
            print(f"\nErrors:")
            for error in results['errors'][:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(results['errors']) > 10:
                print(f"  ... and {len(results['errors']) - 10} more")

        return results

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

            print(f"  ✓ Sent to {to_email} (via Gmail SMTP)")

        except Exception as e:
            raise Exception(f"Error sending via Gmail SMTP to {to_email}: {e}")

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

            if response.status_code != 202:
                raise Exception(f"SendGrid API error: {response.status_code}")

            print(f"  ✓ Sent to {to_email} (via SendGrid)")

        except Exception as e:
            raise Exception(f"Error sending via SendGrid to {to_email}: {e}")

    async def _log_newsletter_send(self, subject: str, template: str, results: Dict[str, Any]):
        """Log newsletter send to Firestore for tracking"""
        try:
            log_data = {
                'subject': subject,
                'template': template,
                'type': 'manual',
                'sentAt': results['sent_at'],
                'stats': {
                    'total': results['total'],
                    'successful': results['successful'],
                    'failed': results['failed']
                },
                'errors': results['errors'][:50]  # Store first 50 errors
            }

            # Store in newsletter-logs collection
            log_ref = self.db.collection('newsletter-logs').document()
            await asyncio.to_thread(log_ref.set, log_data)

            print(f"✓ Newsletter send logged to Firestore")

        except Exception as e:
            print(f"Warning: Could not log newsletter send: {e}")

    async def send_test_email(self, test_email: str, subject: str, content: str, template: str = 'announcement'):
        """Send a test newsletter to a single email address"""
        print(f"\n📧 Sending test newsletter to {test_email}...")

        html_content = self.generate_newsletter_html(subject, content, template)

        try:
            await self._send_email(
                to_email=test_email,
                subject=f"[TEST] {subject}",
                html_content=html_content,
                user_id='test_user'
            )
            print(f"✓ Test email sent successfully to {test_email}")
            return True

        except Exception as e:
            print(f"✗ Failed to send test email: {e}")
            return False


def load_content_from_file(file_path: str) -> str:
    """Load newsletter content from a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        raise Exception(f"Error loading content from {file_path}: {e}")


async def main():
    parser = argparse.ArgumentParser(
        description="Send custom newsletters to EHCO users",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview a newsletter without sending
  python manual_newsletter.py \\
    --subject "New Feature Launch" \\
    --content "We're excited to announce..." \\
    --preview

  # Send to all newsletter-enabled users
  python manual_newsletter.py \\
    --subject "Platform Update" \\
    --content-file announcement.html \\
    --template update \\
    --send

  # Send test email first
  python manual_newsletter.py \\
    --subject "Maintenance Notice" \\
    --content-file maintenance.html \\
    --template maintenance \\
    --test-email your@email.com

  # Send to all users (including those who disabled newsletters)
  python manual_newsletter.py \\
    --subject "Critical Security Update" \\
    --content "Please update your password..." \\
    --recipients all \\
    --send
        """
    )

    parser.add_argument('--subject', required=True, help='Email subject line')
    parser.add_argument('--content', help='Email content (plain text or HTML)')
    parser.add_argument('--content-file', help='Path to file containing email content')
    parser.add_argument('--template',
                       choices=['announcement', 'update', 'maintenance', 'custom'],
                       default='announcement',
                       help='Email template type (default: announcement)')
    parser.add_argument('--recipients',
                       choices=['newsletter-enabled', 'all'],
                       default='newsletter-enabled',
                       help='Who to send to (default: newsletter-enabled)')
    parser.add_argument('--preview', action='store_true',
                       help='Preview the email without sending')
    parser.add_argument('--test-email',
                       help='Send test email to this address instead of real users')
    parser.add_argument('--send', action='store_true',
                       help='Actually send the emails (required for safety)')
    parser.add_argument('--batch-size', type=int, default=50,
                       help='Number of emails to send per batch (default: 50)')

    args = parser.parse_args()

    # Validate content input
    if not args.content and not args.content_file:
        parser.error("Either --content or --content-file is required")

    if args.content and args.content_file:
        parser.error("Use either --content or --content-file, not both")

    # Load content
    if args.content_file:
        content = load_content_from_file(args.content_file)
    else:
        content = args.content

    # Initialize service
    service = ManualNewsletterService()

    # Handle test email
    if args.test_email:
        await service.send_test_email(args.test_email, args.subject, content, args.template)
        return

    # Preview mode
    if args.preview:
        recipients = await service.get_recipient_list(args.recipients)
        await service.send_newsletter(
            subject=args.subject,
            content=content,
            recipients=recipients,
            template=args.template,
            preview_only=True
        )
        return

    # Actual send - require --send flag for safety
    if not args.send:
        print("⚠️  To actually send emails, you must include the --send flag")
        print("Use --preview to see what the email will look like")
        print("Use --test-email to send to a single test address first")
        return

    # Confirm before sending
    recipients = await service.get_recipient_list(args.recipients)

    print(f"\n{'='*60}")
    print(f"⚠️  WARNING: About to send newsletter to {len(recipients)} users")
    print(f"{'='*60}")
    print(f"Subject: {args.subject}")
    print(f"Template: {args.template}")
    print(f"Recipients: {args.recipients}")
    print()

    confirm = input("Type 'yes' to confirm and send: ").strip().lower()

    if confirm != 'yes':
        print("❌ Send cancelled")
        return

    # Send the newsletter
    await service.send_newsletter(
        subject=args.subject,
        content=content,
        recipients=recipients,
        template=args.template,
        preview_only=False,
        batch_size=args.batch_size
    )


if __name__ == "__main__":
    asyncio.run(main())

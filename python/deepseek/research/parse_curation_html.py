"""
HTML Curation Parser
====================
Parses HTML curation files and uploads structured data to Firestore.

IMPORTANT: Name HTML files exactly as the Firestore document ID
    - iu(leejieun).html → document ID: iu(leejieun)
    - bts.html → document ID: bts

Usage:
    # Parse all HTML files in the curation_html directory
    python parse_curation_html.py

    # Parse a specific file (figure ID auto-extracted from filename)
    python parse_curation_html.py --file iu(leejieun).html

    # Parse all files in dry-run mode (no upload)
    python parse_curation_html.py --dry-run

    # Parse a specific file with manual figure ID
    python parse_curation_html.py --file some_file.html --figure-id "iu(leejieun)"

Options:
    --file: Filename or path to a single HTML file (defaults to curation_html directory)
    --directory: Parse all HTML files in a directory (defaults to curation_html)
    --figure-id: Manually specify the figure ID (optional if filename matches document ID)
    --dry-run: Print extracted data without uploading to Firestore
"""

import argparse
import firebase_admin
from firebase_admin import credentials, firestore
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import os
import re
import json
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class CurationParser:
    def __init__(self, dry_run: bool = False):
        """Initialize the parser with Firebase connection"""
        self.dry_run = dry_run
        if not dry_run:
            self.db = self.setup_firebase()
        else:
            print("🔍 Running in DRY RUN mode - no data will be uploaded")

    def setup_firebase(self):
        """Initialize Firebase with environment variables"""
        load_dotenv()

        try:
            config_path = os.getenv('FIREBASE_CONFIG_PATH')
            database_url = os.getenv('FIREBASE_DEFAULT_DATABASE_URL')

            if not config_path:
                raise ValueError("FIREBASE_CONFIG_PATH not found in environment variables")
            if not database_url:
                raise ValueError("FIREBASE_DATABASE_URL not found in environment variables")
            if not os.path.exists(config_path):
                raise FileNotFoundError(f"Service account key not found at: {config_path}")

            try:
                cred = credentials.Certificate(config_path)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': database_url
                })
                print("✓ Firebase initialized successfully")
            except ValueError as e:
                if "The default Firebase app already exists" in str(e):
                    print("✓ Using existing Firebase app")
                else:
                    raise e

            db = firestore.client()
            print("✓ Firestore client connected successfully")
            return db

        except Exception as e:
            print(f"❌ Failed to initialize Firebase: {e}")
            raise

    def parse_html_file(self, file_path: str) -> Dict:
        """Parse a single HTML file and extract structured data"""
        print(f"\n📄 Parsing file: {file_path}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            soup = BeautifulSoup(html_content, 'html.parser')

            # Extract metadata
            curation_data = {
                'title': self._extract_title(soup),
                'subtitle': self._extract_subtitle(soup),
                'lastEdited': self._extract_last_edited(soup),
                'quickFacts': self._extract_quick_facts(soup),
                'articles': self._extract_articles(soup),
                'footnotes': self._extract_footnotes(soup)
            }

            print(f"✓ Successfully parsed HTML file")
            print(f"  - Title: {curation_data['title']}")
            print(f"  - Quick Facts: {len(curation_data['quickFacts'])} items")
            print(f"  - Articles: {len(curation_data['articles'])} sections")
            print(f"  - Footnotes: {len(curation_data['footnotes'])} sources")

            return curation_data

        except Exception as e:
            print(f"❌ Error parsing HTML file: {e}")
            raise

    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Extract the main page title"""
        title_elem = soup.find('h1', class_='page-title')
        return title_elem.get_text(strip=True) if title_elem else ""

    def _extract_subtitle(self, soup: BeautifulSoup) -> str:
        """Extract the page subtitle"""
        subtitle_elem = soup.find('p', class_='page-subtitle')
        return subtitle_elem.get_text(strip=True) if subtitle_elem else ""

    def _extract_last_edited(self, soup: BeautifulSoup) -> str:
        """Extract the last edited date"""
        edited_elem = soup.find('p', class_='curated-subtitle')
        if edited_elem:
            text = edited_elem.get_text(strip=True)
            # Extract just the date part after "Last edited: "
            match = re.search(r'Last edited:\s*(.+)', text)
            return match.group(1) if match else ""
        return ""

    def _extract_quick_facts(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract all quick facts with their badges and optional external links"""
        facts = []
        fact_items = soup.find_all('div', class_='fact-item')

        for item in fact_items:
            # Get the text content (excluding the badge)
            text_elem = item.find('span', class_='fact-bullet')
            if text_elem and text_elem.next_sibling:
                # Get the full text after the bullet
                fact_span = text_elem.find_next_sibling('span')
                if fact_span:
                    # Make a copy to work with
                    fact_span_copy = BeautifulSoup(str(fact_span), 'html.parser').find('span')

                    # Extract ALL external links and their associated text (before removing elements)
                    link_elems = fact_span_copy.find_all('a')
                    links = []

                    for link_elem in link_elems:
                        url = link_elem.get('href', '')
                        link_text = link_elem.get_text(strip=True)

                        if url and link_text:
                            links.append({
                                'url': url,
                                'text': link_text
                            })

                    # Extract the badge if present
                    badge_elem = fact_span_copy.find('span', class_='fact-badge')
                    badge_type = None

                    if badge_elem:
                        if 'verified' in badge_elem.get('class', []):
                            badge_type = 'verified'
                        elif 'community' in badge_elem.get('class', []):
                            badge_type = 'community'
                        elif 'self-reported' in badge_elem.get('class', []):
                            badge_type = 'self-reported'

                        # Remove badge from text
                        badge_elem.decompose()

                    # Get text with proper spacing (separating elements with spaces)
                    fact_text = fact_span_copy.get_text(separator=' ', strip=True)
                    # Clean up multiple spaces
                    fact_text = re.sub(r'\s+', ' ', fact_text)

                    fact_dict = {
                        'text': fact_text,
                        'badge': badge_type
                    }

                    # Add links array if any links were found
                    if links:
                        fact_dict['links'] = links

                    facts.append(fact_dict)

        return facts

    def _extract_articles(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract all article sections with their paragraphs, preserving HTML formatting"""
        articles = []
        article_sections = soup.find_all('article', class_='article-section')

        for section in article_sections:
            title_elem = section.find('h3', class_='article-section-title')

            # Extract title, handling potential links in the title
            if title_elem:
                # Make a copy to preserve HTML
                title_copy = BeautifulSoup(str(title_elem), 'html.parser').find('h3')
                # Remove any footnote refs from title
                for fn_link in title_copy.find_all('a', class_='footnote-ref'):
                    fn_link.decompose()
                title = title_copy.get_text(strip=True)
            else:
                title = ""

            paragraphs = []
            paragraph_elems = section.find_all('p', class_='article-paragraph')

            for para in paragraph_elems:
                # Create a copy to work with
                para_copy = BeautifulSoup(str(para), 'html.parser').find('p')

                # Replace footnote links with [FN:X] markers for the text version
                para_text_copy = BeautifulSoup(str(para), 'html.parser').find('p')
                for link in para_text_copy.find_all('a', class_='footnote-ref'):
                    href = link.get('href', '')
                    match = re.search(r'#fn(\d+)', href)
                    if match:
                        footnote_num = match.group(1)
                        link.replace_with(f'[FN:{footnote_num}]')

                # Get plain text with footnote markers
                text = para_text_copy.get_text(separator=' ', strip=True)
                text = re.sub(r'\s+', ' ', text).strip()

                # Create HTML version with formatting preserved
                # Remove only footnote refs, keep all other HTML (links, formatting)
                for link in para_copy.find_all('a', class_='footnote-ref'):
                    href = link.get('href', '')
                    match = re.search(r'#fn(\d+)', href)
                    if match:
                        footnote_num = match.group(1)
                        # Replace with a span containing the footnote marker
                        link.replace_with(f'[FN:{footnote_num}]')

                # Get inner HTML, preserving all formatting tags
                html_content = ''.join(str(child) for child in para_copy.children)
                # Clean up extra whitespace
                html_content = re.sub(r'\s+', ' ', html_content).strip()

                paragraphs.append({
                    'text': text,
                    'html': html_content
                })

            articles.append({
                'title': title,
                'paragraphs': paragraphs
            })

        return articles

    def _extract_footnotes(self, soup: BeautifulSoup) -> List[Dict]:
        """Extract all footnotes/sources"""
        footnotes = []
        footnote_items = soup.find_all('div', class_='footnote-item')

        for item in footnote_items:
            number_elem = item.find('span', class_='footnote-number')
            text_elem = item.find('span', class_='footnote-text')

            if number_elem and text_elem:
                number = int(number_elem.get_text(strip=True))

                # Extract URL if present
                link_elem = text_elem.find('a')
                url = link_elem.get('href', '') if link_elem else ''

                # Get the text content
                text = text_elem.get_text(strip=True)

                footnotes.append({
                    'number': number,
                    'text': text,
                    'url': url
                })

        return footnotes

    def upload_to_firestore(self, figure_id: str, curation_data: Dict) -> bool:
        """Upload the parsed curation data to Firestore"""
        if self.dry_run:
            print("\n🔍 DRY RUN - Would upload the following data:")
            print(json.dumps(curation_data, indent=2, ensure_ascii=False))
            return True

        try:
            print(f"\n📤 Uploading curation data for figure: {figure_id}")

            # Reference to the figure document
            figure_ref = self.db.collection('selected-figures').document(figure_id)

            # Check if the figure exists
            if not figure_ref.get().exists:
                print(f"❌ Figure '{figure_id}' not found in selected-figures collection")
                return False

            # Update the figure document with curation_data
            figure_ref.update({
                'curation_data': curation_data
            })

            print(f"✅ Successfully uploaded curation data to Firestore")
            print(f"   Figure ID: {figure_id}")
            print(f"   Field: curation_data")

            return True

        except Exception as e:
            print(f"❌ Error uploading to Firestore: {e}")
            return False

    def infer_figure_id(self, file_path: str) -> Optional[str]:
        """
        Extract the figure ID from the filename.
        The filename should match the Firestore document ID exactly.

        Examples:
            'iu(leejieun).html' -> 'iu(leejieun)'
            'bts.html' -> 'bts'
            'blackpink.html' -> 'blackpink'
        """
        filename = Path(file_path).stem  # Gets filename without .html extension
        return filename

    def process_file(self, file_path: str, figure_id: Optional[str] = None) -> bool:
        """Parse and upload a single HTML file"""
        # Parse the HTML
        curation_data = self.parse_html_file(file_path)

        # If figure_id not provided, try to infer it
        if not figure_id:
            figure_id = self.infer_figure_id(file_path)
            print(f"ℹ️  Inferred figure ID: {figure_id}")
            print(f"   (use --figure-id to specify manually)")

        # Upload to Firestore
        return self.upload_to_firestore(figure_id, curation_data)

    def process_directory(self, directory_path: str) -> Dict[str, bool]:
        """Parse and upload all HTML files in a directory"""
        results = {}
        html_files = list(Path(directory_path).glob('*.html'))

        if not html_files:
            print(f"❌ No HTML files found in directory: {directory_path}")
            return results

        print(f"\n📁 Found {len(html_files)} HTML file(s) in directory")

        for file_path in html_files:
            success = self.process_file(str(file_path))
            results[str(file_path)] = success

        return results


def main():
    # Default directory for HTML files
    script_dir = Path(__file__).parent
    default_html_dir = script_dir / 'curation_html'

    parser = argparse.ArgumentParser(
        description='Parse HTML curation files and upload to Firestore',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    parser.add_argument('--file', type=str, help='Filename or path to a single HTML file (searches in curation_html by default)')
    parser.add_argument('--directory', type=str, help=f'Path to directory containing HTML files (default: {default_html_dir})')
    parser.add_argument('--figure-id', type=str, help='Figure ID (required with --file)')
    parser.add_argument('--dry-run', action='store_true', help='Parse and print data without uploading')

    args = parser.parse_args()

    # If both file and directory specified, error
    if args.file and args.directory:
        parser.error("Cannot specify both --file and --directory")

    # Determine the directory to use
    target_directory = args.directory if args.directory else str(default_html_dir)

    # If file is specified, resolve its path
    if args.file:
        file_path = Path(args.file)
        # If it's not an absolute path and doesn't exist, look in the default directory
        if not file_path.is_absolute() and not file_path.exists():
            file_path = default_html_dir / args.file

        if not file_path.exists():
            parser.error(f"File not found: {file_path}")

        args.file = str(file_path)

    # Validate figure-id requirement for single file processing
    if args.file and not args.figure_id and not args.dry_run:
        response = input("No --figure-id specified. Attempt to infer from filename? (y/n): ")
        if response.lower() != 'y':
            parser.error("--figure-id is required when using --file")

    # Create parser instance
    curation_parser = CurationParser(dry_run=args.dry_run)

    # Process file(s)
    try:
        if args.file:
            success = curation_parser.process_file(args.file, args.figure_id)
            if success:
                print("\n✅ Processing completed successfully!")
            else:
                print("\n❌ Processing failed")
                exit(1)

        else:
            # Process the target directory (either specified or default)
            results = curation_parser.process_directory(target_directory)

            # Print summary
            success_count = sum(1 for v in results.values() if v)
            total_count = len(results)

            print(f"\n{'='*60}")
            print(f"📊 Processing Summary")
            print(f"{'='*60}")
            print(f"Total files: {total_count}")
            print(f"Successful: {success_count}")
            print(f"Failed: {total_count - success_count}")

            if total_count != success_count:
                print("\nFailed files:")
                for file_path, success in results.items():
                    if not success:
                        print(f"  - {file_path}")
                exit(1)

    except KeyboardInterrupt:
        print("\n\n⚠️  Process interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        exit(1)


if __name__ == "__main__":
    main()

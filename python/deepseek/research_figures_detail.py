import asyncio
from typing import Dict, List, Optional
import argparse

class FigureDataEnricher:
    def __init__(self, news_manager):
        self.news_manager = news_manager
        self.db = news_manager.db
        self.dry_run = False
        
    async def research_figure_data(self, name: str, occupation: str) -> Dict[str, str]:
        """Research and extract all required data for a figure using DeepSeek"""
        
        prompt = f"""
        Please research the following celebrity/group and provide ONLY the requested information in a structured format. If information is not available, use "N/A".

        Name: {name}
        Occupation: {occupation}

        Please provide the following information:
        1. Fandom name (official fanbase name)
        2. Official colors (primary brand colors, comma separated)
        3. YouTube channel details (channel URL and subscriber count in format "URL|subscribers")
        4. Twitter/X profile details (profile URL and follower count in format "URL|followers") 
        5. Spotify details (artist URL and monthly listeners in format "URL|monthly_listeners")
        6. Weverse or similar platform link (URL only)
        7. TikTok profile details (URL and follower count in format "URL|followers")
        8. Instagram profile details (URL and follower count in format "URL|followers")
        9. Total number of awards won globally (just the number)

        Format your response exactly like this:
        FANDOM: [value]
        COLORS: [value]
        YOUTUBE: [value]
        TWITTER: [value]
        SPOTIFY: [value]
        WEVERSE: [value]
        TIKTOK: [value]
        INSTAGRAM: [value]
        AWARDS: [value]
        """
        
        try:
            response = await self.news_manager.client.chat.completions.create(
                model=self.news_manager.model,
                messages=[
                    {"role": "system", "content": "You are a research assistant that provides accurate, concise information about celebrities and artists. Always use the exact format requested."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            return self._parse_response(response.choices[0].message.content)
            
        except Exception as e:
            print(f"Error researching {name}: {e}")
            return self._create_empty_data()
    
    def _parse_response(self, response_text: str) -> Dict[str, str]:
        """Parse the DeepSeek response into a structured dictionary"""
        data = self._create_empty_data()
        
        lines = response_text.strip().split('\n')
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().upper()
                value = value.strip()
                
                if key in data:
                    data[key] = value if value != 'N/A' else ''
        
        return data
    
    def _create_empty_data(self) -> Dict[str, str]:
        """Create a dictionary with all required fields empty"""
        return {
            'FANDOM': '',
            'COLORS': '',
            'YOUTUBE': '',
            'TWITTER': '',
            'SPOTIFY': '',
            'WEVERSE': '',
            'TIKTOK': '',
            'INSTAGRAM': '',
            'AWARDS': ''
        }
    
    def _extract_count(self, combined_string: str) -> str:
        """Extract just the count from combined URL|count strings"""
        if '|' in combined_string:
            return combined_string.split('|')[1]
        return ''
    
    def _extract_url(self, combined_string: str) -> str:
        """Extract just the URL from combined URL|count strings"""
        if '|' in combined_string:
            return combined_string.split('|')[0]
        return combined_string
    
    def _print_research_results(self, name: str, update_data: Dict):
        """Print the research results in a readable format"""
        print(f"\n📊 Research Results for: {name}")
        print("=" * 50)
        print(f"🎯 Fandom Name: {update_data['fandomName']}")
        print(f"🎨 Official Colors: {update_data['officialColors']}")
        print(f"📺 YouTube: {update_data['youtubeLink']} | Subs: {update_data['youtubeSubscribers']}")
        print(f"🐦 Twitter: {update_data['twitterLink']} | Followers: {update_data['twitterFollowers']}")
        print(f"🎵 Spotify: {update_data['spotifyLink']} | Monthly Listeners: {update_data['spotifyMonthlyListeners']}")
        print(f"🌟 Weverse: {update_data['weverseLink']}")
        print(f"🎵 TikTok: {update_data['tiktokLink']} | Followers: {update_data['tiktokFollowers']}")
        print(f"📷 Instagram: {update_data['instagramLink']} | Followers: {update_data['instagramFollowers']}")
        print(f"🏆 Total Awards: {update_data['totalAwards']}")
        print("=" * 50)
    
    async def process_all_figures(self, dry_run: bool = False):
        """Process all figures in the selected-figures collection"""
        self.dry_run = dry_run
        
        if dry_run:
            print("🚨 DRY RUN MODE - No changes will be saved to database")
        
        try:
            figures_ref = self.db.collection('selected-figures')
            figures = figures_ref.stream()
            
            figures_list = list(figures)
            print(f"Found {len(figures_list)} figures to process")
            
            for i, figure_doc in enumerate(figures_list, 1):
                figure_data = figure_doc.to_dict()
                figure_id = figure_doc.id
                name = figure_data.get('name', '')
                occupation = figure_data.get('occupation', '')
                
                if not name:
                    print(f"Skipping figure {figure_id} - no name found")
                    continue
                
                print(f"\n[{i}/{len(figures_list)}] Researching: {name} ({occupation})")
                
                # Research the data
                researched_data = await self.research_figure_data(name, occupation)
                
                # Prepare the data for Firestore
                update_data = {
                    'fandomName': researched_data['FANDOM'],
                    'officialColors': researched_data['COLORS'],
                    'youtubeLink': self._extract_url(researched_data['YOUTUBE']),
                    'youtubeSubscribers': self._extract_count(researched_data['YOUTUBE']),
                    'twitterLink': self._extract_url(researched_data['TWITTER']),
                    'twitterFollowers': self._extract_count(researched_data['TWITTER']),
                    'spotifyLink': self._extract_url(researched_data['SPOTIFY']),
                    'spotifyMonthlyListeners': self._extract_count(researched_data['SPOTIFY']),
                    'weverseLink': researched_data['WEVERSE'],
                    'tiktokLink': self._extract_url(researched_data['TIKTOK']),
                    'tiktokFollowers': self._extract_count(researched_data['TIKTOK']),
                    'instagramLink': self._extract_url(researched_data['INSTAGRAM']),
                    'instagramFollowers': self._extract_count(researched_data['INSTAGRAM']),
                    'totalAwards': researched_data['AWARDS']
                }
                
                # Print results
                self._print_research_results(name, update_data)
                
                # Update the Firestore document if not in dry run mode
                if not dry_run:
                    figure_doc.reference.update(update_data)
                    print(f"✅ Updated {name} in database")
                else:
                    print(f"🔶 [DRY RUN] Would update {name} in database")
                
                # Small delay to be respectful of API limits
                await asyncio.sleep(1)
                
            print("\n✅ All figures processed successfully!")
            
        except Exception as e:
            print(f"Error processing figures: {e}")
            raise
    
    async def process_single_figure(self, figure_id: str, dry_run: bool = False):
        """Process a single figure by document ID"""
        self.dry_run = dry_run
        
        if dry_run:
            print("🚨 DRY RUN MODE - No changes will be saved to database")
            
        try:
            figure_ref = self.db.collection('selected-figures').document(figure_id)
            figure_doc = figure_ref.get()
            
            if not figure_doc.exists:
                print(f"Figure {figure_id} not found")
                return
            
            figure_data = figure_doc.to_dict()
            name = figure_data.get('name', '')
            occupation = figure_data.get('occupation', '')
            
            print(f"Researching: {name} ({occupation})")
            
            # Research the data
            researched_data = await self.research_figure_data(name, occupation)
            
            # Prepare the data for Firestore
            update_data = {
                'fandomName': researched_data['FANDOM'],
                'officialColors': researched_data['COLORS'],
                'youtubeLink': self._extract_url(researched_data['YOUTUBE']),
                'youtubeSubscribers': self._extract_count(researched_data['YOUTUBE']),
                'twitterLink': self._extract_url(researched_data['TWITTER']),
                'twitterFollowers': self._extract_count(researched_data['TWITTER']),
                'spotifyLink': self._extract_url(researched_data['SPOTIFY']),
                'spotifyMonthlyListeners': self._extract_count(researched_data['SPOTIFY']),
                'weverseLink': researched_data['WEVERSE'],
                'tiktokLink': self._extract_url(researched_data['TIKTOK']),
                'tiktokFollowers': self._extract_count(researched_data['TIKTOK']),
                'instagramLink': self._extract_url(researched_data['INSTAGRAM']),
                'instagramFollowers': self._extract_count(researched_data['INSTAGRAM']),
                'totalAwards': researched_data['AWARDS']
            }
            
            # Print results
            self._print_research_results(name, update_data)
            
            # Update the Firestore document if not in dry run mode
            if not dry_run:
                figure_doc.reference.update(update_data)
                print(f"✅ Updated {name} in database")
            else:
                print(f"🔶 [DRY RUN] Would update {name} in database")
            
        except Exception as e:
            print(f"Error processing figure {figure_id}: {e}")
            raise

def setup_arguments():
    """Set up command line arguments"""
    parser = argparse.ArgumentParser(description='Research and populate figure data')
    parser.add_argument(
        '--figure', 
        '-f', 
        type=str,
        help='Process a single figure by document ID (e.g., "blackpink")'
    )
    parser.add_argument(
        '--dry-run', 
        '-d', 
        action='store_true',
        help='Run without saving to database (dry run mode)'
    )
    parser.add_argument(
        '--all', 
        '-a', 
        action='store_true',
        help='Process all figures (default behavior)'
    )
    
    return parser.parse_args()

# Usage example
async def main():
    # Import your existing setup
    from setup_firebase_deepseek import news_manager
    
    try:
        # Parse command line arguments
        args = setup_arguments()
        
        enricher = FigureDataEnricher(news_manager)
        
        # Determine which mode to run
        if args.figure:
            # Single figure mode
            await enricher.process_single_figure(args.figure, args.dry_run)
        else:
            # All figures mode (default)
            await enricher.process_all_figures(args.dry_run)
        
    finally:
        await news_manager.close()

if __name__ == "__main__":
    asyncio.run(main())
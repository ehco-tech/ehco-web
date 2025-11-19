import asyncio
import json
import re
from datetime import datetime

class AlbumByAlbumDiscographyFinder:
    def __init__(self, news_manager):
        self.news_manager = news_manager
        self.client = news_manager.client
        self.model = news_manager.model
        self.processed_albums = []
    
    async def get_detailed_discography(self, figure_name, occupation="K-pop group"):
        """Get detailed discography by processing each album individually"""
        try:
            print(f"🎵 Starting ALBUM-BY-ALBUM discography retrieval for {figure_name}...")
            
            # First, get the complete album list
            album_list = await self._get_complete_album_list(figure_name, occupation)
            if not album_list:
                print("❌ Failed to get album list")
                return None
            
            print(f"📚 Found {len(album_list)} albums. Processing each individually...")
            
            # Process each album one by one
            all_albums = []
            total_albums = len(album_list)
            
            for i, album_info in enumerate(album_list, 1):
                print(f"\n🔄 Processing album {i}/{total_albums}: '{album_info['title']}'")
                
                album_details = await self._get_single_album_details(
                    figure_name, album_info['title'], album_info
                )
                
                if album_details:
                    all_albums.append(album_details)
                    print(f"✅ Successfully processed '{album_info['title']}'")
                else:
                    # Create basic album entry if details failed
                    basic_album = {
                        "title": album_info['title'],
                        "release_date": album_info.get('release_date', 'Unknown'),
                        "type": album_info.get('type', 'Unknown'),
                        "language": "Unknown",
                        "label": "Unknown",
                        "total_tracks": 0,
                        "title_track": "Unknown",
                        "promoted_singles": [],
                        "worldwide_chart_performance": {},
                        "awards": [],
                        "accomplishments": [],
                        "tracks": [],
                        "album_versions": [],
                        "notable_facts": ["Detailed information unavailable"]
                    }
                    all_albums.append(basic_album)
                    print(f"⚠️  Used basic info for '{album_info['title']}'")
                
                # Delay between requests to avoid rate limiting
                if i < total_albums:  # No delay after last album
                    await asyncio.sleep(2)  # 2-second delay between albums
            
            # Get career highlights
            career_highlights = await self._get_career_highlights(figure_name)
            
            # Compile final result
            final_result = {
                "figure_name": figure_name,
                "discography_type": "detailed_discography",
                "total_albums": len(all_albums),
                "total_songs": sum(album.get('total_tracks', 0) for album in all_albums),
                "albums": all_albums,
                "career_highlights": career_highlights,
                "last_updated": datetime.now().strftime('%Y-%m-%d'),
                "processing_notes": f"Processed {len(all_albums)} albums individually"
            }
            
            self._display_detailed_discography(final_result)
            return final_result
            
        except Exception as e:
            print(f"Error getting discography for {figure_name}: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    async def _get_complete_album_list(self, figure_name, occupation):
        """Get complete list of all albums"""
        prompt = f"""For {figure_name} ({occupation}), provide a COMPLETE list of ALL their official album releases.

Include:
- Studio albums
- EP albums  
- Single albums
- Compilation albums
- Live albums
- Japanese releases
- Special albums
- Any other official album releases

Return as JSON:
{{
    "albums": [
        {{
            "title": "Exact Album Title",
            "release_date": "YYYY-MM-DD",
            "type": "studio/EP/single_album/compilation/live/special"
        }}
    ]
}}

Be thorough and include ALL releases. ONLY return JSON."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a comprehensive music catalog expert. Provide complete album lists."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=3000
            )
            
            result = response.choices[0].message.content
            data = self._parse_json_response(result)
            return data.get('albums', []) if data else []
            
        except Exception as e:
            print(f"Error getting album list: {e}")
            return []
    
    async def _get_single_album_details(self, figure_name, album_title, album_info):
        """Get detailed information for a single album"""
        prompt = f"""Provide COMPREHENSIVE details for this specific album:

Artist: {figure_name}
Album: "{album_title}"
Release Date: {album_info.get('release_date', 'Unknown')}
Type: {album_info.get('type', 'Unknown')}

Please provide COMPLETE information including:

BASIC INFO:
- Exact release date
- Album type (studio/EP/single/compilation/etc)
- Language(s)
- Record label
- Total number of tracks

CHARTS & COMMERCIAL PERFORMANCE:
- Billboard 200 peak position (if charted)
- Other international chart positions (UK, Canada, etc.)
- Certifications and sales figures
- Chart performance of singles

TRACKLISTING (COMPLETE):
- Every track in order with track numbers
- Exact song titles and durations
- Writers and producers for each track
- Identify: title tracks, promoted singles, solo tracks, collaborations
- For solo tracks: specify which member
- For collaborations: specify collaborating artists
- Music video view counts for tracks that have MVs
- Chart performance for individual tracks

AWARDS & ACHIEVEMENTS:
- Major awards won or nominated for
- Chart records and milestones
- Cultural impact and notable facts

ALBUM VERSIONS:
- Different editions, versions, or re-releases

Return as this EXACT JSON format:
{{
    "title": "{album_title}",
    "release_date": "YYYY-MM-DD",
    "type": "studio/EP/single_album/compilation/live",
    "language": "Korean/Japanese/English/Multiple",
    "label": "Record Label",
    "total_tracks": 0,
    "title_track": "Main Title Track",
    "promoted_singles": ["Single1", "Single2"],
    "worldwide_chart_performance": {{
        "billboard_200": "Peak position or 'Did not chart'",
        "billboard_hot_100_singles": ["Single: Position", "Single: Position"],
        "uk_albums_chart": "Peak position",
        "other_international_charts": ["Chart: Position"],
        "certifications": "Certification details",
        "sales_figures": "Sales numbers"
    }},
    "awards": ["Award 1", "Award 2"],
    "accomplishments": ["Accomplishment 1", "Accomplishment 2"],
    "tracks": [
        {{
            "track_number": 1,
            "title": "Exact Song Title",
            "duration": "MM:SS",
            "writers": ["Writer 1", "Writer 2"],
            "producers": ["Producer 1", "Producer 2"],
            "type": "title_track/promoted_single/solo/collaboration/b-side/interlude",
            "solo_member": "Member Name (if solo track)",
            "collaborating_artist": "Artist Name (if collaboration)",
            "music_video_views": "View count if available",
            "worldwide_chart_performance": {{
                "billboard_hot_100": "Position or null",
                "billboard_global_200": "Position or null",
                "other_charts": "Chart details"
            }}
        }}
    ],
    "album_versions": ["Standard Edition", "Limited Edition", "etc"],
    "notable_facts": ["Fact 1", "Fact 2"]
}}

Be thorough and accurate. Include ALL tracks. Focus on international chart data.
ONLY return the JSON for this single album."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a meticulous music archivist. Provide exhaustive album details with complete track information."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=4000
            )
            
            result = response.choices[0].message.content
            data = self._parse_json_response(result)
            return data
            
        except Exception as e:
            print(f"Error getting details for album '{album_title}': {e}")
            return None
    
    async def _get_career_highlights(self, figure_name):
        """Get career highlights"""
        prompt = f"""Provide 5-7 major career highlights for {figure_name}, focusing on international achievements:
        - Billboard chart records
        - Global sales milestones
        - Historic firsts and records
        - Major award achievements
        - Cultural impact
        
        Return as JSON: {{"highlights": ["highlight1", "highlight2"]}}
        ONLY return JSON."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a music historian. Provide key career achievements."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=1500
            )
            
            result = response.choices[0].message.content
            data = self._parse_json_response(result)
            return data.get('highlights', []) if data else []
            
        except Exception as e:
            print(f"Error getting career highlights: {e}")
            return ["Career highlights unavailable"]
    
    def _parse_json_response(self, response):
        """Robust JSON parsing"""
        try:
            cleaned = re.sub(r'^```json\s*|\s*```$', '', response.strip(), flags=re.MULTILINE)
            
            # Try direct parse first
            try:
                return json.loads(cleaned)
            except json.JSONDecodeError as e:
                print(f"⚠️  JSON parse error: {e}")
            
            # Try to extract JSON object
            match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except json.JSONDecodeError:
                    pass
            
            return None
            
        except Exception as e:
            print(f"JSON parsing error: {e}")
            return None
    
    def _display_detailed_discography(self, data):
        """Display the detailed discography"""
        print("\n" + "="*80)
        print(f"🎵 COMPREHENSIVE ALBUM-BY-ALBUM DISCOGRAPHY")
        print("="*80)
        print(f"👤 Artist: {data.get('figure_name', 'Unknown')}")
        print(f"📊 Total Albums: {data.get('total_albums', 0)}")
        print(f"🎶 Total Songs: {data.get('total_songs', 0)}")
        print(f"📅 Last Updated: {data.get('last_updated', 'Unknown')}")
        print(f"💡 Processing: {data.get('processing_notes', 'Individual album processing')}")
        print("="*80)
        
        # Career highlights
        highlights = data.get('career_highlights', [])
        if highlights:
            print("\n🌟 CAREER HIGHLIGHTS:")
            for i, highlight in enumerate(highlights, 1):
                print(f"   {i}. {highlight}")
        
        # Albums with detailed information
        albums = data.get('albums', [])
        for album_idx, album in enumerate(albums, 1):
            print(f"\n{'─'*60}")
            print(f"💿 ALBUM {album_idx}: {album.get('title', 'Unknown').upper()}")
            print(f"{'─'*60}")
            
            # Basic info
            print(f"   📅 Release Date: {album.get('release_date', 'Unknown')}")
            print(f"   🎵 Type: {album.get('type', 'Unknown').title()}")
            print(f"   🌐 Language: {album.get('language', 'Unknown')}")
            print(f"   🏷️  Label: {album.get('label', 'Unknown')}")
            print(f"   📊 Total Tracks: {album.get('total_tracks', 0)}")
            
            # Title track
            title_track = album.get('title_track')
            if title_track and title_track != "Unknown":
                print(f"   🎤 Title Track: {title_track}")
            
            # Promoted singles
            promoted = album.get('promoted_singles', [])
            if promoted:
                print(f"   📢 Promoted Singles: {', '.join(promoted)}")
            
            # Worldwide charts
            charts = album.get('worldwide_chart_performance', {})
            if charts:
                print(f"\n   🌍 WORLDWIDE CHARTS:")
                if charts.get('billboard_200') and charts['billboard_200'] != 'Did not chart':
                    print(f"      🇺🇸 Billboard 200: #{charts['billboard_200']}")
                if charts.get('uk_albums_chart'):
                    print(f"      🇬🇧 UK Albums Chart: #{charts['uk_albums_chart']}")
                if charts.get('billboard_hot_100_singles'):
                    print(f"      🎵 Hot 100 Singles:")
                    for single in charts['billboard_hot_100_singles'][:3]:  # Show first 3
                        print(f"         • {single}")
                if charts.get('certifications'):
                    print(f"      📜 Certifications: {charts['certifications']}")
                if charts.get('sales_figures'):
                    print(f"      💰 Sales: {charts['sales_figures']}")
            
            # Awards
            awards = album.get('awards', [])
            if awards:
                print(f"\n   🏅 AWARDS: {', '.join(awards[:3])}{'...' if len(awards) > 3 else ''}")
            
            # Tracks - show complete list but compact
            tracks = album.get('tracks', [])
            if tracks:
                print(f"\n   🎶 COMPLETE TRACKLIST ({len(tracks)} tracks):")
                for track in tracks:
                    emoji = "🎵"
                    track_type = track.get('type', '')
                    if track_type == 'title_track': emoji = "🔥"
                    if track_type == 'promoted_single': emoji = "📻"
                    if track_type == 'solo': emoji = "⭐"
                    if track_type == 'collaboration': emoji = "🤝"
                    if track_type == 'interlude': emoji = "🎼"
                    
                    line = f"      {track.get('track_number', '?')}. {emoji} {track.get('title', 'Unknown')}"
                    if track.get('duration'):
                        line += f" [{track['duration']}]"
                    
                    # Additional info
                    extras = []
                    if track.get('solo_member'):
                        extras.append(f"Solo: {track['solo_member']}")
                    if track.get('collaborating_artist'):
                        extras.append(f"with {track['collaborating_artist']}")
                    
                    if extras:
                        line += f" ({'; '.join(extras)})"
                    
                    print(line)
            
            # Notable facts
            facts = album.get('notable_facts', [])
            if facts and facts != ["Detailed information unavailable"]:
                print(f"\n   💡 NOTABLE FACTS:")
                for fact in facts[:2]:  # Show first 2 facts
                    print(f"      • {fact}")
        
        print(f"\n{'='*80}")
        print("✅ ALBUM-BY-ALBUM PROCESSING COMPLETE")
        print("="*80)

# Test function
async def test_album_by_album():
    from setup_firebase_deepseek import news_manager
    
    try:
        print("🚀 STARTING ALBUM-BY-ALBUM PROCESSING...")
        print("This will process each album individually for maximum accuracy.\n")
        
        finder = AlbumByAlbumDiscographyFinder(news_manager)
        
        # Test with a smaller artist first to verify it works
        result = await finder.get_detailed_discography("Blackpink", "K-pop girl group")
        
        # Then try with BTS
        # result = await finder.get_detailed_discography("BTS", "K-pop boy group")
        
        if result:
            print(f"\n🎉 SUCCESS! Processed {len(result.get('albums', []))} albums individually!")
            print("💡 Each album was processed with maximum detail and accuracy.")
        else:
            print("\n❌ Processing failed.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await news_manager.close()
        print("\n🔚 Script execution completed.")

if __name__ == "__main__":
    asyncio.run(test_album_by_album())
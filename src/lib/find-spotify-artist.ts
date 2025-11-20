// Script to find correct Spotify artist ID for BIGBANG (or any artist)
// Run with: npx tsx find-spotify-artist.ts

import { searchSpotifyArtist } from "./spotify";

async function findArtist(artistName: string) {
    console.log(`🔍 Searching for: ${artistName}`);
    
    try {
        const artist = await searchSpotifyArtist(artistName);
        
        if (artist) {
            console.log('\n✅ Found artist:');
            console.log('━'.repeat(50));
            console.log(`Name: ${artist.name}`);
            console.log(`ID: ${artist.id}`);
            console.log(`URL: ${artist.external_urls.spotify}`);
            console.log(`Images: ${artist.images.length} available`);
            console.log('━'.repeat(50));
            console.log('\n📝 Update Firebase with this URL:');
            console.log(`spotifyUrl: "${artist.external_urls.spotify}"`);
        } else {
            console.log('❌ Artist not found on Spotify');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Usage examples:
findArtist('BIGBANG');

// Uncomment to search for other artists:
// findArtist('NewJeans');
// findArtist('BTS');
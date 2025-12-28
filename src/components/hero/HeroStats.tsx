// src/components/hero/HeroStats.tsx
'use client';

import React from 'react';

interface HeroStatsProps {
    youtubeSubscribers?: string;
    spotifyMonthlyListeners?: string;
    instagramFollowers?: string;
    totalAwards?: string | number;
    textColor: string;
}

const HeroStats: React.FC<HeroStatsProps> = ({
    youtubeSubscribers,
    spotifyMonthlyListeners,
    instagramFollowers,
    totalAwards,
    textColor
}) => {
    const isValidStat = (stat?: string | number): boolean => {
        if (!stat) return false;
        const strStat = stat.toString().trim();
        return strStat !== '' && strStat !== '0';
    };

    const hasAnyStats = isValidStat(youtubeSubscribers) ||
        isValidStat(spotifyMonthlyListeners) ||
        isValidStat(instagramFollowers) ||
        isValidStat(totalAwards);

    if (!hasAnyStats) return null;

    return (
        <div className="flex flex-wrap justify-center gap-16 max-w-4xl mx-auto">
            {/* YouTube Subscribers */}
            {isValidStat(youtubeSubscribers) && (
                <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                        {youtubeSubscribers?.split(" ")[0]}
                        {Number(youtubeSubscribers || 0) > 0 && '+'}
                    </div>
                    <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        YouTube Subscribers
                    </div>
                </div>
            )}

            {/* Spotify Monthly Listeners */}
            {isValidStat(spotifyMonthlyListeners) && (
                <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                        {spotifyMonthlyListeners?.split(" ")[0]}
                        {Number(spotifyMonthlyListeners || 0) > 0 && '+'}
                    </div>
                    <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        Spotify Monthly
                    </div>
                </div>
            )}

            {/* Instagram Followers */}
            {isValidStat(instagramFollowers) && (
                <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                        {instagramFollowers?.split(" ")[0]}
                        {Number(instagramFollowers || 0) > 0 && '+'}
                    </div>
                    <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        Instagram Followers
                    </div>
                </div>
            )}

            {/* Awards Won */}
            {isValidStat(totalAwards) && (
                <div className="text-center">
                    <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                        {totalAwards}
                        {Number(totalAwards || 0) > 0 && '+'}
                    </div>
                    <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>
                        Awards Won
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeroStats;

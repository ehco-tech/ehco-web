// src/components/HeroSection.tsx
'use client';

import React from 'react';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { PublicFigure } from '@/app/[publicFigure]/page';
import { useFavorite } from '@/hooks/useFavorite';
import { createGradientStyle, getPrimarySecondaryColors, getInitials } from '@/lib/utils/colorUtils';
import LoginPromptModal from '../hero/LoginPromptModal';
import GroupMembersDisplay from '../hero/GroupMembersDisplay';
import HeroStats from '../hero/HeroStats';

interface HeroSectionProps {
    publicFigure: PublicFigure;
}

export default function HeroSection({ publicFigure }: HeroSectionProps) {
    const router = useRouter();

    // Use the favorite hook
    const {
        isFavorited,
        isLoading: isLoadingFavorite,
        showSignInModal,
        setShowSignInModal,
        handleFavoriteToggle,
        handleLoginRedirect: onLoginRedirect,
        handleSignupRedirect: onSignupRedirect
    } = useFavorite({
        figureId: publicFigure.id,
        figureName: publicFigure.name,
        figureNameKr: publicFigure.name_kr,
        profilePic: publicFigure.profilePic
    });

    // Handle navigation after redirect setup
    const handleLoginRedirect = () => {
        onLoginRedirect();
        router.push('/login');
    };

    const handleSignupRedirect = () => {
        onSignupRedirect();
        router.push('/signup');
    };

    // Get colors and styles
    const backgroundStyle = createGradientStyle(publicFigure.officialColors);
    const { primaryColor, textColor } = getPrimarySecondaryColors(publicFigure.officialColors);

    // Check if this is a group with members
    const isGroup = publicFigure.is_group && publicFigure.members && publicFigure.members.length > 0;

    return (
        <div style={backgroundStyle}>
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Profile Image */}
                <div className="flex flex-col items-center mb-8">
                    {/* Main Profile Image (shown for both individuals and groups) */}
                    <div className="relative w-32 md:w-72 h-32 md:h-72 mb-6">
                        <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-primary shadow-xl">
                            {publicFigure.profilePic ? (
                                <Image
                                    src={publicFigure.profilePic}
                                    alt={publicFigure.name}
                                    sizes='(max-width: 768px) 128px, 288px'
                                    fill
                                    quality={100}
                                    className="object-cover object-center"
                                    priority
                                    unoptimized={publicFigure.profilePic.includes('googleusercontent.com')}
                                />
                            ) : (
                                <div className="w-full h-full bg-primary flex items-center justify-center text-white text-4xl font-bold" style={{ backgroundColor: primaryColor, color: textColor }}>
                                    {getInitials(publicFigure.name)}
                                </div>
                            )}
                        </div>

                        {/* Favorite Button */}
                        <button
                            onClick={handleFavoriteToggle}
                            disabled={isLoadingFavorite}
                            className="absolute bottom-0 right-0 md:bottom-2 md:right-2 p-2 md:p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed z-10"
                            aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                        >
                            <Star
                                className={`w-5 h-5 md:w-6 md:h-6 transition-colors ${
                                    isFavorited
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-none text-gray-400 hover:text-yellow-400'
                                }`}
                            />
                        </button>
                    </div>

                    {/* Member Circles (only for groups) */}
                    {isGroup && publicFigure.members && (
                        <GroupMembersDisplay
                            members={publicFigure.members}
                            primaryColor={primaryColor}
                            textColor={textColor}
                        />
                    )}
                </div>

                {/* Name */}
                <h1 className="text-5xl md:text-6xl font-bold text-center mb-2" style={{ color: textColor }}>
                    {publicFigure.name}
                </h1>

                {/* Korean Name */}
                {publicFigure.name_kr && (
                    <p className="text-center text-lg mb-4" style={{ color: textColor, opacity: 0.8 }}>
                        {publicFigure.name_kr}
                    </p>
                )}

                {/* Stats Grid */}
                <HeroStats
                    youtubeSubscribers={publicFigure.youtubeSubscribers}
                    spotifyMonthlyListeners={publicFigure.spotifyMonthlyListeners}
                    instagramFollowers={publicFigure.instagramFollowers}
                    totalAwards={publicFigure.totalAwards}
                    textColor={textColor}
                />
            </div>

            {/* Login Prompt Modal */}
            <LoginPromptModal
                isOpen={showSignInModal}
                onClose={() => setShowSignInModal(false)}
                onLogin={handleLoginRedirect}
                onSignup={handleSignupRedirect}
            />
        </div>
    );
}
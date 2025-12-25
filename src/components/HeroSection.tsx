// src/components/HeroSection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Star, X, LogIn } from 'lucide-react';
import type { PublicFigure } from '@/app/[publicFigure]/page';
import { useAuth } from '@/context/AuthContext';
import { addToFavorites, removeFromFavorites, isInFavorites } from '@/lib/favorites-service';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';

interface HeroSectionProps {
    publicFigure: PublicFigure;
}

// Login Prompt Modal Component
const LoginPromptModal: React.FC<{ onClose: () => void; onLogin: () => void; onSignup: () => void }> = ({
    onClose,
    onLogin,
    onSignup
}) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full relative" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Close modal"
            >
                <X size={24} />
            </button>
            <div className="text-center">
                <Star className="mx-auto mb-4 text-blue-500 dark:text-blue-400" size={48} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Add to Favorites</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Sign in or create an account to add this figure to your favorites.</p>

                <div className="space-y-3">
                    <button
                        onClick={onLogin}
                        className="w-full bg-blue-600 dark:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                    >
                        <LogIn size={18} />
                        Sign In
                    </button>

                    <button
                        onClick={onSignup}
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Create Account
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full text-gray-500 dark:text-gray-400 text-sm hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default function HeroSection({ publicFigure }: HeroSectionProps) {
    const [showAllMembers, setShowAllMembers] = useState(false);
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoadingFavorite, setIsLoadingFavorite] = useState(true);
    const [showSignInModal, setShowSignInModal] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    // Check if figure is favorited when component mounts or user changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (user) {
                setIsLoadingFavorite(true);
                const favorited = await isInFavorites(user.uid, publicFigure.id);
                setIsFavorited(favorited);
                setIsLoadingFavorite(false);
            } else {
                setIsFavorited(false);
                setIsLoadingFavorite(false);
            }
        };

        checkFavoriteStatus();
    }, [user, publicFigure.id]);

    // Handle favorite toggle
    const handleFavoriteToggle = async () => {
        if (!user) {
            // Show sign-in modal instead of redirecting
            setShowSignInModal(true);
            return;
        }

        try {
            if (isFavorited) {
                await removeFromFavorites(user.uid, publicFigure.id);
                setIsFavorited(false);
            } else {
                await addToFavorites(user.uid, {
                    figureId: publicFigure.id,
                    figureName: publicFigure.name,
                    figureNameKr: publicFigure.name_kr || '',
                    profilePic: publicFigure.profilePic,
                });
                setIsFavorited(true);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    // Handle login redirect
    const handleLoginRedirect = () => {
        sessionStorage.setItem('redirectPath', window.location.pathname);
        setShowSignInModal(false);
        router.push('/login');
    };

    // Handle signup redirect
    const handleSignupRedirect = () => {
        sessionStorage.setItem('redirectPath', window.location.pathname);
        setShowSignInModal(false);
        router.push('/signup');
    };

    // console.log(publicFigure.officialColors);
    // Parse official colors
    const parseOfficialColors = () => {
        const colorsString = publicFigure.officialColors || '';
        if (!colorsString) return [];
        return colorsString.split(',').map(color => color.trim()).filter(Boolean);
    };

    const colors = parseOfficialColors();
    const primaryColor = colors[0] || '#d10041'; // fallback to EHCO pink
    const secondaryColor = colors[1] || 'white';

    const colorToHex: { [key: string]: string | string[] } = {
        'pink': '#ffc0cb',
        'black': '#000000',
        'white': '#ffffff',
        'yellow': '#ffff00',
        'purple': '#800080',
        'red': '#ff0000',
        'blue': '#0000ff',
        'green': '#008000',
        'orange': '#ffa500',
        'gray': '#808080',
        'grey': '#808080',
        'brown': '#a52a2a',
        'cyan': '#00ffff',
        'magenta': '#ff00ff',
        'lime': '#00ff00',
        'navy': '#000080',
        'teal': '#008080',
        'silver': '#c0c0c0',
        'gold': '#ffd700',
        'mint': '#3eb489',
        'sky blue': '#87ceeb',
        'skyblue': '#87ceeb',
        'neon magenta': '#ff0090',
        'pearl gold': '#aa7f2e',
        'hot pink': '#ff69b4',
        'neon green': '#39ff14',
        'aurora': ['#c88ddd', '#9ceafe'],
        'neon lime': '#39ff14',
        'deep blue': '#00008b',
        'cosmic latte': '#fff8e7',
        'vivid burgundy': '#9f1d35',
        'aegean blue': '#4e6e81',
        'pearl neo champagne': '#c9ff87',
        'apricot': '#fbceb1',
        'rose quartz': '#f7cac9',
        'serenity': '#b3cee5',
        'pastel rose': '#f6b8d0',
        'pastel rose gold': '#f4c1bc',
        'mint choco': '#b9ffc2',
        'beige': '#f5f5dc',
        'light blue': '#add8e6',
        'navy blue': '#000080',
        'neon yellow': '#cfff04',
        'neon blue': '#1f51ff',
        'pearl white': '#fff4e8',
        'pearl burgundy': '#734648',
        'light periwinkle': '#c1c6fc',
        'pearl red': '#71001c',
        'pearl pink': '#e7accf',
        'pearl lemon yellow': '#f5ddbc',
        'coral pink': '#f88379',
        'creamy beige': '#eedec5',
        'velvet red': '#942222',
        'pearl light pink': '#e7accf',
        'pastel mint': '#add0b3',
        'pearl cosmic mauve': '#e0b0ff',
        'phantom black': '#2f3434',
        'pastel rose pink': '#f8c8dc',
        'pearl aqua green': '#79e5cb',
        'hayoung yellow': '#f3b33e',
        'jiwon magenta': '#bc2c9c',
        'chaeyoung green': '#a0d543',
        'nakyung purple': '#7032ab',
        'jiheon blue': '#54afe8',
        'light purple': '#cbc3e3',
        'neon red': '#e11900',
        'chic violet': '#7e00bf',
        'pearl sapphire blue': '#00239b',
    };

    // Helper function to convert color names to hex or hex array
    const getHexColor = (colorName: string): string | string[] => {
        const key = colorName.toLowerCase().trim();
        return colorToHex[key] || colorName; // Return as-is if already hex or unknown
    };

    // Function to determine text color based on background
    const getTextColor = (bgColor: string): string => {
        // Convert color name to RGB (basic implementation for common colors)
        const colorMap: { [key: string]: [number, number, number] } = {
            'pink': [255, 192, 203],
            'black': [0, 0, 0],
            'white': [255, 255, 255],
            'yellow': [255, 255, 0],
            'purple': [128, 0, 128],
            'red': [255, 0, 0],
            'blue': [0, 0, 255],
            'green': [0, 128, 0],
            'orange': [255, 165, 0],
            'gray': [128, 128, 128],
            'grey': [128, 128, 128],
            'brown': [165, 42, 42],
            'cyan': [0, 255, 255],
            'magenta': [255, 0, 255],
            'lime': [0, 255, 0],
            'navy': [0, 0, 128],
            'teal': [0, 128, 128],
            'silver': [192, 192, 192],
            'gold': [255, 215, 0],
            'mint': [62, 180, 137],
        };

        const colorKey = bgColor.toLowerCase();
        const rgb = colorMap[colorKey] || [233, 30, 140]; // fallback to EHCO pink RGB

        // Calculate relative luminance
        const [r, g, b] = rgb.map(val => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

        // Return white for dark backgrounds, black for light backgrounds
        return luminance > 0.21 ? '#000000' : '#FFFFFF';
    };

    const textColor = getTextColor(primaryColor);
    // console.log(textColor);

    // Expand colors array to handle multi-value colors (like aurora)
    const expandedColors: string[] = [];
    colors.forEach(color => {
        const hexColor = getHexColor(color);
        if (Array.isArray(hexColor)) {
            expandedColors.push(...hexColor);
        } else {
            expandedColors.push(hexColor);
        }
    });

    const backgroundStyle = expandedColors.length >= 3
        ? { background: `linear-gradient(0deg, ${expandedColors[0]} 0%, ${expandedColors[1]} 50%, ${expandedColors[2]} 100%)` }
        : expandedColors.length === 2
            ? { background: `linear-gradient(0deg, ${expandedColors[0]} 50%, ${expandedColors[1]} 100%)` }
            : expandedColors.length === 1
                ? { background: `linear-gradient(0deg, ${expandedColors[0]} 50%, #ffffff 100%)` }
                : { background: `linear-gradient(0deg, #d10041 0%, #ffffff 100%)` };

    // Format large numbers
    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        } else if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toString();
    };

    // Get initials for profile circles (for group members)
    const getInitials = (name: string): string => {
        const names = name.split(' ');
        if (names.length >= 2) {
            return names[0][0] + names[1][0];
        }
        return name.substring(0, 2).toUpperCase();
    };

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
                    {isGroup && (
                        <div className="flex flex-wrap justify-center gap-2 sm:gap-0 sm:-space-x-3 max-w-lg mx-auto">
                            {publicFigure.members?.slice(0, showAllMembers ? publicFigure.members.length : 12).map((member, index: number) => (
                                <div
                                    key={index}
                                    className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 sm:border-3 md:border-4 border-white shadow-lg"
                                    title={member.name}
                                >
                                    {member.profilePic ? (
                                        <Image
                                            src={member.profilePic}
                                            alt={member.name}
                                            sizes='(max-width: 640px) 48px, (max-width: 768px) 56px, 64px'
                                            fill
                                            className="object-cover"
                                            quality={100}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-primary flex items-center justify-center text-white text-xs sm:text-sm font-bold" style={{ backgroundColor: primaryColor, color: textColor }}>
                                            {getInitials(member.name)}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {publicFigure.members && publicFigure.members.length > 12 && !showAllMembers && (
                                <button
                                    onClick={() => setShowAllMembers(true)}
                                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-bold border-2 sm:border-3 md:border-4 border-white shadow-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                    title={`Show ${publicFigure.members.length - 12} more members`}
                                >
                                    +{publicFigure.members.length - 12}
                                </button>
                            )}
                            {showAllMembers && publicFigure.members && publicFigure.members.length > 12 && (
                                <button
                                    onClick={() => setShowAllMembers(false)}
                                    className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-bold border-2 sm:border-3 md:border-4 border-white shadow-lg hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                                    title="Show less"
                                >
                                    −
                                </button>
                            )}
                        </div>
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

                {/* Category Tag */}
                {/* <div className="flex justify-center mb-8">
                    <span className="px-4 py-2 bg-gray-100 rounded-full text-sm font-medium"
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: textColor,
                            backdropFilter: 'blur(10px)'
                        }}>
                        {publicFigure.occupation?.[0] || 'Public Figure'}
                    </span>
                </div> */}

                {/* Stats Grid */}
                <div className="flex flex-wrap justify-center gap-16 max-w-4xl mx-auto">
                    {/* YouTube Subscribers */}
                    {publicFigure.youtubeSubscribers && publicFigure.youtubeSubscribers.trim() !== '' && publicFigure.youtubeSubscribers !== '0' && (
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                                {publicFigure.youtubeSubscribers?.split(" ")[0]}
                                {Number(publicFigure.youtubeSubscribers || 0) > 0 && '+'}
                            </div>
                            <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>YouTube Subscribers</div>
                        </div>
                    )}

                    {/* Spotify Monthly Listeners */}
                    {publicFigure.spotifyMonthlyListeners && publicFigure.spotifyMonthlyListeners.trim() !== '' && publicFigure.spotifyMonthlyListeners !== '0' && (
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                                {publicFigure.spotifyMonthlyListeners?.split(" ")[0]}
                                {Number(publicFigure.spotifyMonthlyListeners || 0) > 0 && '+'}
                            </div>
                            <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>Spotify Monthly</div>
                        </div>
                    )}

                    {/* Instagram Followers */}
                    {publicFigure.instagramFollowers && publicFigure.instagramFollowers.trim() !== '' && publicFigure.instagramFollowers !== '0' && (
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                                {publicFigure.instagramFollowers?.split(" ")[0]}
                                {Number(publicFigure.instagramFollowers || 0) > 0 && '+'}
                            </div>
                            <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>Instagram Followers</div>
                        </div>
                    )}

                    {/* Awards Won */}
                    {publicFigure.totalAwards && publicFigure.totalAwards.toString().trim() !== '' && publicFigure.totalAwards !== '0' && (
                        <div className="text-center">
                            <div className="text-4xl md:text-5xl font-bold mb-1" style={{ color: textColor }}>
                                {publicFigure.totalAwards}
                                {Number(publicFigure.totalAwards || 0) > 0 && '+'}
                            </div>
                            <div className="text-sm" style={{ color: textColor, opacity: 0.8 }}>Awards Won</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Login Prompt Modal */}
            {showSignInModal && createPortal(
                <LoginPromptModal
                    onClose={() => setShowSignInModal(false)}
                    onLogin={handleLoginRedirect}
                    onSignup={handleSignupRedirect}
                />,
                document.body
            )}
        </div>
    );
}
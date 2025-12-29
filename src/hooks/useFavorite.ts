// src/hooks/useFavorite.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addToFavorites, removeFromFavorites, isInFavorites } from '@/lib/services/favorites/favorites-service';

interface UseFavoriteProps {
    figureId: string;
    figureName: string;
    figureNameKr?: string;
    profilePic?: string;
}

interface UseFavoriteReturn {
    isFavorited: boolean;
    isLoading: boolean;
    showSignInModal: boolean;
    setShowSignInModal: (show: boolean) => void;
    handleFavoriteToggle: () => Promise<void>;
    handleLoginRedirect: () => void;
    handleSignupRedirect: () => void;
}

export const useFavorite = ({
    figureId,
    figureName,
    figureNameKr,
    profilePic
}: UseFavoriteProps): UseFavoriteReturn => {
    const [isFavorited, setIsFavorited] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showSignInModal, setShowSignInModal] = useState(false);
    const { user } = useAuth();

    // Check if figure is favorited when component mounts or user changes
    useEffect(() => {
        const checkFavoriteStatus = async () => {
            if (user) {
                setIsLoading(true);
                const favorited = await isInFavorites(user.uid, figureId);
                setIsFavorited(favorited);
                setIsLoading(false);
            } else {
                setIsFavorited(false);
                setIsLoading(false);
            }
        };

        checkFavoriteStatus();
    }, [user, figureId]);

    // Handle favorite toggle
    const handleFavoriteToggle = async () => {
        if (!user) {
            setShowSignInModal(true);
            return;
        }

        try {
            if (isFavorited) {
                await removeFromFavorites(user.uid, figureId);
                setIsFavorited(false);
            } else {
                await addToFavorites(user.uid, {
                    figureId,
                    figureName,
                    figureNameKr: figureNameKr || '',
                    profilePic,
                });
                setIsFavorited(true);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
        }
    };

    // Handle login redirect
    const handleLoginRedirect = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectPath', window.location.pathname);
        }
        setShowSignInModal(false);
        // Return the path instead of navigating
        // The component using this hook should handle navigation
    };

    // Handle signup redirect
    const handleSignupRedirect = () => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectPath', window.location.pathname);
        }
        setShowSignInModal(false);
        // Return the path instead of navigating
        // The component using this hook should handle navigation
    };

    return {
        isFavorited,
        isLoading,
        showSignInModal,
        setShowSignInModal,
        handleFavoriteToggle,
        handleLoginRedirect,
        handleSignupRedirect
    };
};

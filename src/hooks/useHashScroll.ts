// src/hooks/useHashScroll.ts
'use client';

import { useLayoutEffect, useRef } from 'react';
import { findEventLocation } from '@/lib/utils/timelineUtils';
import { CuratedTimelineData } from '@/types/definitions';

interface UseHashScrollProps {
    timelineData: CuratedTimelineData;
    setActiveMainCategory: (category: string) => void;
    setActiveSubCategory: (subCategory: string) => void;
}

/**
 * Hook to handle hash anchor scrolling on mount
 * Finds the event by hash, sets filters to show it, and scrolls to it
 */
export const useHashScroll = ({
    timelineData,
    setActiveMainCategory,
    setActiveSubCategory
}: UseHashScrollProps) => {
    const hasScrolledToHash = useRef<boolean>(false);

    useLayoutEffect(() => {
        // Skip if we've already scrolled to the hash
        if (hasScrolledToHash.current) {
            return;
        }

        const hash = window.location.hash;
        if (!hash) return;

        // Mark that we're handling the hash scroll
        hasScrolledToHash.current = true;

        // Remove the # from the hash
        const targetEventSlug = hash.substring(1);

        // Find which category and subcategory contains this event
        const { mainCategory, subCategory } = findEventLocation(timelineData, targetEventSlug);

        // Set the filters to show the event
        if (mainCategory) {
            setActiveMainCategory(mainCategory);
            if (subCategory) {
                setActiveSubCategory(subCategory);
            }
        }

        // Scroll to the element after filters are set and content is rendered
        setTimeout(() => {
            const element = document.getElementById(targetEventSlug);
            if (element) {
                // Calculate position with offset (140px below top of viewport)
                const yOffset = -140;
                const y = element.getBoundingClientRect().top + window.scrollY + yOffset;

                window.scrollTo({ top: y, behavior: 'smooth' });

                // Add highlight animation for 3 seconds after scroll
                setTimeout(() => {
                    element.classList.add('event-highlight');
                    setTimeout(() => {
                        element.classList.remove('event-highlight');
                    }, 3000);
                }, 500); // Wait for scroll to complete
            }
        }, 300);
    }, [timelineData, setActiveMainCategory, setActiveSubCategory]);
};

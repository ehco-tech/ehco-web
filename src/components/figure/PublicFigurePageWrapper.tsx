'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import EventModal from '../ui/EventModal';
import { CuratedEvent, CuratedTimelineData, Article } from '@/types/definitions';

interface PublicFigurePageWrapperProps {
    children: React.ReactNode;
    timelineData: CuratedTimelineData;
    articles: Article[];
    figureName: string;
    figureId: string;
}

// Helper function to create slug from event title
const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '');

const PublicFigurePageWrapper: React.FC<PublicFigurePageWrapperProps> = ({
    children,
    timelineData,
    articles,
    figureName,
    figureId
}) => {
    const searchParams = useSearchParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalEvent, setModalEvent] = useState<{
        event: CuratedEvent;
        mainCategory: string;
        subCategory: string;
    } | null>(null);

    useEffect(() => {
        const shouldShowModal = searchParams.get('modal') === 'true';
        const eventSlug = searchParams.get('event');

        if (shouldShowModal && eventSlug) {
            // Find the event in the timeline data
            let foundEvent: CuratedEvent | null = null;
            let foundMainCategory = '';
            let foundSubCategory = '';

            Object.entries(timelineData).forEach(([mainCat, mainCatData]) => {
                Object.entries(mainCatData.subCategories).forEach(([subCat, events]) => {
                    const event = events.find(e => slugify(e.event_title) === eventSlug);
                    if (event) {
                        foundEvent = event;
                        foundMainCategory = mainCat;
                        foundSubCategory = subCat;
                    }
                });
            });

            if (foundEvent) {
                setModalEvent({
                    event: foundEvent,
                    mainCategory: foundMainCategory,
                    subCategory: foundSubCategory
                });
                setIsModalOpen(true);

                // Store the category/subcategory in localStorage so CareerJourney can maintain filters
                localStorage.setItem('timelineFilters', JSON.stringify({
                    mainCategory: foundMainCategory,
                    subCategory: foundSubCategory,
                    timestamp: Date.now()
                }));
            }
        }
    }, [searchParams, timelineData]);

    const handleCloseModal = () => {
        // Get the event element before clearing the URL
        const hash = window.location.hash;
        const eventElement = hash ? document.getElementById(hash.substring(1)) : null;

        // Save the current scroll position to maintain it
        const currentScrollY = window.scrollY;

        // Remove modal, event params, AND hash from URL FIRST using native History API
        // This prevents browser from jumping to hash when overflow is restored
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('modal');
        newUrl.searchParams.delete('event');
        newUrl.hash = ''; // Clear the hash

        window.history.replaceState(
            {},
            '',
            newUrl.pathname + newUrl.search
        );

        // Then close modal (this will trigger EventModal's cleanup which restores overflow)
        setIsModalOpen(false);
        setModalEvent(null);

        // Force scroll position to stay exactly where it was
        // Use requestAnimationFrame to ensure this runs after EventModal cleanup
        requestAnimationFrame(() => {
            window.scrollTo(0, currentScrollY);
        });

        // Add highlight animation to the event after modal closes
        if (eventElement) {
            setTimeout(() => {
                eventElement.classList.add('event-highlight');
                setTimeout(() => {
                    eventElement.classList.remove('event-highlight');
                }, 3000); // Remove after 3 seconds
            }, 300); // Wait for modal close animation
        }
    };

    const handleViewInTimeline = () => {
        setIsModalOpen(false);
        setModalEvent(null);

        // Remove modal and event params but keep hash for scrolling using native History API
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('modal');
        newUrl.searchParams.delete('event');

        window.history.replaceState(
            {},
            '',
            newUrl.pathname + newUrl.search + newUrl.hash
        );

        // Scroll to the element after a short delay to ensure DOM is ready
        setTimeout(() => {
            if (window.location.hash) {
                const element = document.getElementById(window.location.hash.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
    };

    return (
        <>
            {children}
            {modalEvent && (
                <EventModal
                    event={modalEvent.event}
                    articles={articles}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onViewInTimeline={handleViewInTimeline}
                    figureName={figureName}
                    mainCategory={modalEvent.mainCategory}
                    subCategory={modalEvent.subCategory}
                />
            )}
        </>
    );
};

export default PublicFigurePageWrapper;

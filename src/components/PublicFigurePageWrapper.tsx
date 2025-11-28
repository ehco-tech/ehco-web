'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import EventModal from './EventModal';
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
    const router = useRouter();
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
            }
        }
    }, [searchParams, timelineData]);

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setModalEvent(null);

        // Remove modal and event params from URL but keep hash
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('modal');
        newUrl.searchParams.delete('event');
        router.replace(newUrl.pathname + newUrl.hash, { scroll: false });
    };

    const handleViewInTimeline = () => {
        setIsModalOpen(false);
        setModalEvent(null);

        // Remove modal and event params but keep hash for scrolling
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('modal');
        newUrl.searchParams.delete('event');
        router.replace(newUrl.pathname + newUrl.hash, { scroll: false });

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

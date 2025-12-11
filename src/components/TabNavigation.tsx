// src/components/TabNavigation.tsx
'use client';

import React, { useState, useEffect } from 'react';

const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'discography', label: 'Discography' },
    { id: 'filmography', label: 'Filmography' },
    { id: 'timeline', label: 'Timeline' },
];

export default function TabNavigation() {
    const [activeTab, setActiveTab] = useState('overview');

    // Smooth scroll to section with consistent offset
    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            // Use same offset calculation as event scroll in CareerJourney
            const yOffset = -110; // Negative = element appears 80px below top of viewport
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;

            window.scrollTo({
                top: y,
                behavior: 'smooth'
            });
        }
    };

    // Detect which section is currently in view
    useEffect(() => {
        const handleScroll = () => {
            const sections = tabs.map(tab => document.getElementById(tab.id));
            const scrollPosition = window.scrollY + 150; // Offset for when to trigger active state

            for (let i = sections.length - 1; i >= 0; i--) {
                const section = sections[i];
                if (section && section.offsetTop <= scrollPosition) {
                    setActiveTab(tabs[i].id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className="sticky top-16 z-40 bg-white dark:bg-[#1d1d1f] border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between md:justify-start md:space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => scrollToSection(tab.id)}
                            className={`
                                py-4 px-2 md:px-4 font-medium text-xs sm:text-sm whitespace-nowrap
                                flex-1 md:flex-none
                                transition-colors duration-200
                                border-b-2 -mb-[1px]
                                ${activeTab === tab.id
                                    ? 'border-key-color dark:border-key-color-dark text-key-color dark:text-key-color-dark'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
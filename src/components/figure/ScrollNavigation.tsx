'use client';

import { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ScrollNavigation() {
    const [showNavigation, setShowNavigation] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show navigation after scrolling 200px from top
            setShowNavigation(window.scrollY > 200);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'smooth'
        });
    };

    if (!showNavigation) return null;

    return (
        <div className="fixed right-6 bottom-6 z-50 flex flex-col gap-2">
            {/* Scroll to Top Button */}
            <button
                onClick={scrollToTop}
                className="group bg-white dark:bg-[#1d1d1f] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
                aria-label="Scroll to top"
            >
                <ChevronUp
                    className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-key-color dark:group-hover:text-key-color-dark transition-colors"
                />
            </button>

            {/* Scroll to Bottom Button */}
            <button
                onClick={scrollToBottom}
                className="group bg-white dark:bg-[#1d1d1f] hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
                aria-label="Scroll to bottom"
            >
                <ChevronDown
                    className="w-5 h-5 text-gray-700 dark:text-gray-300 group-hover:text-key-color dark:group-hover:text-key-color-dark transition-colors"
                />
            </button>
        </div>
    );
}

// src/components/TabNavigation.tsx
'use client';

import React from 'react';

export interface Tab {
    id: string;
    label: string;
}

interface TabNavigationProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export default function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
    return (
        <nav className="sticky top-16 z-40 bg-white dark:bg-[#1d1d1f] border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between md:justify-start md:space-x-8">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
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
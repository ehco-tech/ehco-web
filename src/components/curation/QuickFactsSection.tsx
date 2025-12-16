'use client';

import { useState } from 'react';
import { QuickFact } from '@/types/definitions';

interface QuickFactsSectionProps {
    facts: QuickFact[];
}

export default function QuickFactsSection({ facts }: QuickFactsSectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // Show first 15 facts by default
    const visibleFacts = showAll ? facts : facts.slice(0, 15);
    const remainingCount = facts.length - 15;

    const getBadgeStyles = (badge: QuickFact['badge']) => {
        switch (badge) {
            case 'verified':
                return 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400';
            case 'community':
                return 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400';
            case 'self-reported':
                return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400';
            default:
                return '';
        }
    };

    const getBadgeText = (badge: QuickFact['badge']) => {
        switch (badge) {
            case 'verified':
                return '✓ Verified';
            case 'community':
                return 'Fan community';
            case 'self-reported':
                return 'Self-reported';
            default:
                return '';
        }
    };

    // Helper to render fact text with optional link
    const renderFactText = (fact: QuickFact) => {
        if (!fact.url || !fact.linkText) {
            return fact.text;
        }

        // Split the text at the linked portion
        const parts = fact.text.split(fact.linkText);

        // Handle edge case where linkText appears multiple times
        if (parts.length > 2) {
            // Only link the first occurrence
            return (
                <>
                    {parts[0]}
                    <a
                        href={fact.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-key-color dark:text-key-color-dark hover:underline"
                    >
                        {fact.linkText}
                    </a>
                    {parts.slice(1).join(fact.linkText)}
                </>
            );
        }

        return (
            <>
                {parts[0]}
                <a
                    href={fact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-key-color dark:text-key-color-dark hover:underline"
                >
                    {fact.linkText}
                </a>
                {parts[1]}
            </>
        );
    };

    return (
        <section className="bg-gray-50 dark:bg-[#1d1d1f] border border-gray-200 dark:border-gray-700 rounded-2xl mb-12 overflow-hidden">
            {/* Header */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Quick Facts
                        <span className="ml-2 text-sm text-gray-400 dark:text-gray-500 font-normal">
                            {facts.length} facts
                        </span>
                    </h3>
                </div>
                <span
                    className={`text-gray-400 dark:text-gray-500 text-xl transition-transform duration-300 ${
                        isCollapsed ? 'rotate-180' : ''
                    }`}
                >
                    ▲
                </span>
            </button>

            {/* Content */}
            <div
                className={`transition-all duration-300 ease-in-out ${
                    isCollapsed ? 'max-h-0' : 'max-h-[5000px]'
                } overflow-hidden`}
            >
                <div className="px-6 pb-6">
                    <div className="space-y-2.5">
                        {visibleFacts.map((fact, index) => (
                            <div
                                key={index}
                                className="flex items-start gap-3 p-3 bg-white dark:bg-black/30 border border-gray-100 dark:border-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
                            >
                                <span className="text-key-color dark:text-key-color-dark font-semibold flex-shrink-0 mt-0.5">
                                    •
                                </span>
                                <span className="flex-1">
                                    {renderFactText(fact)}
                                    {fact.badge && (
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ml-2 font-medium ${getBadgeStyles(
                                                fact.badge
                                            )}`}
                                        >
                                            {getBadgeText(fact.badge)}
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Show More Button */}
                    {remainingCount > 0 && !showAll && (
                        <button
                            onClick={() => setShowAll(true)}
                            className="flex items-center justify-center gap-2 w-full px-4 py-3.5 mt-4 bg-key-color/5 dark:bg-key-color-dark/10 border border-key-color/15 dark:border-key-color-dark/25 rounded-xl text-key-color dark:text-key-color-dark text-sm font-medium hover:bg-key-color/10 dark:hover:bg-key-color-dark/20 hover:border-key-color/25 dark:hover:border-key-color-dark/35 transition-all"
                        >
                            Show {remainingCount} more facts
                            <span>▼</span>
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
}

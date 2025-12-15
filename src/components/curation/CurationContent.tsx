'use client';

import { useState } from 'react';
import { CurationData } from '@/types/definitions';
import QuickFactsSection from './QuickFactsSection';
import CuratedArticle from './CuratedArticle';
import FootnotesSection from './FootnotesSection';

interface CurationContentProps {
    curationData: CurationData;
}

export default function CurationContent({ curationData }: CurationContentProps) {
    const [highlightedFootnote, setHighlightedFootnote] = useState<number | null>(null);

    const handleFootnoteClick = (footnoteNumber: number) => {
        setHighlightedFootnote(footnoteNumber);

        // Clear the highlight after scrolling
        setTimeout(() => {
            setHighlightedFootnote(null);
        }, 3000);
    };

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
            {/* Page Header */}
            <header className="mb-10 pb-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
                    {curationData.title}
                </h1>
                <p className="text-lg text-gray-400 dark:text-gray-500">
                    {curationData.subtitle}
                </p>
            </header>

            {/* Quick Facts Section */}
            <QuickFactsSection facts={curationData.quickFacts} />

            {/* Curated Content Section */}
            <section className="mb-12">
                <div className="mb-9 pb-5 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 flex items-center gap-3">
                        EHCO Curated
                        <span className="bg-gradient-to-r from-key-color to-key-color/70 dark:from-key-color-dark dark:to-key-color-dark/70 text-white text-[0.65rem] px-2.5 py-1 rounded font-semibold uppercase tracking-wide">
                            Editorial
                        </span>
                    </h2>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Last edited: {curationData.lastEdited}
                    </p>
                </div>

                {/* Articles */}
                {curationData.articles.map((article, index) => (
                    <CuratedArticle
                        key={index}
                        article={article}
                        onFootnoteClick={handleFootnoteClick}
                    />
                ))}

                {/* Footnotes */}
                <FootnotesSection
                    footnotes={curationData.footnotes}
                    highlightedFootnote={highlightedFootnote}
                />
            </section>
        </div>
    );
}

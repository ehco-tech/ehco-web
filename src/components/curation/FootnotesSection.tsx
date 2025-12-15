'use client';

import { useEffect, useRef, useState } from 'react';
import { CurationFootnote } from '@/types/definitions';

interface FootnotesSectionProps {
    footnotes: CurationFootnote[];
    highlightedFootnote: number | null;
}

export default function FootnotesSection({ footnotes, highlightedFootnote }: FootnotesSectionProps) {
    const footnoteRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const [animatingFootnote, setAnimatingFootnote] = useState<number | null>(null);

    useEffect(() => {
        if (highlightedFootnote !== null && footnoteRefs.current[highlightedFootnote]) {
            const element = footnoteRefs.current[highlightedFootnote];
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add animation
            setAnimatingFootnote(highlightedFootnote);

            // Remove animation after 2 seconds
            const timer = setTimeout(() => {
                setAnimatingFootnote(null);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [highlightedFootnote]);

    return (
        <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-semibold text-gray-400 dark:text-gray-500 mb-5 uppercase tracking-wider">
                Sources
            </h4>
            <div className="space-y-0">
                {footnotes.map((footnote) => (
                    <div
                        key={footnote.number}
                        id={`fn${footnote.number}`}
                        ref={(el) => {
                            footnoteRefs.current[footnote.number] = el;
                        }}
                        className={`flex gap-3 py-3 border-b border-gray-100 dark:border-gray-800 text-sm transition-all duration-300 ${
                            animatingFootnote === footnote.number
                                ? 'bg-key-color/5 dark:bg-key-color-dark/10 -mx-3 px-3 rounded-lg'
                                : ''
                        }`}
                    >
                        <span className="text-key-color dark:text-key-color-dark font-semibold flex-shrink-0 min-w-[24px]">
                            {footnote.number}
                        </span>
                        <div className="text-gray-600 dark:text-gray-400 leading-relaxed flex-1">
                            {footnote.url ? (
                                <a
                                    href={footnote.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 dark:text-gray-400 hover:text-key-color dark:hover:text-key-color-dark hover:underline transition-colors break-words"
                                >
                                    {footnote.text}
                                </a>
                            ) : (
                                <span className="break-words">{footnote.text}</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

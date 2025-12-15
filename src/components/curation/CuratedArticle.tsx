'use client';

import { CurationArticle } from '@/types/definitions';

interface CuratedArticleProps {
    article: CurationArticle;
    onFootnoteClick: (footnoteNumber: number) => void;
}

export default function CuratedArticle({ article, onFootnoteClick }: CuratedArticleProps) {
    /**
     * Parse text with inline footnote markers and render them as clickable buttons
     * Text format: "Some text[FN:1] more text[FN:2]"
     */
    const renderParagraphWithFootnotes = (text: string) => {
        // Split text by footnote markers: [FN:X]
        const parts = text.split(/(\[FN:\d+\])/);

        return (
            <>
                {parts.map((part, index) => {
                    // Check if this part is a footnote marker
                    const match = part.match(/\[FN:(\d+)\]/);

                    if (match) {
                        const footnoteNumber = parseInt(match[1], 10);
                        return (
                            <button
                                key={`fn-${footnoteNumber}-${index}`}
                                onClick={() => onFootnoteClick(footnoteNumber)}
                                className="text-key-color dark:text-key-color-dark text-xs font-semibold align-super ml-0.5 hover:text-key-color/70 dark:hover:text-key-color-dark/70 hover:underline transition-colors cursor-pointer"
                                aria-label={`Go to footnote ${footnoteNumber}`}
                            >
                                {footnoteNumber}
                            </button>
                        );
                    }

                    // Regular text
                    return <span key={`text-${index}`}>{part}</span>;
                })}
            </>
        );
    };

    return (
        <article className="mb-10">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 tracking-tight">
                {article.title}
            </h3>
            <div className="space-y-5">
                {article.paragraphs.map((paragraph, index) => (
                    <p
                        key={index}
                        className="text-base text-gray-600 dark:text-gray-300 leading-relaxed"
                    >
                        {renderParagraphWithFootnotes(paragraph.text)}
                    </p>
                ))}
            </div>
        </article>
    );
}

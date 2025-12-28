// Optional Enhancement: Text Highlighting Component
// Add this to a new file: components/HighlightedText.tsx

import React from 'react';

interface HighlightedTextProps {
    text: string;
    searchQuery: string;
    className?: string;
}

/**
 * Component that highlights search query matches within text
 * Usage: <HighlightedText text={event.event_title} searchQuery={searchQuery} />
 */
export const HighlightedText: React.FC<HighlightedTextProps> = ({
    text,
    searchQuery,
    className = ''
}) => {
    if (!searchQuery || !text) {
        return <>{text}</>;
    }

    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));

    return (
        <>
            {parts.map((part, index) => (
                part.toLowerCase() === searchQuery.toLowerCase() ? (
                    <mark
                        key={index}
                        className="bg-yellow-200 text-gray-900 px-0.5 rounded"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={index} className={className}>{part}</span>
                )
            ))}
        </>
    );
};

// Optional: More sophisticated highlighting that handles multiple words
interface AdvancedHighlightProps {
    text: string;
    searchQuery: string;
    className?: string;
    highlightClassName?: string;
}

export const AdvancedHighlightedText: React.FC<AdvancedHighlightProps> = ({
    text,
    searchQuery,
    className = '',
    highlightClassName = 'bg-yellow-200 text-gray-900 px-0.5 rounded'
}) => {
    if (!searchQuery || !text) {
        return <span className={className}>{text}</span>;
    }

    // Split search query into words and escape special regex characters
    const searchWords = searchQuery
        .trim()
        .split(/\s+/)
        .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    if (searchWords.length === 0) {
        return <span className={className}>{text}</span>;
    }

    // Create regex pattern for all search words
    const pattern = new RegExp(`(${searchWords.join('|')})`, 'gi');
    const parts = text.split(pattern);

    return (
        <span className={className}>
            {parts.map((part, index) => {
                const isMatch = searchWords.some(word =>
                    new RegExp(`^${word}$`, 'i').test(part)
                );

                return isMatch ? (
                    <mark key={index} className={highlightClassName}>
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={index}>{part}</React.Fragment>
                );
            })}
        </span>
    );
};

export default HighlightedText;


// ==============================================================================
// USAGE EXAMPLE in CuratedTimelineView.tsx:
// ==============================================================================
/*

import { HighlightedText } from './HighlightedText';

// In the component, replace plain text with highlighted version:

// Before:
<h4 className="font-semibold text-lg text-gray-900 pr-16 mb-2">
    {event.event_title}
</h4>

// After:
<h4 className="font-semibold text-lg text-gray-900 pr-16 mb-2">
    <HighlightedText 
        text={event.event_title} 
        searchQuery={searchQuery || ''} 
    />
</h4>

// For event summary:
<p className="text-sm text-gray-600 italic mb-4">
    <HighlightedText 
        text={event.event_summary.replaceAll("*", "'")} 
        searchQuery={searchQuery || ''} 
    />
</p>

// For timeline point descriptions:
<p className="text-sm text-gray-700 mb-2">
    <HighlightedText 
        text={sortedPoint.description.replaceAll("*", "'")} 
        searchQuery={searchQuery || ''} 
    />
</p>

*/
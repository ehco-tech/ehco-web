// src/lib/utils/dateUtils.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Format event date based on available precision
 */
export const formatEventDate = (dateStr: string): string => {
    if (!dateStr) return 'No date available';

    // Year only: "2030"
    if (dateStr.length === 4) {
        return dateStr;
    }
    // Year-Month: "2026-01"
    else if (dateStr.length === 7) {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short'
        });
    }
    // Full date: "2025-10-30"
    else {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};

/**
 * Format time elapsed with detailed granularity
 */
export const formatTimeAgo = (timestamp: Timestamp | Date | string | number): string => {
    let date: Date;

    // Handle Firestore Timestamp object
    if (timestamp && typeof timestamp === 'object' && 'toMillis' in timestamp) {
        date = new Date(timestamp.toMillis());
    }
    // Handle ISO string
    else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    }
    // Handle regular Date object
    else if (timestamp instanceof Date) {
        date = timestamp;
    }
    // Handle timestamp in milliseconds
    else if (typeof timestamp === 'number') {
        date = new Date(timestamp);
    }
    else {
        return 'recently';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Less than 10 seconds
    if (diffSecs < 10) {
        return 'a few moments ago';
    }
    // Less than 1 minute
    if (diffSecs < 60) {
        return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
    }
    // Less than 1 hour
    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
    // Less than 24 hours
    if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    // Less than 7 days
    if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    // Less than 4 weeks
    if (diffWeeks < 4) {
        return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;
    }
    // Less than 12 months
    if (diffMonths < 12) {
        return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    }
    // Years
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};

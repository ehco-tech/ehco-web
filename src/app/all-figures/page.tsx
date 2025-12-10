// app/all-figures/page.tsx

// Server Component - fetches initial data on the server

import { Suspense } from 'react';
import { Metadata } from 'next';
import AllFiguresContent from './all-figures-content';
import { AllFiguresLoadingSkeleton } from './loading-skeleton';
import { fetchInitialFigures } from '@/lib/data/figures';

// This metadata export is now valid because 'use client' is gone.
export const metadata: Metadata = {
    title: 'Korean Celebrity Directory',
    description: 'Browse the complete EHCO directory of Korean celebrities. Find profiles, facts, and timelines for every K-Pop idol, actor, and artist we cover. Search or filter by category to explore.',
};

// Enable ISR - revalidate every 5 minutes
export const revalidate = 300;

// Server Component that fetches initial data
async function AllFiguresWithData() {
    // Fetch the first page of data on the server
    const initialData = await fetchInitialFigures(18);

    return <AllFiguresContent initialData={initialData} />;
}

// The default export renders with Suspense for streaming
export default function AllFiguresPage() {
    return (
        <Suspense fallback={<AllFiguresLoadingSkeleton />}>
            <AllFiguresWithData />
        </Suspense>
    );
}
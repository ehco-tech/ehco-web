// src/app/api/tmdb/search/route.ts

import { NextResponse } from 'next/server';
import { searchPerson } from '@/lib/tmdb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');

        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
                { status: 400 }
            );
        }

        const results = await searchPerson(query);

        return NextResponse.json({
            results,
            total: results.length
        });

    } catch (error) {
        console.error('Error in TMDb search API:', error);
        return NextResponse.json(
            { error: 'Failed to search TMDb' },
            { status: 500 }
        );
    }
}
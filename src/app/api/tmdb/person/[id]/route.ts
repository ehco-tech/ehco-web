// src/app/api/tmdb/person/[id]/route.ts

import { NextResponse } from 'next/server';
import { getPersonDetails, getPersonFilmography } from '@/lib/api/tmdb/client';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: personIdStr } = await context.params;
        const personId = parseInt(personIdStr, 10);

        if (isNaN(personId)) {
            return NextResponse.json(
                { error: 'Invalid person ID' },
                { status: 400 }
            );
        }

        // Get person details and filmography in parallel
        const [person, filmography] = await Promise.all([
            getPersonDetails(personId),
            getPersonFilmography(personId)
        ]);

        return NextResponse.json({
            person,
            filmography
        });

    } catch (error) {
        console.error('Error fetching TMDb person data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch person data' },
            { status: 500 }
        );
    }
}
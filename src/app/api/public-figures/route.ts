import { db } from "@/lib/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { NextResponse } from "next/server";

// Cache for all figures data - now fetched from a single aggregated document
let cachedFigures: PublicFigure[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutes - can be longer since data is pre-aggregated

// Cache for filtered results to avoid reprocessing
const filteredCache = new Map<string, { data: PublicFigure[], timestamp: number }>();
const FILTERED_CACHE_DURATION = 60 * 60 * 1000; // 60 minutes

// Optimized interface with only necessary fields
interface PublicFigureBase {
    id: string;
    name: string;
    name_kr: string;
    nationality: string;
    occupation: string[];
    profilePic?: string;
    gender: string;
    company?: string;
    debutDate?: string;
    lastUpdated?: string;
}

interface IndividualPerson extends PublicFigureBase {
    is_group: false;
    birthDate?: string;
    group?: string;
}

interface GroupProfile extends PublicFigureBase {
    is_group: true;
    members?: IndividualPerson[];
}

type PublicFigure = IndividualPerson | GroupProfile;

// Helper function to determine group gender based on members
function determineGroupGender(members?: IndividualPerson[]): 'Male' | 'Female' | 'Mixed' {
    if (!members || members.length === 0) return 'Mixed';

    const genders = new Set(members.map(member => member.gender).filter(Boolean));

    if (genders.size === 1) {
        const gender = Array.from(genders)[0];
        return gender === 'Male' || gender === 'Female' ? gender : 'Mixed';
    }

    return 'Mixed';
}

// Helper function to check if figure matches category filters
function matchesCategoryFilters(figure: PublicFigure, filters: CategoryFilters): boolean {
    // Check gender filters - ALL selected genders must match
    if (filters.gender && filters.gender.length > 0) {
        const hasGroup = filters.gender.includes('Group');
        const hasMale = filters.gender.includes('Male');
        const hasFemale = filters.gender.includes('Female');

        // Handle specific combinations
        if (hasGroup && hasMale && !hasFemale) {
            // Group + Male: must be a male group (all members male)
            if (!figure.is_group) return false;
            const groupGender = determineGroupGender(figure.members);
            if (groupGender !== 'Male') return false;
        }
        else if (hasGroup && hasFemale && !hasMale) {
            // Group + Female: must be a female group (all members female)
            if (!figure.is_group) return false;
            const groupGender = determineGroupGender(figure.members);
            if (groupGender !== 'Female') return false;
        }
        else if (hasGroup && hasMale && hasFemale) {
            // Group + Male + Female: impossible combination, return false
            return false;
        }
        else if (hasGroup && !hasMale && !hasFemale) {
            // Only Group: must be a group (any gender)
            if (!figure.is_group) return false;
        }
        else if ((hasMale || hasFemale) && !hasGroup) {
            // Only Male or Female (no Group): check individuals and groups
            if (figure.is_group) {
                const groupGender = determineGroupGender(figure.members);
                if (hasMale && hasFemale) {
                    // Both Male and Female selected but no Group: impossible for one figure
                    return false;
                } else if (hasMale && groupGender !== 'Male') {
                    return false;
                } else if (hasFemale && groupGender !== 'Female') {
                    return false;
                }
            } else {
                // Individual figure
                if (hasMale && hasFemale) {
                    // Both Male and Female selected: impossible for one individual
                    return false;
                } else if (hasMale && figure.gender !== 'Male') {
                    return false;
                } else if (hasFemale && figure.gender !== 'Female') {
                    return false;
                }
            }
        }
        else if (hasMale && hasFemale && !hasGroup) {
            // Male + Female without Group: impossible combination
            return false;
        }
    }

    // Check occupation filters - figure must have AT LEAST ONE of the selected occupations
    // Changed from "every" to "some" to handle Actor/Actress filter correctly
    if (filters.occupation && filters.occupation.length > 0) {
        const hasAnyOccupation = filters.occupation.some(filterOccupation =>
            figure.occupation?.some(figureOccupation =>
                figureOccupation.toLowerCase().includes(filterOccupation.toLowerCase())
            )
        );
        if (!hasAnyOccupation) {
            return false;
        }
    }

    // Check nationality filters - figure must match ALL selected nationalities
    if (filters.nationality && filters.nationality.length > 0) {
        const hasAllNationalities = filters.nationality.every(filterNationality =>
            figure.nationality === filterNationality
        );
        if (!hasAllNationalities) {
            return false;
        }
    }

    return true;
}

interface CategoryFilters {
    gender?: string[];
    occupation?: string[];
    nationality?: string[];
}

function parseCategoryFilters(url: URL): CategoryFilters {
    const filters: CategoryFilters = {};

    // Parse gender filters
    const genderParams = url.searchParams.getAll('gender');
    if (genderParams.length > 0) {
        filters.gender = genderParams;
    }

    // Parse occupation filters
    const occupationParams = url.searchParams.getAll('occupation');
    if (occupationParams.length > 0) {
        filters.occupation = occupationParams;
    }

    // Parse nationality filters
    const nationalityParams = url.searchParams.getAll('nationality');
    if (nationalityParams.length > 0) {
        filters.nationality = nationalityParams;
    }

    return filters;
}

// Helper function to fetch all figures from the aggregated document
async function fetchAllFigures(): Promise<PublicFigure[]> {
    console.log('Fetching all figures from aggregated document...');

    const docRef = doc(db, 'all-figures-data', 'figures-list');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        throw new Error('Aggregated figures document not found. Please run the aggregation script first.');
    }

    const data = docSnap.data();
    return (data.figures || []) as PublicFigure[];
}

export async function GET(request: Request) {
    try {
        const url = new URL(request.url);
        const pageParam = url.searchParams.get('page');
        const pageSizeParam = url.searchParams.get('pageSize');
        const sortParam = url.searchParams.get('sort') || 'az';

        const page = pageParam ? parseInt(pageParam) : 1;
        const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 18;

        // Parse category filters
        const categoryFilters = parseCategoryFilters(url);
        const now = Date.now();

        // Generate cache key for filtered/sorted results
        const filterKey = JSON.stringify({ filters: categoryFilters, sort: sortParam });

        // Check if we have cached filtered results
        const cachedFiltered = filteredCache.get(filterKey);
        if (cachedFiltered && (now - cachedFiltered.timestamp) < FILTERED_CACHE_DURATION) {
            console.log('Using cached filtered results');
            const totalCount = cachedFiltered.data.length;
            const totalPages = Math.ceil(totalCount / pageSize);
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedFigures = cachedFiltered.data.slice(startIndex, endIndex);

            return NextResponse.json({
                publicFigures: paginatedFigures,
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
                appliedFilters: categoryFilters
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                }
            });
        }

        // Fetch all figures (from cache or aggregated document)
        let allFigures: PublicFigure[];

        if (cachedFigures && (now - cacheTimestamp) < CACHE_DURATION) {
            console.log('Using cached all figures data');
            allFigures = cachedFigures;
        } else {
            console.log('Fetching all figures from aggregated document');
            allFigures = await fetchAllFigures();

            // Update cache
            cachedFigures = allFigures;
            cacheTimestamp = now;
        }

        // Apply filters
        const filteredFigures = allFigures.filter(figure =>
            matchesCategoryFilters(figure, categoryFilters)
        );

        // Apply sorting
        const sortedFigures = [...filteredFigures].sort((a, b) => {
            switch (sortParam) {
                case 'za':
                    return b.name.localeCompare(a.name);
                case 'recent':
                    return (b.lastUpdated || '').localeCompare(a.lastUpdated || '');
                case 'popular':
                    return 0;
                default: // 'az'
                    return a.name.localeCompare(b.name);
            }
        });

        // Cache the filtered and sorted results
        filteredCache.set(filterKey, {
            data: sortedFigures,
            timestamp: now
        });

        // Apply pagination
        const totalCount = sortedFigures.length;
        const totalPages = Math.ceil(totalCount / pageSize);
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedFigures = sortedFigures.slice(startIndex, endIndex);

        return NextResponse.json({
            publicFigures: paginatedFigures,
            totalCount,
            totalPages,
            currentPage: page,
            pageSize,
            appliedFilters: categoryFilters
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
            }
        });
    } catch (error) {
        console.error('Error in API route:', error);

        if (error instanceof Error) {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            return NextResponse.json(
                { error: 'Failed to fetch public figures', details: error.message },
                { status: 500 }
            );
        } else {
            console.error('Unknown error type');
            return NextResponse.json(
                { error: 'Failed to fetch public figures', details: 'Unknown error' },
                { status: 500 }
            );
        }
    }
}
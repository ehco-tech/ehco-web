// src/lib/services/figures/types.ts
// Shared type definitions for figures

export interface FigureId {
    id: string;
}

export interface PublicFigure {
    id: string;
    name: string;
    name_kr?: string;
    profilePic?: string;
    occupation?: string[];
    gender?: string;
    categories?: string[];
    group?: string;
}

export interface FiguresResult {
    figures: PublicFigure[];
    totalCount: number;
    totalPages: number;
}

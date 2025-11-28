// src/hooks/useProgressiveArticles.ts
'use client';

import { useState, useEffect, useRef } from 'react';
import { Article } from '@/types/definitions';

interface UseProgressiveArticlesOptions {
    initialArticles: Article[];
    allArticleIds: string[];
    figureId: string;
    batchSize?: number;
    enabled?: boolean;
}

interface UseProgressiveArticlesReturn {
    articles: Article[];
    isLoading: boolean;
    loadedCount: number;
    totalCount: number;
    progress: number;
}

/**
 * Hook to progressively load articles in batches to avoid stack overflow
 * and improve initial page load performance.
 */
export function useProgressiveArticles({
    initialArticles,
    allArticleIds,
    figureId,
    batchSize = 500, // Load remaining articles in larger batches for speed
    enabled = true
}: UseProgressiveArticlesOptions): UseProgressiveArticlesReturn {
    const [articles, setArticles] = useState<Article[]>(initialArticles);
    const [isLoading, setIsLoading] = useState(false);
    const [loadedCount, setLoadedCount] = useState(initialArticles.length);

    const isFetchingRef = useRef(false);
    const currentBatchRef = useRef(0);

    useEffect(() => {
        // If we already have all articles or loading is disabled, don't fetch
        if (!enabled || initialArticles.length >= allArticleIds.length) {
            return;
        }

        // Prevent multiple simultaneous fetches
        if (isFetchingRef.current) {
            return;
        }

        const fetchNextBatch = async () => {
            isFetchingRef.current = true;
            setIsLoading(true);

            try {
                const alreadyLoadedIds = new Set(articles.map(a => a.id));
                const remainingIds = allArticleIds.filter(id => !alreadyLoadedIds.has(id));

                if (remainingIds.length === 0) {
                    setIsLoading(false);
                    isFetchingRef.current = false;
                    return;
                }

                // Get next batch of IDs, respecting API limit of 600
                const MAX_API_LIMIT = 600;
                const effectiveBatchSize = Math.min(batchSize, MAX_API_LIMIT);
                const startIdx = currentBatchRef.current * effectiveBatchSize;
                const batchIds = remainingIds.slice(startIdx, startIdx + effectiveBatchSize);

                if (batchIds.length === 0) {
                    setIsLoading(false);
                    isFetchingRef.current = false;
                    return;
                }

                console.log(`[Progressive Load] Fetching batch ${currentBatchRef.current + 1}: ${batchIds.length} articles`);

                const response = await fetch('/api/articles/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        articleIds: batchIds,
                        figureId
                    })
                });

                // Handle rate limiting gracefully
                if (response.status === 429) {
                    console.log(`[Progressive Load] Rate limit hit, will retry batch ${currentBatchRef.current + 1} later`);
                    setIsLoading(false);
                    isFetchingRef.current = false;
                    // Don't increment batch counter so we retry this batch later
                    return;
                }

                if (!response.ok) {
                    throw new Error(`Failed to fetch articles: ${response.status}`);
                }

                const newArticles: Article[] = await response.json();

                setArticles(prev => [...prev, ...newArticles]);
                setLoadedCount(prev => prev + newArticles.length);
                currentBatchRef.current++;

                console.log(`[Progressive Load] Loaded ${newArticles.length} articles. Total: ${articles.length + newArticles.length}/${allArticleIds.length}`);

            } catch (error) {
                console.error('Error loading article batch:', error);
            } finally {
                setIsLoading(false);
                isFetchingRef.current = false;
            }
        };

        // Start loading first batch after a short delay (let the page render first)
        const timer = setTimeout(() => {
            fetchNextBatch();
        }, 500);

        return () => clearTimeout(timer);
    }, [allArticleIds, initialArticles.length, articles, batchSize, enabled, figureId]);

    // Continue loading next batches automatically with exponential backoff
    useEffect(() => {
        if (isLoading || !enabled) return;
        if (loadedCount >= allArticleIds.length) return;

        // Faster loading for second batch since it's just one large fetch
        const actualDelay = 1000; // Just 1 second between batches

        const timer = setTimeout(() => {
            const alreadyLoadedIds = new Set(articles.map(a => a.id));
            const remainingIds = allArticleIds.filter(id => !alreadyLoadedIds.has(id));

            if (remainingIds.length > 0 && !isFetchingRef.current) {
                // Trigger next batch by updating a dummy state
                setLoadedCount(prev => prev);
            }
        }, actualDelay);

        return () => clearTimeout(timer);
    }, [isLoading, loadedCount, allArticleIds.length, articles, enabled, allArticleIds]);

    const progress = allArticleIds.length > 0
        ? Math.round((loadedCount / allArticleIds.length) * 100)
        : 100;

    return {
        articles,
        isLoading,
        loadedCount,
        totalCount: allArticleIds.length,
        progress
    };
}

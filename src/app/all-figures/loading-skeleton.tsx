// Skeleton loading component for all-figures page
export function FigureCardSkeleton() {
    return (
        <div className="flex flex-col items-center group animate-pulse">
            <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-40 lg:h-40 relative mb-3 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
    );
}

export function AllFiguresLoadingSkeleton() {
    return (
        <div className="min-h-screen bg-white dark:bg-black">
            <main className="max-w-7xl mx-auto px-4 py-8 sm:py-12">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12 text-gray-900 dark:text-white">
                    All Figures
                </h1>

                {/* Filters and Search Bar Skeleton */}
                <div className="mb-6 sm:mb-8 space-y-4">
                    {/* Search Input Skeleton */}
                    <div className="relative w-full max-w-xl mx-auto">
                        <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </div>

                    {/* Category Filter Skeleton */}
                    <div className="flex justify-center items-center gap-2">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </div>

                    {/* Empty space for selected filters */}
                    <div className="min-h-[32px]" />
                </div>

                {/* Grid of skeleton cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-12">
                    {Array.from({ length: 18 }).map((_, i) => (
                        <FigureCardSkeleton key={i} />
                    ))}
                </div>

                {/* Pagination Skeleton */}
                <div className="flex justify-center items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
            </main>
        </div>
    );
}

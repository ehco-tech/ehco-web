'use client'; // This is the most important part!

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FiguresProvider } from '@/context/FiguresContext';
import { AuthProvider } from '@/context/AuthContext';
import { LoadingProvider } from '@/context/LoadingContext';
import { HomeDataProvider } from '@/context/HomeDataContext';

export function Providers({ children }: { children: React.ReactNode }) {
    // This ensures a new QueryClient is not created on every render
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <LoadingProvider>
                <AuthProvider>
                    <HomeDataProvider>
                        {children}
                    </HomeDataProvider>
                </AuthProvider>
            </LoadingProvider>
        </QueryClientProvider>
    );
}
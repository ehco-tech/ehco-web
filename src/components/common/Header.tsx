'use client';

import { Loader2, Menu, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import SlidingMenu from '../layout/SlidingMenu';
import SearchSlider from '../layout/SearchSlider';
import UserMenu from '../layout/UserMenu';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import NotificationCenter from '../layout/NotificationCenter';
import { useAuth } from '@/context/AuthContext';

const LoadingOverlay = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 z-[60] flex items-center justify-center">
    <div className="bg-white dark:bg-[#1d1d1f] p-6 rounded-lg flex items-center space-x-3">
      <Loader2 className="animate-spin text-slate-600 dark:text-white" size={24} />
      <span className="text-slate-600 dark:text-white font-medium">Loading...</span>
    </div>
  </div>
);

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Check if current page is home page
  const isHomePage = pathname === '/';
  const isAllFiguresPage = pathname === '/all-figures';
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsLoading(true);
    router.push('/');

    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <>
      <header className="w-full border-b bg-white dark:bg-[#1d1d1f] dark:border-gray-800">
        <div className="w-[90%] md:w-[80%] mx-auto px-4 h-16 flex justify-center items-center">
          <div className="w-full h-full flex">
            {/* Left section with menu */}
            <div className="flex justify-start items-center w-1/3 text-black dark:text-white">
              <Menu onClick={() => setIsMenuOpen(!isMenuOpen)} className="cursor-pointer hover:dark:text-key-color-dark" />
            </div>

            {/* Center section with logo */}
            <div className="w-1/3 flex-1 flex justify-center items-center">
              <Link href="/" className="inline-block">
                <div className="relative w-20 h-16">
                  <Image
                    src="/ehco_logo-02.png"
                    alt="EHCO logo"
                    fill
                    className="object-contain"
                    sizes="80px"
                    priority
                  />
                </div>
              </Link>
            </div>

            {/* Right section with search and user menu */}
            <div className="w-1/3 flex justify-end items-center">
              <div className="flex items-center">
                {/* Search icon - show on all pages except home and all-figures */}
                {!isHomePage && !isAllFiguresPage && (
                  <>
                    <div className="text-black dark:text-white mr-2">
                      <Search
                        className="cursor-pointer hover:text-gray-600 hover:dark:text-key-color-dark transition-colors"
                        size={20}
                        onClick={() => setIsSearchOpen(true)}
                      />
                    </div>
                    {/* Divider after search icon - hide on auth pages when user is not logged in */}
                    {!(isAuthPage && !user) && (
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mr-2"></div>
                    )}
                  </>
                )}

                {!loading && (
                  <>
                    {user && (
                      <>
                        <div className="hidden sm:block mr-2">
                          <NotificationCenter />
                        </div>
                        {/* Divider after notifications - only show on desktop since notifications are desktop-only */}
                        <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-600 mr-2"></div>
                      </>
                    )}
                    <UserMenu />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {isLoading && <LoadingOverlay />}

      <Suspense fallback={
        <div className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-[#1d1d1f] shadow-lg z-50 transform -translate-x-full">
          <div className='w-full h-16 px-8 flex justify-start items-center border-b border-b-black dark:border-b-gray-700'>
            <p className='text-xl font-bold text-black dark:text-white'>Loading...</p>
          </div>
        </div>
      }>
        <SlidingMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      </Suspense>

      {/* Search slider for all screen sizes */}
      <Suspense fallback={null}>
        <SearchSlider isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      </Suspense>
    </>
  );
}
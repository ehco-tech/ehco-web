// src/components/UserMenu.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, Bell, BellRing } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext';
import { useNotifications } from '@/hooks/useNotifications'; // NEW IMPORT
import NotificationDropdown from './NotificationDropdown';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false); // NEW STATE
  const { user, signOut } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const { unreadCount } = useNotifications(); // NEW: Get unread count
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNotifications(false); // NEW: Close notifications too
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNavigation = (path: string, loadingMessage: string) => {
    showLoading(loadingMessage);
    router.push(path);
  };

  const handleLogout = async () => {
    showLoading('Signing you out...');
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      hideLoading();
    }
  };

  const handleProfileNavigation = () => {
    setIsOpen(false);
    handleNavigation('/profile', 'Loading...');
  };

  // NEW: Handle notification menu toggle
  const handleNotificationsClick = () => {
    setShowNotifications(!showNotifications);
    setIsOpen(false); // Close user menu when opening notifications
  };

  if (!user && isAuthPage) {
    return null;
  }

  if (!user) {
    return (
      <div className='flex items-center'>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => {
              sessionStorage.setItem('redirectPath', pathname);
              handleNavigation('/login', 'Loading...');
            }}
            className="text-sm font-medium text-gray-700 dark:text-white hover:text-key-color dark:hover:text-key-color-dark transition-colors"
          >
            Login
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              sessionStorage.setItem('redirectPath', pathname);
              handleNavigation('/signup', 'Loading...');
            }}
            className="text-sm font-medium bg-key-color dark:bg-key-color text-white px-3 py-1.5 rounded-full hover:bg-key-color-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
        <button
          onClick={() => {
            sessionStorage.setItem('redirectPath', pathname);
            handleNavigation('/login', 'Loading...');
          }}
          className="sm:hidden text-black"
        >
          <User
            className="cursor-pointer hover:text-gray-600 dark:text-white transition-colors"
            size={20}
          />
        </button>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const profilePic = user.photoURL || '/images/default-profile.png';
  const hasUnread = unreadCount > 0; // NEW: Check for unread notifications

  return (
    <div className='flex items-center'>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-key-color transition-colors"
        >
          <div className="relative w-6 h-6">
            <Image
              src={profilePic}
              alt="Profile Picture"
              fill
              className="rounded-full object-cover"
              sizes="24px"
            />
            {/* NEW: Mobile notification badge on profile picture */}
            {hasUnread && (
              <div className="absolute -top-1 -right-1 bg-key-color rounded-full w-3 h-3 sm:hidden flex items-center justify-center">
                <span className="text-white text-xs leading-none">•</span>
              </div>
            )}
          </div>
          <span className="hidden sm:block dark:text-white">{displayName}</span>
          <ChevronDown size={14} className={`hidden sm:block transition-transform ${isOpen ? 'rotate-180' : ''} dark:text-white`} />
        </button>

        {/* User Menu Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 dark:bg-[#1d1d1f] dark:border-gray-700">
            <div className="py-1">
              {/* Enhanced dropdown header with picture */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <div className="relative w-10 h-10">
                  <Image
                    src={profilePic}
                    alt="Profile Picture"
                    fill
                    className="rounded-full object-cover"
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate dark:text-white">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="py-1">
                {/* NEW: Mobile Notifications Option */}
                <button
                  onClick={handleNotificationsClick}
                  className="sm:hidden w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:dark:bg-gray-600 transition-colors flex items-center gap-2 justify-between"
                >
                  <div className="flex items-center gap-2">
                    {hasUnread ? (
                      <BellRing size={16} className="text-key-color" />
                    ) : (
                      <Bell size={16} />
                    )}
                    Notifications
                  </div>
                  {hasUnread && (
                    <span className="bg-key-color text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleProfileNavigation}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:dark:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <User size={16} className='dark:text-white' />
                  <span className='dark:text-white'>Profile</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:dark:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} className='dark:text-white' />
                  <span className='dark:text-white'>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEW: Mobile Notification Dropdown */}
        {showNotifications && (
          <div className="sm:hidden absolute right-0 mt-2">
            <NotificationDropdown onClose={() => setShowNotifications(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
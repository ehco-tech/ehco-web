// src/components/NotificationCenter.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import {
    Bell,
    BellRing
} from 'lucide-react';

interface NotificationCenterProps {
    className?: string;
}

export default function NotificationCenter({ className = '' }: NotificationCenterProps) {
    const { user } = useAuth();
    const { unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!user) {
        return null;
    }

    const hasUnread = unreadCount > 0;

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:dark:bg-gray-400 rounded-full transition-colors"
                aria-label={`Notifications (${unreadCount} unread)`}
            >
                {hasUnread ? (
                    <BellRing size={24} className="text-key-color" />
                ) : (
                    <Bell size={24} className='dark:text-white' />
                )}

                {/* Unread Count Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2">
                    <NotificationDropdown onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}
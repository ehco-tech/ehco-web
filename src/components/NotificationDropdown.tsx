// src/components/NotificationDropdown.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Timestamp } from 'firebase/firestore';
import {
    Bell,
    X,
    Settings,
    Check,
    Trash2,
    User,
    Calendar,
    Loader2,
    Star
} from 'lucide-react';

/**
 * Helper function to safely convert Firestore Timestamp or Date to Date object
 */
function toDate(timestamp: Date | Timestamp | string): Date {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    return new Date(timestamp);
}

interface NotificationDropdownProps {
    onClose?: () => void;
    className?: string;
}

export default function NotificationDropdown({ onClose, className = '' }: NotificationDropdownProps) {
    const { user } = useAuth();
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotifications,
        formatTime
    } = useNotifications();

    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

    const handleNotificationClick = async (notificationId: string, figureId: string) => {
        // Mark as read if unread
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            await markAsRead([notificationId]);
        }

        // Navigate to figure page
        router.push(`/${figureId}`);
        if (onClose) onClose();
    };

    const handleMarkAsRead = async (notificationIds: string[]) => {
        await markAsRead(notificationIds);
        setSelectedNotifications([]);
    };

    const handleDelete = async (notificationIds: string[]) => {
        await deleteNotifications(notificationIds);
        setSelectedNotifications([]);
    };

    const toggleNotificationSelection = (notificationId: string) => {
        setSelectedNotifications(prev =>
            prev.includes(notificationId)
                ? prev.filter(id => id !== notificationId)
                : [...prev, notificationId]
        );
    };

    const handleViewAllClick = () => {
        router.push('/notifications');
        if (onClose) onClose();
    };

    const handleSettingsClick = () => {
        router.push('/profile/notifications');
        if (onClose) onClose();
    };

    if (!user) {
        return null;
    }

    return (
        <div className={`w-80 sm:w-96 bg-white dark:bg-[#1d1d1f] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 flex flex-col ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <Bell size={18} className="text-gray-600 dark:text-white" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSettingsClick}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Notification Settings"
                    >
                        <Settings size={16} />
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Action Bar */}
            {notifications.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                        {selectedNotifications.length > 0 ? (
                            <>
                                <span className="text-sm text-gray-600">
                                    {selectedNotifications.length} selected
                                </span>
                                <button
                                    onClick={() => handleMarkAsRead(selectedNotifications)}
                                    className="text-xs text-blue-600 hover:underline"
                                >
                                    Mark Read
                                </button>
                                <button
                                    onClick={() => handleDelete(selectedNotifications)}
                                    className="text-xs text-red-600 hover:underline"
                                >
                                    Delete
                                </button>
                            </>
                        ) : (
                            <>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-sm text-blue-600 hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                    <button
                        onClick={handleViewAllClick}
                        className="text-sm text-key-color hover:underline"
                    >
                        View all
                    </button>
                </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin text-gray-400" size={20} />
                        <span className="ml-2 text-sm text-gray-600">Loading...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <Bell className="mx-auto mb-3 text-gray-300" size={32} />
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No notifications yet</h4>
                        <p className="text-xs text-gray-500">
                            You&apos;ll see notifications here when your favorites have updates
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {notifications.slice(0, 10).map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Selection Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedNotifications.includes(notification.id)}
                                        onChange={() => toggleNotificationSelection(notification.id)}
                                        className="mt-1 rounded border-gray-300 text-key-color focus:ring-key-color"
                                    />

                                    {/* Figure Avatar */}
                                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                        <User size={16} className="text-gray-400 w-full h-full p-2" />
                                    </div>

                                    {/* Notification Content */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => handleNotificationClick(notification.id, notification.figureId)}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                                    {notification.figureName}
                                                </h4>
                                                {notification.significance === 'major' && (
                                                    <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                )}
                                                {!notification.read && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-700 line-clamp-2 mb-1">
                                                {notification.eventTitle}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Calendar size={12} />
                                                <span>{formatTime(toDate(notification.createdAt))}</span>
                                                <span>•</span>
                                                <span className="capitalize">{notification.significance}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Individual Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {!notification.read && (
                                            <button
                                                onClick={() => handleMarkAsRead([notification.id])}
                                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete([notification.id])}
                                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Delete notification"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            {notifications.length > 10 && (
                <div className="p-3 border-t border-gray-200 text-center">
                    <button
                        onClick={handleViewAllClick}
                        className="text-sm text-key-color hover:underline"
                    >
                        View all {notifications.length} notifications
                    </button>
                </div>
            )}
        </div>
    );
}
// src/app/notifications/page.tsx
'use client';

import { useState } from 'react';

// Force dynamic rendering to avoid SSR issues with browser APIs
export const dynamic = 'force-dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Timestamp } from 'firebase/firestore';
import {
    Bell,
    ArrowLeft,
    Settings,
    Check,
    CheckCheck,
    Trash2,
    User,
    Calendar,
    Loader2,
    Star,
    Filter,
    Search
} from 'lucide-react';

function toDate(timestamp: Date | Timestamp | string): Date {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
        return timestamp;
    }
    return new Date(timestamp);
}

export default function NotificationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotifications,
        formatTime,
        groupByFigure,
        getUnreadNotifications,
        getMajorNotifications
    } = useNotifications();

    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread' | 'major'>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Filter notifications based on current filter and search
    const filteredNotifications = notifications.filter(notification => {
        // Apply filter
        if (filter === 'unread' && notification.read) return false;
        if (filter === 'major' && notification.significance !== 'major') return false;

        // Apply search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return (
                notification.figureName.toLowerCase().includes(search) ||
                notification.eventTitle.toLowerCase().includes(search) ||
                notification.eventSummary.toLowerCase().includes(search)
            );
        }

        return true;
    });

    const handleNotificationClick = async (notificationId: string, figureId: string) => {
        // Mark as read if unread
        const notification = notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            await markAsRead([notificationId]);
        }

        // Navigate to figure page
        router.push(`/${figureId}`);
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

    const selectAll = () => {
        setSelectedNotifications(filteredNotifications.map(n => n.id));
    };

    const clearSelection = () => {
        setSelectedNotifications([]);
    };

    if (!user) {
        router.push('/login');
        return null;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-key-color" size={24} />
                    <span className="text-gray-600">Loading notifications...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Bell size={24} className="text-key-color" />
                            Notifications
                        </h1>
                        <p className="text-gray-600 text-sm">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • {notifications.length} total
                        </p>
                    </div>
                    <Link
                        href="/profile"
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                        title="Notification Settings"
                    >
                        <Settings size={20} />
                    </Link>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" />
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'major')}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent"
                            >
                                <option value="all">All notifications</option>
                                <option value="unread">Unread only</option>
                                <option value="major">Major events</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                {filteredNotifications.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                {selectedNotifications.length > 0 ? (
                                    <>
                                        <span className="text-sm text-gray-600">
                                            {selectedNotifications.length} selected
                                        </span>
                                        <button
                                            onClick={() => handleMarkAsRead(selectedNotifications)}
                                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                        >
                                            <Check size={14} />
                                            Mark as read
                                        </button>
                                        <button
                                            onClick={() => handleDelete(selectedNotifications)}
                                            className="flex items-center gap-1 text-sm text-red-600 hover:underline"
                                        >
                                            <Trash2 size={14} />
                                            Delete
                                        </button>
                                        <button
                                            onClick={clearSelection}
                                            className="text-sm text-gray-600 hover:underline"
                                        >
                                            Clear selection
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={selectAll}
                                            className="text-sm text-gray-600 hover:underline"
                                        >
                                            Select all
                                        </button>
                                        {unreadCount > 0 && filter !== 'unread' && (
                                            <button
                                                onClick={markAllAsRead}
                                                className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                                            >
                                                <CheckCheck size={14} />
                                                Mark all as read
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="text-sm text-gray-500">
                                Showing {filteredNotifications.length} of {notifications.length}
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications List */}
                <div className="space-y-4">
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                            <Bell className="mx-auto mb-4 text-gray-300" size={48} />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                {searchTerm || filter !== 'all' ? 'No notifications found' : 'No notifications yet'}
                            </h3>
                            <p className="text-gray-500 mb-4">
                                {searchTerm || filter !== 'all'
                                    ? 'Try adjusting your search or filter criteria'
                                    : 'You\'ll see notifications here when your favorites have updates'
                                }
                            </p>
                            {(searchTerm || filter !== 'all') && (
                                <button
                                    onClick={() => { setSearchTerm(''); setFilter('all'); }}
                                    className="text-key-color hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow ${!notification.read ? 'ring-2 ring-blue-100' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Selection Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={selectedNotifications.includes(notification.id)}
                                        onChange={() => toggleNotificationSelection(notification.id)}
                                        className="mt-1 rounded border-gray-300 text-key-color focus:ring-key-color"
                                    />

                                    {/* Figure Avatar */}
                                    <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                                        <User size={24} className="text-gray-400 w-full h-full p-3" />
                                    </div>

                                    {/* Notification Content */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="cursor-pointer"
                                            onClick={() => handleNotificationClick(notification.id, notification.figureId)}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="text-lg font-medium text-gray-900">
                                                    {notification.figureName}
                                                </h3>
                                                {notification.significance === 'major' && (
                                                    <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                                )}
                                                {!notification.read && (
                                                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                                                )}
                                            </div>
                                            <h4 className="text-base font-medium text-gray-800 mb-2">
                                                {notification.eventTitle}
                                            </h4>
                                            <p className="text-gray-600 mb-3 line-clamp-2">
                                                {notification.eventSummary}
                                            </p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>{formatTime(toDate(notification.createdAt))}</span>
                                                </div>
                                                <span className="capitalize bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                    {notification.significance}
                                                </span>
                                                <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">
                                                    {notification.eventCategory}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Individual Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {!notification.read && (
                                            <button
                                                onClick={() => handleMarkAsRead([notification.id])}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete([notification.id])}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete notification"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Load More / Pagination could go here if needed */}
            </div>
        </div>
    );
}
// src/hooks/useNotifications.ts

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext'; // Adjust import path as needed
import {
    Notification,
    NotificationPreferences,
    subscribeToNotifications,
    subscribeToUnreadCount,
    subscribeToNewNotifications,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    deleteNotifications,
    clearAllNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
    requestNotificationPermission,
    getNotificationSummary,
    groupNotificationsByFigure,
    formatNotificationTime
} from '@/lib/services/notifications/notification-service';

interface UseNotificationsReturn {
    // State
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    error: string | null;
    preferences: NotificationPreferences | null;

    // Actions
    markAsRead: (notificationIds: string[]) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotifications: (notificationIds: string[]) => Promise<void>;
    clearAll: () => Promise<void>;
    updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
    requestPermission: () => Promise<NotificationPermission>;

    // Utilities
    groupByFigure: () => Record<string, Notification[]>;
    getUnreadNotifications: () => Notification[];
    getMajorNotifications: () => Notification[];
    formatTime: (date: Date) => string;
}

export function useNotifications(): UseNotificationsReturn {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);

    // Load initial preferences
    useEffect(() => {
        if (!user?.uid) return;

        const loadPreferences = async () => {
            try {
                const prefs = await getNotificationPreferences(user.uid);
                setPreferences(prefs);
            } catch (err) {
                console.error('Error loading notification preferences:', err);
                setError('Failed to load notification preferences');
            }
        };

        loadPreferences();
    }, [user?.uid]);

    // Subscribe to notifications
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        // Subscribe to notifications
        const unsubscribeNotifications = subscribeToNotifications(user.uid, (notifs) => {
            setNotifications(notifs);
            setLoading(false);
        });

        // Subscribe to unread count
        const unsubscribeUnreadCount = subscribeToUnreadCount(user.uid, (count) => {
            setUnreadCount(count);
        });

        // Subscribe to new notifications for browser notifications
        let unsubscribeNewNotifications: (() => void) | null = null;

        if (preferences?.enabled) {
            unsubscribeNewNotifications = subscribeToNewNotifications(user.uid, (notification) => {
                // You can add custom logic here for handling new notifications
                console.log('New notification received:', notification);
            });
        }

        return () => {
            unsubscribeNotifications();
            unsubscribeUnreadCount();
            if (unsubscribeNewNotifications) {
                unsubscribeNewNotifications();
            }
        };
    }, [user?.uid, preferences?.enabled]);

    // Mark notifications as read
    const markAsRead = useCallback(async (notificationIds: string[]) => {
        if (!user?.uid) return;

        try {
            await markNotificationsAsRead(user.uid, notificationIds);
        } catch (err) {
            console.error('Error marking notifications as read:', err);
            setError('Failed to mark notifications as read');
        }
    }, [user?.uid]);

    // Mark all notifications as read
    const markAllAsRead = useCallback(async () => {
        if (!user?.uid) return;

        try {
            await markAllNotificationsAsRead(user.uid);
        } catch (err) {
            console.error('Error marking all notifications as read:', err);
            setError('Failed to mark all notifications as read');
        }
    }, [user?.uid]);

    // Delete notifications
    const deleteNotificationsCallback = useCallback(async (notificationIds: string[]) => {
        if (!user?.uid) return;

        try {
            await deleteNotifications(user.uid, notificationIds);
        } catch (err) {
            console.error('Error deleting notifications:', err);
            setError('Failed to delete notifications');
        }
    }, [user?.uid]);

    // Clear all notifications
    const clearAll = useCallback(async () => {
        if (!user?.uid) return;

        try {
            await clearAllNotifications(user.uid);
        } catch (err) {
            console.error('Error clearing all notifications:', err);
            setError('Failed to clear all notifications');
        }
    }, [user?.uid]);

    // Update preferences
    const updatePreferencesCallback = useCallback(async (prefs: Partial<NotificationPreferences>) => {
        if (!user?.uid) return;

        try {
            await updateNotificationPreferences(user.uid, prefs);
            setPreferences(prev => prev ? { ...prev, ...prefs } : null);
        } catch (err) {
            console.error('Error updating notification preferences:', err);
            setError('Failed to update notification preferences');
        }
    }, [user?.uid]);

    // Request browser notification permission
    const requestPermission = useCallback(async () => {
        return await requestNotificationPermission();
    }, []);

    // Utility functions
    const groupByFigure = useCallback(() => {
        return groupNotificationsByFigure(notifications);
    }, [notifications]);

    const getUnreadNotifications = useCallback(() => {
        return notifications.filter(n => !n.read);
    }, [notifications]);

    const getMajorNotifications = useCallback(() => {
        return notifications.filter(n => n.significance === 'major');
    }, [notifications]);

    const formatTime = useCallback((date: Date) => {
        return formatNotificationTime(date);
    }, []);

    return {
        // State
        notifications,
        unreadCount,
        loading,
        error,
        preferences,

        // Actions
        markAsRead,
        markAllAsRead,
        deleteNotifications: deleteNotificationsCallback,
        clearAll,
        updatePreferences: updatePreferencesCallback,
        requestPermission,

        // Utilities
        groupByFigure,
        getUnreadNotifications,
        getMajorNotifications,
        formatTime
    };
}

// Additional hook for notification summary/analytics
export function useNotificationSummary(days: number = 7) {
    const { user } = useAuth();
    const [summary, setSummary] = useState({
        total: 0,
        unread: 0,
        bySignificance: {} as Record<string, number>,
        byFigure: {} as Record<string, number>
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const loadSummary = async () => {
            try {
                setLoading(true);
                const summaryData = await getNotificationSummary(user.uid, days);
                setSummary(summaryData);
            } catch (error) {
                console.error('Error loading notification summary:', error);
            } finally {
                setLoading(false);
            }
        };

        loadSummary();
    }, [user?.uid, days]);

    return { summary, loading };
}

// Hook for managing notification preferences UI
export function useNotificationPreferences() {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load preferences
    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }

        const loadPreferences = async () => {
            try {
                setLoading(true);
                const prefs = await getNotificationPreferences(user.uid);
                setPreferences(prefs);
            } catch (err) {
                console.error('Error loading preferences:', err);
                setError('Failed to load preferences');
            } finally {
                setLoading(false);
            }
        };

        loadPreferences();
    }, [user?.uid]);

    // Update preferences
    const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
        if (!user?.uid || !preferences) return;

        try {
            setSaving(true);
            setError(null);

            await updateNotificationPreferences(user.uid, updates);
            setPreferences(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) {
            console.error('Error updating preferences:', err);
            setError('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    }, [user?.uid, preferences]);

    // Toggle specific preference
    const togglePreference = useCallback(async (key: keyof NotificationPreferences) => {
        if (!preferences) return;

        const currentValue = preferences[key];
        await updatePreferences({ [key]: !currentValue } as Partial<NotificationPreferences>);
    }, [preferences, updatePreferences]);

    return {
        preferences,
        loading,
        saving,
        error,
        updatePreferences,
        togglePreference
    };
}
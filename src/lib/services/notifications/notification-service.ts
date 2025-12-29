// src/lib/notification-service.ts

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    onSnapshot,
    collection,
    query,
    orderBy,
    limit,
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from '../../config/firebase';

export interface Notification {
    id: string;
    figureId: string;
    figureName: string;
    eventTitle: string;
    eventSummary: string;
    eventCategory: string;
    eventDate: Date | Timestamp;
    significance: 'major' | 'regular' | 'minor';
    createdAt: Date | Timestamp;
    read: boolean;
    type: 'timeline_update' | 'major_event';
}

export interface UserNotifications {
    notifications: Notification[];
    lastUpdated: Date | Timestamp;
}

export interface NotificationPreferences {
    enabled: boolean;
    timeline_updates: boolean;
    major_events_only: boolean;
    newsletter: boolean;
    newsletter_frequency: 'daily' | 'weekly' | 'instant';
}

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

/**
 * Get user notifications with real-time updates
 */
export function subscribeToNotifications(
    uid: string,
    callback: (notifications: Notification[]) => void
): () => void {
    const notificationsRef = doc(db, 'user-notifications', uid);

    return onSnapshot(notificationsRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as UserNotifications;
            const notifications = data.notifications || [];

            // Convert Firestore timestamps to Date objects
            const processedNotifications = notifications.map(notification => ({
                ...notification,
                createdAt: toDate(notification.createdAt),
                eventDate: toDate(notification.eventDate)
            }));

            // Sort by creation date (newest first)
            processedNotifications.sort((a, b) =>
                toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
            );

            callback(processedNotifications);
        } else {
            callback([]);
        }
    }, (error) => {
        console.error('Error subscribing to notifications:', error);
        callback([]);
    });
}

/**
 * Get user notifications (one-time fetch)
 */
export async function getUserNotifications(uid: string): Promise<Notification[]> {
    try {
        const notificationsRef = doc(db, 'user-notifications', uid);
        const notificationsSnap = await getDoc(notificationsRef);

        if (notificationsSnap.exists()) {
            const data = notificationsSnap.data() as UserNotifications;
            const notifications = data.notifications || [];

            // Process timestamps
            const processedNotifications = notifications.map(notification => ({
                ...notification,
                createdAt: toDate(notification.createdAt),
                eventDate: toDate(notification.eventDate)
            }));

            // Sort by creation date (newest first)
            return processedNotifications.sort((a, b) =>
                toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime()
            );
        }

        return [];
    } catch (error) {
        console.error('Error getting user notifications:', error);
        return [];
    }
}

/**
 * Mark notifications as read
 */
export async function markNotificationsAsRead(
    uid: string,
    notificationIds: string[]
): Promise<void> {
    try {
        const notificationsRef = doc(db, 'user-notifications', uid);
        const notificationsSnap = await getDoc(notificationsRef);

        if (notificationsSnap.exists()) {
            const data = notificationsSnap.data() as UserNotifications;
            const notifications = data.notifications || [];

            // Update read status for specified notifications
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: notificationIds.includes(notification.id) ? true : notification.read
            }));

            await updateDoc(notificationsRef, {
                notifications: updatedNotifications,
                lastUpdated: new Date()
            });
        }
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(uid: string): Promise<void> {
    try {
        const notificationsRef = doc(db, 'user-notifications', uid);
        const notificationsSnap = await getDoc(notificationsRef);

        if (notificationsSnap.exists()) {
            const data = notificationsSnap.data() as UserNotifications;
            const notifications = data.notifications || [];

            // Mark all as read
            const updatedNotifications = notifications.map(notification => ({
                ...notification,
                read: true
            }));

            await updateDoc(notificationsRef, {
                notifications: updatedNotifications,
                lastUpdated: new Date()
            });
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

/**
 * Get unread notifications count
 */
export async function getUnreadNotificationsCount(uid: string): Promise<number> {
    try {
        const notifications = await getUserNotifications(uid);
        return notifications.filter(n => !n.read).length;
    } catch (error) {
        console.error('Error getting unread notifications count:', error);
        return 0;
    }
}

/**
 * Subscribe to unread notifications count
 */
export function subscribeToUnreadCount(
    uid: string,
    callback: (count: number) => void
): () => void {
    return subscribeToNotifications(uid, (notifications) => {
        const unreadCount = notifications.filter(n => !n.read).length;
        callback(unreadCount);
    });
}

/**
 * Delete specific notifications
 */
export async function deleteNotifications(
    uid: string,
    notificationIds: string[]
): Promise<void> {
    try {
        const notificationsRef = doc(db, 'user-notifications', uid);
        const notificationsSnap = await getDoc(notificationsRef);

        if (notificationsSnap.exists()) {
            const data = notificationsSnap.data() as UserNotifications;
            const notifications = data.notifications || [];

            // Filter out deleted notifications
            const updatedNotifications = notifications.filter(
                notification => !notificationIds.includes(notification.id)
            );

            await updateDoc(notificationsRef, {
                notifications: updatedNotifications,
                lastUpdated: new Date()
            });
        }
    } catch (error) {
        console.error('Error deleting notifications:', error);
        throw error;
    }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(uid: string): Promise<void> {
    try {
        const notificationsRef = doc(db, 'user-notifications', uid);
        await updateDoc(notificationsRef, {
            notifications: [],
            lastUpdated: new Date()
        });
    } catch (error) {
        console.error('Error clearing all notifications:', error);
        throw error;
    }
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(uid: string): Promise<NotificationPreferences> {
    try {
        const prefsRef = doc(db, 'user-preferences', uid);
        const prefsSnap = await getDoc(prefsRef);

        if (prefsSnap.exists()) {
            const data = prefsSnap.data();
            return data.notifications || getDefaultPreferences();
        }

        return getDefaultPreferences();
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        return getDefaultPreferences();
    }
}

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
    uid: string,
    preferences: Partial<NotificationPreferences>
): Promise<void> {
    try {
        const prefsRef = doc(db, 'user-preferences', uid);
        const prefsSnap = await getDoc(prefsRef);

        if (prefsSnap.exists()) {
            const existingData = prefsSnap.data();
            await updateDoc(prefsRef, {
                notifications: {
                    ...existingData.notifications,
                    ...preferences
                },
                updatedAt: new Date()
            });
        } else {
            await setDoc(prefsRef, {
                notifications: {
                    ...getDefaultPreferences(),
                    ...preferences
                },
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        throw error;
    }
}

/**
 * Get default notification preferences
 */
function getDefaultPreferences(): NotificationPreferences {
    return {
        enabled: true,
        timeline_updates: true,
        major_events_only: false,
        newsletter: true,
        newsletter_frequency: 'weekly'
    };
}

/**
 * Get notifications for a specific figure
 */
export async function getFigureNotifications(
    uid: string,
    figureId: string
): Promise<Notification[]> {
    try {
        const allNotifications = await getUserNotifications(uid);
        return allNotifications.filter(notification => notification.figureId === figureId);
    } catch (error) {
        console.error('Error getting figure notifications:', error);
        return [];
    }
}

/**
 * Get notifications by significance level
 */
export async function getNotificationsBySignificance(
    uid: string,
    significance: 'major' | 'regular' | 'minor'
): Promise<Notification[]> {
    try {
        const allNotifications = await getUserNotifications(uid);
        return allNotifications.filter(notification => notification.significance === significance);
    } catch (error) {
        console.error('Error getting notifications by significance:', error);
        return [];
    }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission;
    }
    return 'denied';
}

/**
 * Show browser notification
 */
export function showBrowserNotification(
    title: string,
    options: NotificationOptions & { onClick?: () => void } = {}
): void {
    if ('Notification' in window && Notification.permission === 'granted') {
        const { onClick, ...notificationOptions } = options;
        const notification = new Notification(title, notificationOptions);

        if (onClick) {
            notification.onclick = onClick;
        }

        // Auto-close after 5 seconds
        setTimeout(() => {
            notification.close();
        }, 5000);
    }
}

/**
 * Subscribe to new notifications and show browser notifications
 */
export function subscribeToNewNotifications(
    uid: string,
    onNewNotification?: (notification: Notification) => void
): () => void {
    let lastNotificationTime = Date.now();

    return subscribeToNotifications(uid, (notifications) => {
        // Find new notifications since last check
        const newNotifications = notifications.filter(notification => {
            const notificationTime = toDate(notification.createdAt).getTime();
            return notificationTime > lastNotificationTime && !notification.read;
        });

        // Update last notification time
        if (notifications.length > 0) {
            lastNotificationTime = Math.max(
                lastNotificationTime,
                ...notifications.map(n => toDate(n.createdAt).getTime())
            );
        }

        // Show browser notifications for new notifications
        newNotifications.forEach(notification => {
            showBrowserNotification(
                `New update: ${notification.figureName}`,
                {
                    body: notification.eventTitle,
                    icon: '/icon-192x192.png', // Your app icon
                    tag: notification.id, // Prevent duplicate notifications
                    onClick: () => {
                        // Navigate to figure page or notification center
                        if (typeof window !== 'undefined') {
                            window.focus();
                            window.location.href = `/figures/${notification.figureId}`;
                        }
                    }
                }
            );

            // Call custom callback if provided
            if (onNewNotification) {
                onNewNotification(notification);
            }
        });
    });
}

/**
 * Utility to format notification time
 */
export function formatNotificationTime(date: Date | Timestamp): string {
    const dateObj = toDate(date);
    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) {
        return 'Just now';
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    } else {
        return dateObj.toLocaleDateString();
    }
}

/**
 * Group notifications by figure
 */
export function groupNotificationsByFigure(notifications: Notification[]): Record<string, Notification[]> {
    return notifications.reduce((groups, notification) => {
        const figureId = notification.figureId;
        if (!groups[figureId]) {
            groups[figureId] = [];
        }
        groups[figureId].push(notification);
        return groups;
    }, {} as Record<string, Notification[]>);
}

/**
 * Get notification summary for a time period
 */
export async function getNotificationSummary(
    uid: string,
    days: number = 7
): Promise<{
    total: number;
    unread: number;
    bySignificance: Record<string, number>;
    byFigure: Record<string, number>;
}> {
    try {
        const notifications = await getUserNotifications(uid);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const recentNotifications = notifications.filter(
            n => toDate(n.createdAt) >= cutoffDate
        );

        const summary = {
            total: recentNotifications.length,
            unread: recentNotifications.filter(n => !n.read).length,
            bySignificance: {} as Record<string, number>,
            byFigure: {} as Record<string, number>
        };

        // Count by significance
        recentNotifications.forEach(notification => {
            summary.bySignificance[notification.significance] =
                (summary.bySignificance[notification.significance] || 0) + 1;

            summary.byFigure[notification.figureName] =
                (summary.byFigure[notification.figureName] || 0) + 1;
        });

        return summary;
    } catch (error) {
        console.error('Error getting notification summary:', error);
        return {
            total: 0,
            unread: 0,
            bySignificance: {},
            byFigure: {}
        };
    }
}
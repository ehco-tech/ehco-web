// src/components/NotificationSettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProfileData } from '@/context/ProfileDataContext';
import { updateNotificationPreferences, requestNotificationPermission, NotificationPreferences } from '@/lib/notification-service';
import { Bell, BellOff, Mail, Clock, AlertTriangle, Loader2 } from 'lucide-react';

interface NotificationSettingsProps {
    className?: string;
}

export default function NotificationSettings({ className = '' }: NotificationSettingsProps) {
    const { user } = useAuth();
    const { notificationPreferences: preferences, setNotificationPreferences } = useProfileData();

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');
    const [requestingPermission, setRequestingPermission] = useState(false);

    useEffect(() => {
        // Check current browser notification permission
        if ('Notification' in window) {
            setBrowserPermission(Notification.permission);
        }
    }, []);

    const handleRequestBrowserPermission = async () => {
        setRequestingPermission(true);
        try {
            const permission = await requestNotificationPermission();
            setBrowserPermission(permission);
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        } finally {
            setRequestingPermission(false);
        }
    };

    const updatePrefs = async (updates: Partial<NotificationPreferences>) => {
        if (!user?.uid || !preferences) return;

        try {
            setSaving(true);
            setError(null);

            await updateNotificationPreferences(user.uid, updates);
            setNotificationPreferences(prev => prev ? { ...prev, ...updates } : null);
        } catch (err) {
            console.error('Error updating preferences:', err);
            setError('Failed to save preferences');
        } finally {
            setSaving(false);
        }
    };

    const togglePreference = async (key: keyof NotificationPreferences) => {
        if (!preferences) return;

        const currentValue = preferences[key];
        await updatePrefs({ [key]: !currentValue } as Partial<NotificationPreferences>);
    };

    if (!user) {
        return null;
    }

    return (
        <div className={`space-y-6 ${className}`}>
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                </div>
            )}

            {/* Master Toggle */}
            <div className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {preferences?.enabled ? (
                            <Bell size={20} className="text-green-600 dark:text-green-400" />
                        ) : (
                            <BellOff size={20} className="text-gray-400 dark:text-gray-500" />
                        )}
                        <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">Enable Notifications</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Get notified when your favorite figures have new updates
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={preferences?.enabled || false}
                            onChange={() => togglePreference('enabled')}
                            disabled={saving}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-key-color"></div>
                    </label>
                </div>
            </div>

            {/* Browser Notifications */}
            {preferences?.enabled && (
                <div className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${browserPermission === 'granted' ? 'bg-green-100 dark:bg-green-900/30' :
                                    browserPermission === 'denied' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
                                }`}>
                                <Bell size={16} className={
                                    browserPermission === 'granted' ? 'text-green-600 dark:text-green-400' :
                                        browserPermission === 'denied' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                                } />
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Browser Notifications</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Show notifications in your browser when you&apos;re online
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-xs px-2 py-1 rounded-full mb-2 ${browserPermission === 'granted' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    browserPermission === 'denied' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                }`}>
                                {browserPermission === 'granted' ? 'Enabled' :
                                    browserPermission === 'denied' ? 'Blocked' : 'Not Set'}
                            </div>
                            {browserPermission !== 'granted' && (
                                <button
                                    onClick={handleRequestBrowserPermission}
                                    disabled={requestingPermission || browserPermission === 'denied'}
                                    className="text-xs text-key-color hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {requestingPermission ? 'Requesting...' :
                                        browserPermission === 'denied' ? 'Enable in Browser' : 'Enable'}
                                </button>
                            )}
                        </div>
                    </div>
                    {browserPermission === 'denied' && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-3 mt-3">
                            <p className="text-xs text-red-700 dark:text-red-400">
                                Browser notifications are blocked. Enable them in your browser settings to receive real-time alerts.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Notification Types */}
            {preferences?.enabled && (
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white">Notification Types</h4>

                    <div className="space-y-3">
                        <div className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white">All Timeline Updates</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Get notified for all new events and activities
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences?.timeline_updates || false}
                                        onChange={() => togglePreference('timeline_updates')}
                                        disabled={saving}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-key-color"></div>
                                </label>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h5 className="font-medium text-gray-900 dark:text-white">Major Events Only</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Only notify for significant events (awards, controversies, major announcements)
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={preferences?.major_events_only || false}
                                        onChange={() => togglePreference('major_events_only')}
                                        disabled={saving}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-key-color"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Newsletter Settings */}
            {preferences?.enabled && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Mail size={16} className="text-key-color dark:text-pink-400" />
                        <h4 className="font-medium text-gray-900 dark:text-white">Email Newsletter</h4>
                    </div>

                    <div className="bg-white dark:bg-[#2c2c2e] border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h5 className="font-medium text-gray-900 dark:text-white">Newsletter Subscription</h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Receive email summaries of your favorites&apos; updates
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences?.newsletter || false}
                                    onChange={() => togglePreference('newsletter')}
                                    disabled={saving}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-key-color"></div>
                            </label>
                        </div>

                        {preferences?.newsletter && (
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={16} className="text-gray-400 dark:text-gray-500" />
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Email Frequency
                                    </label>
                                </div>
                                <select
                                    value={preferences?.newsletter_frequency || 'weekly'}
                                    onChange={(e) => updatePrefs({
                                        newsletter_frequency: e.target.value as 'daily' | 'weekly' | 'instant'
                                    })}
                                    disabled={saving}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white"
                                >
                                    <option value="instant">Instant (as events happen)</option>
                                    <option value="daily">Daily digest (9 AM)</option>
                                    <option value="weekly">Weekly summary (Sundays)</option>
                                </select>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    {preferences?.newsletter_frequency === 'instant' && 'You\'ll receive an email immediately when your favorites have new updates.'}
                                    {preferences?.newsletter_frequency === 'daily' && 'You\'ll receive a daily digest every morning at 9 AM with all updates from the previous day.'}
                                    {preferences?.newsletter_frequency === 'weekly' && 'You\'ll receive a weekly summary every Sunday morning with all updates from the past week.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {saving && (
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <Loader2 className="animate-spin text-blue-600 dark:text-blue-400" size={16} />
                        <p className="text-sm text-blue-700 dark:text-blue-400">Saving preferences...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

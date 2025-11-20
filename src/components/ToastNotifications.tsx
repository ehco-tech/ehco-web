// src/components/ToastNotifications.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { subscribeToNewNotifications } from '@/lib/notification-service';
import { X, Star, User } from 'lucide-react';
import type { Notification } from '@/lib/notification-service';

interface ToastNotification extends Notification {
    toastId: string;
    showTime: number;
}

export default function ToastNotifications() {
    const { user } = useAuth();
    const [toasts, setToasts] = useState<ToastNotification[]>([]);

    useEffect(() => {
        if (!user?.uid) return;

        // Subscribe to new notifications and show as toasts
        const unsubscribe = subscribeToNewNotifications(user.uid, (notification) => {
            const toast: ToastNotification = {
                ...notification,
                toastId: `${notification.id}-${Date.now()}`,
                showTime: Date.now()
            };

            setToasts(prev => [...prev, toast]);

            // Auto-remove toast after 5 seconds
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.toastId !== toast.toastId));
            }, 5000);
        });

        return unsubscribe;
    }, [user?.uid]);

    const removeToast = (toastId: string) => {
        setToasts(prev => prev.filter(t => t.toastId !== toastId));
    };

    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.toastId}
                    className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-in slide-in-from-right-full duration-300"
                >
                    <div className="flex items-start gap-3">
                        {/* Figure Avatar */}
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
                            <User size={16} className="text-gray-400 w-full h-full p-2" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                    {toast.figureName}
                                </h4>
                                {toast.significance === 'major' && (
                                    <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                                )}
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                                {toast.eventTitle}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                New {toast.significance} event
                            </p>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={() => removeToast(toast.toastId)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
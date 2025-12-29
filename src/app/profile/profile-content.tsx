// src/app/profile/profile-content.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { removeFromFavorites } from '@/lib/services/favorites/favorites-service';
import ProfileScrappedSectionEnhanced from '@/components/profile/ProfileScrappedSection';
import DeleteAccountDialog from '@/components/profile/DeleteAccountDialog';
import { User, Mail, Calendar, Loader2, Phone, Star, Trash2, Heart, Settings, FileText, ChevronDown, Upload, Bell, Check, CheckCheck, Filter, Search } from 'lucide-react';

// --- Firebase imports for storage and profile updates ---
import { updateProfile, sendEmailVerification } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '@/lib/config/firebase';
import { updateUserProfile } from '@/lib/services/users/user-service';

import { useProfileData } from '@/context/ProfileDataContext';
import { removeFromScrappedEvents } from '@/lib/services/scraping/scrapping-service';
import LoadingOverlay from '@/components/common/LoadingOverlay';
import { updateNotificationPreferences } from '@/lib/services/notifications/notification-service';
import { AdSidebar } from '@/components/ads/Ad';
import { useNotifications } from '@/hooks/useNotifications';
import { Timestamp } from 'firebase/firestore';

type TabType = 'account' | 'favorites' | 'scrapped' | 'notifications';

type ProfileContentProps = {
  initialTab: TabType;
};

export default function ProfileContent({ initialTab }: ProfileContentProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const {
    userProfile,
    favorites,
    scrappedEvents,
    articles,
    figureData,
    isLoading,
    isRouteLoading,
    setFavorites,
    setScrappedEvents,
    setRouteLoading,
    notificationPreferences,
    setNotificationPreferences
  } = useProfileData();

  // Notifications hook
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    formatTime,
  } = useNotifications();

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [openAccordionTabs, setOpenAccordionTabs] = useState<TabType[]>([initialTab]);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);

  // Notifications state
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread' | 'major'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // --- Profile picture management state ---
  const [newProfileImage, setNewProfileImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const tabFromPath = pathname.split('/').pop();
    const validTabs: TabType[] = ['account', 'favorites', 'scrapped', 'notifications'];

    if (validTabs.includes(tabFromPath as TabType)) {
      if (activeTab !== tabFromPath) {
        setActiveTab(tabFromPath as TabType);
      }
    } else {
      if (activeTab !== 'account') {
        setActiveTab('account');
      }
    }
  }, [pathname, activeTab]);

  useEffect(() => {
    if (mobileNavRef.current) {
      const activeTabElement = mobileNavRef.current.querySelector(`[data-tab-id="${activeTab}"]`);
      if (activeTabElement) {
        activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeTab]);

  // --- Handler for selecting a new profile image ---
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setUpdateMessage('Profile picture must be less than 5MB.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setUpdateMessage('Please select a valid image file.');
        return;
      }
      setNewProfileImage(file);
      setUpdateMessage('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Handler to cancel image update ---
  const cancelImageUpdate = () => {
    setNewProfileImage(null);
    setImagePreview(null);
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // --- Handler to upload the new image and update the profile ---
  const handleImageUpdate = async () => {
    if (!user || !newProfileImage) return;

    setIsUploading(true);
    setUpdateMessage('');

    try {
      // 1. Upload to Firebase Storage
      const imageRef = ref(storage, `profile-pictures/${user.uid}/${newProfileImage.name}`);
      const snapshot = await uploadBytes(imageRef, newProfileImage);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Update Firebase Auth profile
      await updateProfile(user, { photoURL: downloadURL });

      // 3. Update Firestore profile document
      await updateUserProfile(user.uid, { profilePicture: downloadURL });

      setUpdateMessage('Profile picture updated successfully!');
      cancelImageUpdate(); // Reset the state
    } catch (error) {
      console.error("Error updating profile picture:", error);
      setUpdateMessage('Failed to update profile picture. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveFavorite = async (figureId: string) => {
    if (!user) return;
    setRemovingId(figureId);
    try {
      await removeFromFavorites(user.uid, figureId);
      setFavorites(prev => prev.filter(fav => fav.figureId !== figureId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveScrappedEvent = async (scrappedEventId: string) => {
    if (!user) return;
    try {
      await removeFromScrappedEvents(user.uid, scrappedEventId);
      setScrappedEvents(prev => prev.filter(event => event.id !== scrappedEventId));
    } catch (error) {
      console.error('Error removing scrapped event:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsUpdating(true);
    setUpdateMessage('');
    try {
      await updateProfile(user, { displayName });
      setUpdateMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      setUpdateMessage('Failed to update profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsResending(true);
    setUpdateMessage('');
    try {
      await sendEmailVerification(user);
      setUpdateMessage('A new verification email has been sent to your address.');
    } catch (error) {
      console.error("Error resending verification email:", error);
      setUpdateMessage('Failed to send verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) return;
    setIsTogglingNotifications(true);
    setUpdateMessage('');
    try {
      const newEnabled = !notificationPreferences?.enabled;
      await updateNotificationPreferences(user.uid, { enabled: newEnabled });
      setNotificationPreferences(prev => prev ? { ...prev, enabled: newEnabled } : null);
      setUpdateMessage(newEnabled ? 'Notifications enabled successfully!' : 'Notifications disabled successfully!');
    } catch (error) {
      console.error('Error toggling notifications:', error);
      setUpdateMessage('Failed to update notification settings. Please try again.');
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleTabClick = (tabId: TabType) => {
    // Don't manually update activeTab - let the URL change handle it
    const newPath = tabId === 'account' ? '/profile' : `/profile/${tabId}`;
    router.push(newPath, { scroll: false });

    setOpenAccordionTabs(prevOpenTabs => {
      if (prevOpenTabs.includes(tabId)) {
        return prevOpenTabs.filter(id => id !== tabId);
      } else {
        return [...prevOpenTabs, tabId];
      }
    });
  };

  const handleAccordionClick = (tabId: TabType) => {
    setOpenAccordionTabs(prevOpenTabs => {
      if (prevOpenTabs.includes(tabId)) {
        return prevOpenTabs.filter(id => id !== tabId);
      } else {
        return [...prevOpenTabs, tabId];
      }
    });
  };

  // Notification handlers
  const toDate = (timestamp: Date | Timestamp | string): Date => {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  };

  const handleNotificationClick = async (notificationId: string, figureId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      await markAsRead([notificationId]);
    }
    router.push(`/${figureId}`);
  };

  const handleMarkAsRead = async (notificationIds: string[]) => {
    await markAsRead(notificationIds);
    setSelectedNotifications([]);
  };

  const handleDeleteNotifications = async (notificationIds: string[]) => {
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

  const selectAllNotifications = () => {
    setSelectedNotifications(filteredNotifications.map(n => n.id));
  };

  const clearNotificationSelection = () => {
    setSelectedNotifications([]);
  };

  // Filter notifications based on current filter and search
  const filteredNotifications = notifications.filter(notification => {
    if (notificationFilter === 'unread' && notification.read) return false;
    if (notificationFilter === 'major' && notification.significance !== 'major') return false;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="animate-spin text-key-color" size={24} />
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const joinDate = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'Unknown';

  const navigationItems = [
    { id: 'account' as TabType, label: 'Account Information', icon: Settings },
    { id: 'favorites' as TabType, label: 'Favorites', icon: Star },
    { id: 'scrapped' as TabType, label: 'Scrapped Events', icon: FileText },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
  ];

  const renderAccountSection = () => (
    <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-2xl p-4 md:p-8">
      <h2 className="hidden md:block text-2xl font-bold text-gray-900 dark:text-white mb-6">Account Information</h2>
      <div className="space-y-6">

        {/* Profile Picture Section */}
        <div>
          <label className="block text-gray-900 dark:text-white font-medium mb-3">
            Profile Picture
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative w-24 h-24">
              <Image
                src={imagePreview || user.photoURL || '/images/default-profile.png'}
                alt="Profile Picture"
                fill
                className="rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                sizes="96px"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 bg-key-color text-white rounded-full p-2 hover:bg-pink-700 transition-colors disabled:opacity-50"
                aria-label="Upload new profile picture"
              >
                <Upload size={16} />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            {newProfileImage && (
              <div className="flex gap-3">
                <button onClick={handleImageUpdate} disabled={isUploading} className="bg-key-color text-white font-medium px-6 py-2 rounded-full hover:bg-pink-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2">
                  {isUploading && <Loader2 className="animate-spin" size={16} />}
                  {isUploading ? 'Uploading...' : 'Save Photo'}
                </button>
                <button onClick={cancelImageUpdate} disabled={isUploading} className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium px-6 py-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
        <hr className="my-2" />

        {/* Display Name Section */}
        <div>
          <label className="flex items-center gap-2 text-gray-900 dark:text-white font-medium mb-3">
            <User size={18} /> Display Name
          </label>
          {isEditing ? (
            <div className="space-y-3">
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" className="w-full px-4 py-3 border-2 border-key-color dark:border-pink-700 rounded-full focus:outline-none focus:border-pink-700 transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400" />
              <div className="flex gap-3">
                <button onClick={handleUpdateProfile} disabled={isUpdating} className="bg-key-color text-white font-medium px-6 py-2 rounded-full hover:bg-pink-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center gap-2">
                  {isUpdating && <Loader2 className="animate-spin" size={16} />}
                  {isUpdating ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setIsEditing(false); setDisplayName(user.displayName || ''); }} className="bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium px-6 py-2 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300 text-lg">{user.displayName || 'Not set'}</span>
              <button onClick={() => setIsEditing(true)} className="text-key-color hover:underline text-sm font-medium">Edit</button>
            </div>
          )}
        </div>

        {/* Email Section */}
        <div>
          <label className="flex items-center gap-2 text-gray-900 dark:text-white font-medium mb-3">
            <Mail size={18} /> Email Address
          </label>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-gray-700 dark:text-gray-300 text-lg break-all">{user.email}</span>
              <span className={`text-sm px-2 py-1 rounded-full w-fit mt-1 ${user.emailVerified ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                {user.emailVerified ? '✓ Verified' : '⚠ Not Verified'}
              </span>
            </div>
            {!user.emailVerified &&
              <button onClick={handleResendVerification} disabled={isResending} className="text-key-color hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-wait">
                {isResending ? 'Sending...' : 'Resend Email'}
              </button>
            }
          </div>
        </div>

        {/* Member Since */}
        <div>
          <label className="flex items-center gap-2 text-gray-900 dark:text-white font-medium mb-3">
            <Calendar size={18} /> Member Since
          </label>
          <span className="text-gray-700 dark:text-gray-300 text-lg">{joinDate}</span>
        </div>

        {/* Sign-in Method */}
        {user.providerData.length > 0 && (
          <div>
            <label className="block text-gray-900 dark:text-white font-medium mb-3">Sign-in Method</label>
            <div className="flex flex-wrap gap-2">
              {user.providerData.map((provider, index) => (
                <span key={index} className="bg-key-color text-white text-sm px-3 py-1 rounded-full">
                  {provider.providerId === 'google.com' ? 'Google' : provider.providerId === 'password' ? 'Email & Password' : provider.providerId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account Actions */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        {(() => {
          const hasPasswordProvider = user.providerData.some(
            (provider) => provider.providerId === 'password'
          );

          if (hasPasswordProvider) {
            return (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Need to change your password or delete your account?</p>
                <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-center">
                  <Link
                    href="/change-password"
                    onClick={() => setRouteLoading(true)}
                    className="text-key-color hover:underline text-sm font-medium"
                  >
                    Change Password
                  </Link>
                  <span className="hidden sm:block text-gray-300 dark:text-gray-600">|</span>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-key-color hover:underline text-sm font-medium text-left"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            );
          } else {
            return (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Account Management</p>
                <div className="flex flex-col space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    You signed in with Google. Password management is handled through your Google account.
                  </p>
                  <button
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-red-600 hover:underline text-sm font-medium text-left"
                  >
                    Delete Account
                  </button>
                </div>
              </>
            );
          }
        })()}
      </div>
    </div>
  );


  const renderFavoritesSection = () => (
    <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-2xl p-4 md:p-8">
      <div className="hidden md:flex md:flex-row items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Star className="text-yellow-400 fill-yellow-400" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Favorites</h2>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 mt-2 md:mt-0 rounded-full">{favorites.length} item{favorites.length !== 1 ? 's' : ''}</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={32} />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-12">
          <Heart className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={64} />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No favorites yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Start favoriting figures to see them here</p>
          <Link href="/all-figures" className="inline-block bg-key-color text-white font-medium py-3 px-6 rounded-full hover:bg-pink-700 transition-colors">
            Explore Figures
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {favorites.map((favorite) => (
            <div key={favorite.figureId} className="flex items-center gap-3 p-4 bg-white dark:bg-[#2c2c2e] rounded-xl hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
                {favorite.profilePic ? (
                  <Image src={favorite.profilePic} alt={favorite.figureName} width={56} height={56} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <User size={24} className="text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="flex-grow min-w-0">
                <Link href={`/${favorite.figureId}`}>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate hover:text-key-color dark:hover:text-pink-400 transition-colors">{favorite.figureName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{favorite.figureNameKr}</p>
                </Link>
              </div>
              <button onClick={() => handleRemoveFavorite(favorite.figureId)} disabled={removingId === favorite.figureId} className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0" title="Remove from favorites">
                {removingId === favorite.figureId ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderScrappedSection = () => {
    if (isLoading) {
      return (
        <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-2xl p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={32} />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading scrapped events and sources...</span>
          </div>
        </div>
      );
    }
    return <ProfileScrappedSectionEnhanced isFullView={true} isLoading={isLoading} articles={articles} figureData={figureData} scrappedEvents={scrappedEvents} onRemove={handleRemoveScrappedEvent} />;
  };

  const renderNotificationsSection = () => (
    <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-2xl p-4 md:p-8">
      <div className="hidden md:flex md:flex-row items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="text-key-color" size={24} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-3 py-1 mt-2 md:mt-0 rounded-full">
          {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} • {notifications.length} total
        </span>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Settings</h3>
        <div className="flex items-center justify-between">
          <div className="flex flex-col flex-1">
            <span className="text-gray-900 dark:text-white font-medium mb-1">
              Enable Notifications
            </span>
            <span className="text-gray-600 dark:text-gray-400 text-sm">
              Get notified when your favorite figures have new updates
            </span>
            <span className={`text-sm px-3 py-1 rounded-full w-fit mt-2 ${notificationPreferences?.enabled ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'}`}>
              {notificationPreferences?.enabled ? '✓ Enabled' : 'Disabled'}
            </span>
          </div>
          <button
            onClick={handleToggleNotifications}
            disabled={isTogglingNotifications}
            className="bg-key-color text-white font-medium px-6 py-2 rounded-full hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-wait ml-4"
          >
            {isTogglingNotifications ? 'Updating...' : notificationPreferences?.enabled ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>

      {notificationsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={32} />
        </div>
      ) : (
        <>
          {/* Search and Filters */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <select
                  value={notificationFilter}
                  onChange={(e) => setNotificationFilter(e.target.value as 'all' | 'unread' | 'major')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-key-color focus:border-transparent bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white"
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
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedNotifications.length > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedNotifications.length} selected
                      </span>
                      <button
                        onClick={() => handleMarkAsRead(selectedNotifications)}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Check size={14} />
                        Mark as read
                      </button>
                      <button
                        onClick={() => handleDeleteNotifications(selectedNotifications)}
                        className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 hover:underline"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <button
                        onClick={clearNotificationSelection}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Clear selection
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={selectAllNotifications}
                        className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                      >
                        Select all
                      </button>
                      {unreadCount > 0 && notificationFilter !== 'unread' && (
                        <button
                          onClick={markAllAsRead}
                          className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <CheckCheck size={14} />
                          Mark all as read
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {filteredNotifications.length} of {notifications.length}
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="space-y-4">
            {filteredNotifications.length === 0 ? (
              <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <Bell className="mx-auto mb-4 text-gray-300 dark:text-gray-600" size={48} />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm || notificationFilter !== 'all' ? 'No notifications found' : 'No notifications yet'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm || notificationFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'You\'ll see notifications here when your favorites have updates'
                  }
                </p>
                {(searchTerm || notificationFilter !== 'all') && (
                  <button
                    onClick={() => { setSearchTerm(''); setNotificationFilter('all'); }}
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
                  className={`bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow ${
                    !notification.read ? 'ring-2 ring-blue-100 dark:ring-blue-900' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => toggleNotificationSelection(notification.id)}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600 text-key-color focus:ring-key-color"
                    />
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                      <User size={24} className="text-gray-400 dark:text-gray-500 w-full h-full p-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="cursor-pointer"
                        onClick={() => handleNotificationClick(notification.id, notification.figureId)}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {notification.figureName}
                          </h3>
                          {notification.significance === 'major' && (
                            <Star size={16} className="text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          )}
                          {!notification.read && (
                            <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <h4 className="text-base font-medium text-gray-800 dark:text-gray-200 mb-2">
                          {notification.eventTitle}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {notification.eventSummary}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatTime(toDate(notification.createdAt))}</span>
                          </div>
                          <span className="capitalize bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                            {notification.significance}
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                            {notification.eventCategory}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && (
                        <button
                          onClick={() => handleMarkAsRead([notification.id])}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotifications([notification.id])}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
        </>
      )}
    </div>
  );

  return (
    <>
      <LoadingOverlay isVisible={isRouteLoading} message="Loading..." />
      <DeleteAccountDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
      <div className="min-h-screen bg-white dark:bg-black">
        <main className="w-[95%] md:w-[80%] mx-auto px-3 md:px-4 py-6 md:py-8 lg:py-16">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-key-color mb-2 md:mb-4">Your Profile</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">Manage your account information and favorites</p>
          </div>
          {updateMessage && (
            <div className={`mb-4 md:mb-6 p-4 rounded-lg max-w-4xl mx-auto ${updateMessage.includes('successfully') || updateMessage.includes('sent') ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
              <p className="text-sm">{updateMessage}</p>
            </div>
          )}

          {/* IMPROVED: Mobile accordion view with better spacing and scrollable content */}
          <div className="block lg:hidden space-y-3">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = openAccordionTabs.includes(item.id);

              return (
                <div key={item.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => handleAccordionClick(item.id)}
                    className="w-full flex items-center justify-between p-4 md:p-5 text-left bg-gray-50 dark:bg-[#1d1d1f] hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} className="text-key-color dark:text-pink-400" />
                      <span className="font-medium text-gray-900 dark:text-white text-base">{item.label}</span>
                    </div>
                    <ChevronDown
                      size={20}
                      className={`text-gray-500 dark:text-gray-400 transform transition-transform duration-300 ${isActive ? 'rotate-180' : ''
                        }`}
                    />
                  </button>
                  {/* FIXED: Proper height management and scrollable content */}
                  <div
                    className={`transition-all duration-500 ease-in-out ${isActive ? 'max-h-screen' : 'max-h-0'
                      } overflow-hidden`}
                  >
                    <div className="border-t border-gray-200 dark:border-gray-700">
                      {/* IMPROVED: Add proper height constraints and scrolling for long content */}
                      <div className={`${isActive ? 'max-h-[80vh] overflow-y-auto' : ''} p-3 md:p-4`}>
                        {item.id === 'account' && renderAccountSection()}
                        {item.id === 'favorites' && renderFavoritesSection()}
                        {item.id === 'scrapped' && renderScrappedSection()}
                        {item.id === 'notifications' && renderNotificationsSection()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="hidden lg:block w-64 flex-shrink-0">
              <nav className="lg:sticky lg:top-20 space-y-4">
                {/* Navigation Menu */}
                <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-3">Navigation</h3>
                  <ul className="space-y-1">
                    {navigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <li key={item.id}>
                          <button onClick={() => handleTabClick(item.id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${isActive ? 'bg-key-color text-white shadow-md' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
                            <Icon size={18} />
                            <span className="font-medium">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 px-3">Quick Stats</h4>
                    <div className="space-y-2 px-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Favorites</span>
                        <span className="font-medium text-gray-900 dark:text-white">{favorites.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Scrapped Events</span>
                        <span className="font-medium text-gray-900 dark:text-white">{scrappedEvents.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Member Since</span>
                        <span className="font-medium text-gray-900 dark:text-white">{joinDate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ad Below Navigation */}
                <div className="flex justify-center">
                  <AdSidebar
                    adKey="b6fd012836d0efc4358182fcf429e9f4"
                    width={160}
                    height={300}
                  />
                </div>
              </nav>
            </div>

            {/* Main Content Area */}
            <div className="hidden lg:block flex-1">
              <div className={activeTab === 'account' ? 'block' : 'hidden'}>
                {renderAccountSection()}
              </div>
              <div className={activeTab === 'favorites' ? 'block' : 'hidden'}>
                {renderFavoritesSection()}
              </div>
              <div className={activeTab === 'scrapped' ? 'block' : 'hidden'}>
                {renderScrappedSection()}
              </div>
              <div className={activeTab === 'notifications' ? 'block' : 'hidden'}>
                {renderNotificationsSection()}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
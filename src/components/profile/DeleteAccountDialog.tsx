'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { deleteUserData } from '@/lib/user-service';
import { AlertTriangle, Loader2, X } from 'lucide-react';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const { user, deleteAccount } = useAuth();
  const router = useRouter();

  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!user) return;

    setError('');

    // Validate confirmation text
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);

    function isErrorMessage(error: unknown): error is { message: string } {
      if (typeof error !== 'object' || error === null) {
        return false;
      }
      return 'message' in error && typeof (error as { message: unknown }).message === 'string';
    }

    try {
      // Delete user data from Firestore first
      await deleteUserData(user.uid, user.email!);

      // Delete Firebase Auth account (no password needed)
      await deleteAccount();

      // Redirect to homepage
      router.push('/');
    } catch (err: unknown) {
      console.error('Error deleting account:', err);

      let errorMessage = 'Failed to delete account. Please try again.';

      if (err instanceof Error) {
        // 1. Standard JavaScript Error object
        errorMessage = err.message;
      } else if (isErrorMessage(err)) {
        // 2. Custom object with a message property
        errorMessage = err.message;
      }

      // Set the error state with the safely extracted message
      setError(errorMessage);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1d1d1f] rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Delete Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            disabled={isDeleting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-800 dark:text-red-300 text-sm font-medium mb-2">
            This action cannot be undone!
          </p>
          <p className="text-red-700 dark:text-red-400 text-sm">
            Deleting your account will permanently remove:
          </p>
          <ul className="list-disc list-inside text-red-700 dark:text-red-400 text-sm mt-2 space-y-1">
            <li>Your profile and account information</li>
            <li>All your favorite figures</li>
            <li>All your scrapped events</li>
            <li>Your notification preferences</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Confirmation input */}
        <div className="mb-4">
          <label className="block text-gray-900 dark:text-white font-medium mb-2 text-sm">
            Type <span className="font-bold">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-red-500 transition-colors bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            disabled={isDeleting}
          />
        </div>


        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 px-6 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting || confirmText !== 'DELETE'}
            className="flex-1 bg-red-600 text-white font-medium py-3 px-6 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 className="animate-spin" size={20} />}
            {isDeleting ? 'Deleting...' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

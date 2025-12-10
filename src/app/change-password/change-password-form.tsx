'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Eye, EyeOff, Lock, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export default function ChangePasswordForm() {
  const { user, changePassword } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Redirect if not logged in
  if (!user) {
    router.push('/login');
    return null;
  }

  // Check if user signed in with password (not Google)
  const hasPasswordProvider = user.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  if (!hasPasswordProvider) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-24 px-4">
        <div className="max-w-md w-full mx-auto text-center">
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-8">
            <Lock className="mx-auto mb-4 text-yellow-600 dark:text-yellow-400" size={48} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Password Change Not Available
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You signed in using Google. Password management is handled through your Google account.
            </p>
            <Link
              href="/profile"
              className="inline-block bg-key-color text-white font-medium py-3 px-6 rounded-full hover:bg-pink-700 transition-colors"
            >
              Back to Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate inputs
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    const passwordError = validatePassword(formData.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setIsLoading(true);

    // Helper function to check if an object has a 'message' property
    function isErrorMessage(error: unknown): error is { message: string } {
      // 1. Check if it's an object and not null
      if (typeof error !== 'object' || error === null) {
        return false;
      }

      // 2. Check if the 'message' property exists and is a string
      return 'message' in error && typeof (error as { message: unknown }).message === 'string';
    }

    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Redirect to profile after 2 seconds
      setTimeout(() => {
        router.push('/profile');
      }, 2000);
    } catch (err: unknown) {
      let errorMessage = 'Failed to change password. Please try again.';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (isErrorMessage(err)) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-black pt-24 px-4">
        <div className="max-w-md w-full mx-auto text-center">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-2xl p-8">
            <CheckCircle className="mx-auto mb-4 text-green-600 dark:text-green-400" size={48} />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Password Changed Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been updated. Redirecting to your profile...
            </p>
            <Loader2 className="animate-spin mx-auto text-key-color" size={24} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pt-16 pb-12 px-4">
      <div className="max-w-md w-full mx-auto">
        {/* Back button */}
        <Link
          href="/profile"
          className="inline-flex items-center gap-2 text-key-color hover:text-pink-700 dark:hover:text-pink-400 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Profile</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-key-color/10 rounded-full mb-4">
            <Lock className="text-key-color" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Change Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Update your account password
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Current Password */}
          <div>
            <label
              htmlFor="currentPassword"
              className="block text-gray-900 dark:text-white font-medium mb-2"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="currentPassword"
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Enter your current password"
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-pink-700 rounded-full focus:outline-none focus:border-pink-700 transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="newPassword"
              className="block text-gray-900 dark:text-white font-medium mb-2"
            >
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter your new password"
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-pink-700 rounded-full focus:outline-none focus:border-pink-700 transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Must be at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-gray-900 dark:text-white font-medium mb-2"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your new password"
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-pink-700 rounded-full focus:outline-none focus:border-pink-700 transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-key-color text-white font-medium py-3 px-6 rounded-full hover:bg-pink-700 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {isLoading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        {/* Help text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            If you forgot your current password, please sign out and use the password reset option on the login page.
          </p>
        </div>
      </div>
    </div>
  );
}

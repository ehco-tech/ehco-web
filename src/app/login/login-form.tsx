// src/app/login/login-form.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLoading } from '@/context/LoadingContext'; // 1. Import useLoading
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth } from '@/lib/config/firebase';

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const { signIn, signInWithGoogle, user } = useAuth();
  const { showLoading } = useLoading(); // 2. Get the showLoading function from the context
  const router = useRouter();

  // Check for signup success message
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('signup') === 'success') {
      setSuccessMessage('Account created successfully! Please sign in with your credentials.');
    }
  }, []);

  // Load remembered email on component mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  // Auto-focus email input on component mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowResendVerification(false);

    try {
      // Pass stayLoggedIn preference to signIn
      await signIn(formData.email, formData.password, stayLoggedIn);

      // Handle remember me functionality
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const redirectPath = sessionStorage.getItem('redirectPath');
      sessionStorage.removeItem('redirectPath'); // Clean up after use
      router.push(redirectPath || '/'); // Redirect to saved path or homepage
    } catch (err) { // 1. Corrected 'error: any'
      if (err instanceof Error) {
        const errorMessage = err.message || 'Failed to sign in';
        setError(errorMessage);

        // Show resend verification option if error is about email verification
        if (errorMessage.includes('verify your email')) {
          setShowResendVerification(true);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingEmail(true);
    setError('');
    setSuccessMessage('');

    try {
      // Sign in temporarily to get the user object (won't actually log them in due to verification check)
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);

      // Send verification email
      await sendEmailVerification(userCredential.user);

      setSuccessMessage('Verification email sent! Please check your inbox.');
      setShowResendVerification(false);
    } catch (err) {
      if (err instanceof Error) {
        setError('Failed to resend verification email. Please try again.');
      }
    } finally {
      setResendingEmail(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Pass stayLoggedIn preference to Google sign-in
      await signInWithGoogle(stayLoggedIn);

      const redirectPath = sessionStorage.getItem('redirectPath');
      sessionStorage.removeItem('redirectPath'); // Clean up after use
      router.push(redirectPath || '/'); // Redirect to saved path or homepage
    } catch (err) { // 2. Corrected 'error: any'
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign in with Google');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // 3. Create a handler to show loading before navigation
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault(); // Prevent the link from navigating immediately
    showLoading('Loading page...'); // Show the global loading overlay
    router.push(path); // Programmatically navigate
  };


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <main className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-key-color mb-4">Welcome</h1>
          <p className="text-gray-600 dark:text-gray-400">Sign in to your EHCO account</p>
        </div>

        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            {showResendVerification && (
              <button
                onClick={handleResendVerification}
                disabled={resendingEmail}
                className="mt-3 flex items-center gap-2 text-sm text-key-color dark:text-key-color-dark hover:underline disabled:opacity-50"
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail size={16} />
                    Resend verification email
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-gray-900 dark:text-white font-medium mb-2">
              Email Address
            </label>
            <input
              ref={emailInputRef}
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 border-2 border-key-color dark:border-key-color-dark rounded-full focus:outline-none focus:border-key-color transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-gray-900 dark:text-white font-medium mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-key-color-dark rounded-full focus:outline-none focus:border-key-color transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-key-color border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-key-color bg-white dark:bg-[#1d1d1f]"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700 dark:text-gray-300">
                Remember my email address
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="stayLoggedIn"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
                className="w-4 h-4 text-key-color border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-key-color bg-white dark:bg-[#1d1d1f]"
              />
              <label htmlFor="stayLoggedIn" className="text-sm text-gray-700 dark:text-gray-300">
                Keep me signed in
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-key-color text-white font-medium py-3 rounded-full hover:bg-key-color-dark transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">Or</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white dark:bg-[#1d1d1f] border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          {/* 3. Corrected unescaped entity */}
          Don&apos;t have an account?{' '}
          {/* 4. Update the Sign Up link */}
          <Link
            href="/signup"
            onClick={(e) => handleLinkClick(e, '/signup')}
            className="text-key-color font-medium hover:underline"
          >
            Sign up here
          </Link>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          {/* 4. Update the Forgot Password link */}
          <Link
            href="/forgot-password"
            onClick={(e) => handleLinkClick(e, '/forgot-password')}
            className="text-key-color hover:underline"
          >
            Forgot your password?
          </Link >
        </div>
      </main>
    </div>
  );
}
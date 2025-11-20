// src/app/signup/enhanced-signup-form.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Check, X, Upload, User, Star, Mail, CheckCircle2, XCircle, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createUserProfile } from '@/lib/user-service';
import { getTopFigures, PublicFigure } from '@/lib/figures-service';
// --- UPDATED: Simplified imports for email verification flow ---
import { signOut, updateProfile, sendEmailVerification, fetchSignInMethodsForEmail, AuthError } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const passwordRequirements: PasswordRequirement[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /\d/.test(p) },
];

// --- UPDATED: Simplified steps ---
type SignupStep = 'details' | 'creating' | 'complete';
type AvailabilityStatus = 'idle' | 'loading' | 'available' | 'taken' | 'error';

interface SignupData {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
  favoriteFigure: string;
  phoneNumber: string; // Kept as an optional data field
  privacyPolicyAccepted: boolean;
}

export default function EnhancedSignupForm() {
  // Main state
  const [step, setStep] = useState<SignupStep>('details');
  const [formData, setFormData] = useState<SignupData>({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    favoriteFigure: '',
    phoneNumber: '',
    privacyPolicyAccepted: false
  });

  // UI state
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [popularFigures, setPopularFigures] = useState<PublicFigure[]>([]);
  const [figuresLoading, setFiguresLoading] = useState(true);

  const [emailAvailability, setEmailAvailability] = useState<AvailabilityStatus>('idle');
  const [nicknameAvailability, setNicknameAvailability] = useState<AvailabilityStatus>('idle');
  const [nicknameMessage, setNicknameMessage] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Scroll to the top of the page when the step changes to 'creating' or 'complete'
    if (step === 'creating' || step === 'complete') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  // Load popular figures on component mount
  useEffect(() => {
    const loadFigures = async () => {
      try {
        const figures = await getTopFigures(15);
        setPopularFigures(figures);
      } catch (error) {
        console.error('Failed to load figures:', error);
      } finally {
        setFiguresLoading(false);
      }
    };
    loadFigures();
  }, []);

  // 1. Made debounce function type-safe with generics
  const debounce = <A extends unknown[]>(
    func: (...args: A) => unknown,
    delay: number
  ) => {
    let timeout: NodeJS.Timeout;
    return (...args: A): void => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const checkAvailability = async (type: 'email' | 'nickname', value: string) => {
    if (!value) return;

    if (type === 'email') setEmailAvailability('loading');
    if (type === 'nickname') setNicknameAvailability('loading');

    try {
      const functions = getFunctions();
      const checkAvailabilityFn = httpsCallable(functions, 'checkAvailability');
      const result = await checkAvailabilityFn({ type, value });

      const data = result.data as { available: boolean, message: string };

      if (type === 'email') {
        setEmailAvailability(data.available ? 'available' : 'taken');
        setEmailMessage(data.message); // Use setEmailMessage
      }
      if (type === 'nickname') {
        setNicknameAvailability(data.available ? 'available' : 'taken');
        setNicknameMessage(data.message); // Use setNicknameMessage
      }

    } catch (error) {
      console.error(`Error checking ${type} availability:`, error);
      if (type === 'email') {
        setEmailAvailability('error');
        setEmailMessage(`Could not check email.`); // Use setEmailMessage
      }
      if (type === 'nickname') {
        setNicknameAvailability('error');
        setNicknameMessage(`Could not check nickname.`); // Use setNicknameMessage
      }
    }
  };

  // Form validation (remains the same)
  const validateDetailsForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.nickname) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    const allRequirementsMet = passwordRequirements.every(req => req.test(formData.password));
    if (!allRequirementsMet) {
      setError('Password does not meet all requirements');
      return false;
    }
    if (!formData.privacyPolicyAccepted) {
      setError('You must accept the Privacy Policy to continue');
      return false;
    }
    return true;
  };

  // --- NEW: Combined handler for creating account and sending verification email ---
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateDetailsForm()) {
      return;
    }

    setStep('creating');
    setIsLoading(true);

    try {
      // Step 1: Create the user with email and password
      await signUp(formData.email, formData.password, formData.nickname);

      const createdUser = auth.currentUser;
      if (!createdUser) {
        throw new Error('Failed to retrieve created user account.');
      }

      // Step 2: Send the verification email
      await sendEmailVerification(createdUser);
      console.log('✅ Verification email sent.');

      // Step 3: Upload profile image if provided
      let profilePictureUrl = '';
      if (profileImage) {
        const imageRef = ref(storage, `profile-pictures/${createdUser.uid}/${profileImage.name}`);
        const snapshot = await uploadBytes(imageRef, profileImage);
        profilePictureUrl = await getDownloadURL(snapshot.ref);
        console.log('✅ Profile image uploaded:', profilePictureUrl);

        await updateProfile(createdUser, { photoURL: profilePictureUrl });
      }

      // Step 4: Create the user profile in Firestore
      await createUserProfile(createdUser, {
        nickname: formData.nickname,
        favoriteFigure: formData.favoriteFigure,
        phoneNumber: formData.phoneNumber,
        phoneVerified: false,
        emailVerified: false, // User needs to click link to make this true
        profilePicture: profilePictureUrl,
      });

      console.log('✅ User profile created.');

      // Step 5: Sign out the user immediately so they can't access protected content until verification
      await signOut(auth);
      console.log('✅ User signed out. Redirecting to email verification step.');

      // Step 6: Go to the verification step
      setStep('complete');
    } catch (err) {
      console.error('❌ Error during account creation:', err);

      let errorMessage = 'Failed to create account. Please try again.';
      if (err instanceof Error) {
        if ((err as AuthError).code === 'auth/email-already-in-use') {
          errorMessage = 'This email is already registered. Please use a different email or sign in.';
        } else if ((err as AuthError).code === 'auth/weak-password') {
          errorMessage = 'Password is too weak. Please choose a stronger password.';
        } else if ((err as AuthError).code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address. Please check and try again.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setStep('details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to sign in with Google');
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData({ ...formData, [name]: target.checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    if (name === 'email') {
      setEmailAvailability('idle');
      debouncedCheckAvailability('email', value);
    }
    if (name === 'nickname') {
      setNicknameAvailability('idle');
      debouncedCheckAvailability('nickname', value);
    }
  };

  const debouncedCheckAvailability = useRef(
    debounce((type: 'email' | 'nickname', value: string) => {
      checkAvailability(type, value);
    }, 500)
  ).current;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderFeedbackIcon = (status: AvailabilityStatus) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="animate-spin text-gray-400 dark:text-gray-500" size={20} />;
      case 'available':
        return <CheckCircle2 className="text-green-600 dark:text-green-400" size={20} />;
      case 'taken':
        return <XCircle className="text-key-color dark:text-key-color-dark" size={20} />;
      case 'error':
        return <XCircle className="text-key-color dark:text-key-color-dark" size={20} />;
      default:
        return null;
    }
  };

  // --- UPDATED: Creating Screen ---
  if (step === 'creating') {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-key-color-dark mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Creating Your Account</h2>
          <p className="text-gray-600 dark:text-gray-400">Setting up your profile and sending verification email...</p>
        </div>
      </div>
    );
  }

  // --- UPDATED: Email Verification Screen ---
  if (step === 'complete') {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <main className="max-w-md mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Check Your Email</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;ve sent a verification link to <span className="font-semibold text-gray-900 dark:text-white">{formData.email}</span>
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-[#1d1d1f] rounded-lg p-6 mb-6 border border-gray-200 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Next Steps:</h3>
            <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>Check your email inbox (and spam folder)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>Click the verification link in the email</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Return here and sign in with your credentials</span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-semibold">Important:</span> You must verify your email before you can sign in.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/login"
              className="block w-full bg-key-color text-white font-medium py-3 rounded-full hover:bg-key-color-dark transition-colors text-center"
            >
              Go to Sign In
            </Link>

            <button
              onClick={() => router.push('/')}
              className="w-full border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium py-3 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Return to Home
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Didn&apos;t receive the email?{' '}
            <button className="text-key-color hover:underline">
              Resend verification email
            </button>
          </div>
        </main>
      </div>
    );
  }

  // --- Main Signup Form (step === 'details') ---
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <main className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-key-color mb-4">Create Your Account</h1>
          <p className="text-gray-600 dark:text-gray-400">Join EHCO and start exploring verified information</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-key-color-dark rounded-lg">
            <p className="text-key-color dark:text-key-color-dark text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleCreateAccount} className="space-y-6">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-key-color">
                {profileImagePreview ? (
                  <img src={profileImagePreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-key-color text-white p-2 rounded-full hover:bg-key-color-dark transition-colors"
              >
                <Upload size={16} />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Optional profile picture</p>
          </div>

          {/* Nickname */}
          <div>
            <label htmlFor="nickname" className="block text-gray-900 dark:text-white font-medium mb-2">
              Nickname *
            </label>
            <div className="relative">
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="Choose your display name"
                required
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-key-color rounded-full focus:outline-none focus:border-key-color-dark transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {renderFeedbackIcon(nicknameAvailability)}
              </div>
            </div>
            {['available', 'taken', 'error'].includes(nicknameAvailability) && (
              <p className={`mt-2 text-sm ${nicknameAvailability === 'available' ? 'text-green-600 dark:text-green-400' : 'text-key-color dark:text-key-color-dark'}`}>
                {nicknameMessage}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-gray-900 dark:text-white font-medium mb-2">
              Email Address *
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-key-color rounded-full focus:outline-none focus:border-key-color-dark transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                {renderFeedbackIcon(emailAvailability)}
              </div>
            </div>
            {['available', 'taken', 'error'].includes(emailAvailability) && (
              <p className={`mt-2 text-sm ${emailAvailability === 'available' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {emailMessage}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-gray-900 dark:text-white font-medium mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                placeholder="Create a secure password"
                required
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-key-color rounded-full focus:outline-none focus:border-key-color-dark transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {(passwordFocused || formData.password) && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-[#1d1d1f] rounded-lg border border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Password requirements:</p>
                <div className="space-y-1">
                  {passwordRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {req.test(formData.password) ? (
                        <Check size={16} className="text-green-600 dark:text-green-400" />
                      ) : (
                        <X size={16} className="text-gray-400 dark:text-gray-500" />
                      )}
                      <span className={`text-sm ${req.test(formData.password) ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-gray-900 dark:text-white font-medium mb-2">
              Confirm Password *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                className="w-full px-4 py-3 pr-12 border-2 border-key-color dark:border-key-color rounded-full focus:outline-none focus:border-key-color-dark transition-colors bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">Passwords do not match</p>
            )}
          </div>

          {/* Favorite Figure */}
          {/* <div>
            <label htmlFor="favoriteFigure" className="block text-gray-900 dark:text-white font-medium mb-2">
              <div className="flex items-center gap-2">
                <Star size={18} />
                Favorite K-Figure (Optional)
              </div>
            </label>
            <select
              id="favoriteFigure"
              name="favoriteFigure"
              value={formData.favoriteFigure}
              onChange={handleChange}
              disabled={figuresLoading}
              className="w-full px-4 py-3 border-2 border-key-color dark:border-pink-700 rounded-full focus:outline-none focus:border-pink-700 transition-colors appearance-none cursor-pointer disabled:opacity-50 bg-white dark:bg-[#1d1d1f] text-gray-900 dark:text-white"
            >
              <option value="">
                {figuresLoading ? 'Loading figures...' : 'Select your favorite (optional)'}
              </option>
              {popularFigures.map((figure) => (
                <option key={figure.id} value={figure.id}>
                  {figure.name}
                  {figure.name_kr && ` (${figure.name_kr})`}
                </option>
              ))}
            </select>
          </div> */}

          {/* Privacy Policy Consent */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacyPolicyAccepted"
                name="privacyPolicyAccepted"
                checked={formData.privacyPolicyAccepted}
                onChange={handleChange}
                required
                className="mt-1 w-4 h-4 text-key-color border-2 border-key-color dark:border-pink-700 rounded focus:ring-key-color bg-white dark:bg-[#1d1d1f]"
              />
              <label htmlFor="privacyPolicyAccepted" className="text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <Link href="/privacy-policy" className="text-key-color hover:underline" target="_blank">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link href="/terms-of-service" className="text-key-color hover:underline" target="_blank">
                  Terms of Service
                </Link>
                {' '}<span className="text-red-500">*</span>
              </label>
            </div>
          </div>

          {/* --- UPDATED: Submit button text --- */}
          <button
            type="submit"
            disabled={isLoading || !formData.privacyPolicyAccepted}
            className="w-full bg-key-color text-white font-medium py-3 rounded-full hover:bg-key-color-dark transition-colors disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="animate-spin" size={20} />}
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="my-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-black text-gray-500 dark:text-gray-400">Or continue with</span>
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
          Already have an account?{' '}
          <Link href="/login" className="text-key-color font-medium hover:underline">
            Log in here
          </Link>
        </div>
      </main>
    </div>
  );
}
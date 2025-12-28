// src/context/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  deleteUser
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createUserProfile } from '@/lib/user-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, stayLoggedIn?: boolean) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  signInWithGoogle: (stayLoggedIn?: boolean) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string, stayLoggedIn: boolean = false) => {
    try {
      // Set persistence based on user preference
      const persistence = stayLoggedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        // Sign out the user immediately
        await firebaseSignOut(auth);
        throw new Error('Please verify your email before signing in. Check your inbox for the verification link.');
      }
    } catch (error: unknown) {
      // Map Firebase errors to user-friendly messages
      const errorCode = (error as { code?: string; message?: string }).code;
      let errorMessage = 'Failed to sign in. Please try again.';

      switch (errorCode) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          errorMessage = 'Invalid email or password. If you signed up with Google, please use the "Continue with Google" button.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled. Please contact support.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          // For any other errors, use the original message if it's not a Firebase error code
          if (!errorCode || !errorCode.startsWith('auth/')) {
            errorMessage = (error as { message?: string }).message || errorMessage;
          }
      }

      throw new Error(errorMessage);
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential; // <-- ADD THIS LINE
  };

  const signInWithGoogle = async (stayLoggedIn: boolean = false) => {
    try {
      // Set persistence based on user preference
      const persistence = stayLoggedIn ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if this is a new user
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      const isNewUser = !userDoc.exists();

      if (isNewUser) {
        // Create user profile for new Google users with emailVerified set to true
        // (Google accounts are already verified by Google)
        await createUserProfile(result.user, {
          nickname: result.user.displayName || 'User',
          favoriteFigure: '',
          phoneNumber: '',
          phoneVerified: false, // They still need to verify phone
          emailVerified: true, // Google accounts are pre-verified
          profilePicture: result.user.photoURL || '',
        });
      }

      return { isNewUser };
    } catch (error: unknown) {
      // Map Firebase errors to user-friendly messages
      const errorCode = (error as { code?: string; message?: string }).code;
      let errorMessage = 'Failed to sign in with Google. Please try again.';

      switch (errorCode) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Pop-up was blocked by your browser. Please enable pop-ups and try again.';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Sign-in was cancelled. Please try again.';
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = 'An account already exists with this email using a different sign-in method.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          // For any other errors, use the original message if it's not a Firebase error code
          if (!errorCode || !errorCode.startsWith('auth/')) {
            errorMessage = (error as { message?: string }).message || errorMessage;
          }
      }

      throw new Error(errorMessage);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user || !user.email) {
      throw new Error('No user is currently signed in.');
    }

    try {
      // Re-authenticate the user with their current password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update to new password
      await updatePassword(user, newPassword);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string; message?: string }).code;
      let errorMessage = 'Failed to change password. Please try again.';

      switch (errorCode) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Current password is incorrect.';
          break;
        case 'auth/weak-password':
          errorMessage = 'New password is too weak. Please choose a stronger password.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'For security reasons, please sign out and sign in again before changing your password.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          if (!errorCode || !errorCode.startsWith('auth/')) {
            errorMessage = (error as { message?: string }).message || errorMessage;
          }
      }

      throw new Error(errorMessage);
    }
  };

  const deleteAccount = async (password?: string) => {
    if (!user || !user.email) {
      throw new Error('No user is currently signed in.');
    }

    try {
      // Check if user has password provider
      const hasPasswordProvider = user.providerData.some(
        (provider) => provider.providerId === 'password'
      );

      // Re-authenticate before deletion (only for password users)
      if (hasPasswordProvider && password) {
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }

      // Delete the user account
      // For Google users, this will work if they recently signed in
      // If not, Firebase will throw 'auth/requires-recent-login'
      await deleteUser(user);
    } catch (error: unknown) {
      const errorCode = (error as { code?: string; message?: string }).code;
      let errorMessage = 'Failed to delete account. Please try again.';

      switch (errorCode) {
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'For security reasons, please sign out and sign in again before deleting your account.';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Network error. Please check your connection and try again.';
          break;
        default:
          if (!errorCode || !errorCode.startsWith('auth/')) {
            errorMessage = (error as { message?: string }).message || errorMessage;
          }
      }

      throw new Error(errorMessage);
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    changePassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
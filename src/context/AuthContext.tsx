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
  browserLocalPersistence
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createUserProfile } from '@/lib/user-service';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<UserCredential>;
  signInWithGoogle: () => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Error setting persistence:", error);
      });
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
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

  const signInWithGoogle = async () => {
    try {
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut
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
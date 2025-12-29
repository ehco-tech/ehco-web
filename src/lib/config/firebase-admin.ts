// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminDbInstance: Firestore | null = null;

// Initialize Firebase Admin SDK (lazy initialization)
const initializeFirebaseAdmin = (): App => {
  if (getApps().length === 0) {
    try {
      // Parse the service account key from environment variable
      const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

      if (!serviceAccountKey) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
      }

      const serviceAccount = JSON.parse(serviceAccountKey);

      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });

      console.log('Firebase Admin SDK initialized successfully');
      return adminApp;
    } catch (error) {
      console.error('Error initializing Firebase Admin SDK:', error);
      throw error;
    }
  }

  return getApps()[0];
};

/**
 * Get the Admin Firestore instance (lazy initialization)
 * Only initializes the Admin SDK when first called
 */
export const getAdminDb = (): Firestore => {
  if (!adminDbInstance) {
    const app = initializeFirebaseAdmin();
    adminDbInstance = getFirestore(app);
  }
  return adminDbInstance;
};

/**
 * Get the Admin App instance (lazy initialization)
 * Only initializes the Admin SDK when first called
 */
export const getAdminApp = (): App => {
  if (!adminApp) {
    adminApp = initializeFirebaseAdmin();
  }
  return adminApp;
};

// Firebase Configuration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check if Firebase config is valid
const isConfigValid = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

// Initialize Firebase (only on client side with valid config)
let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (typeof window !== 'undefined' && isConfigValid) {
  // Only initialize on client side where environment variables are available
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
}

// Export instances (will be undefined during SSR/build, but defined on client)
// @ts-ignore - These are initialized on client side
export const auth: Auth = authInstance;
// @ts-ignore
export const db: Firestore = dbInstance;
// @ts-ignore  
export const storage: FirebaseStorage = storageInstance;

// Initialize Analytics (only in browser)
export const analytics: Promise<Analytics | null> | null = 
  typeof window !== 'undefined' && app!
    ? isSupported().then(yes => yes ? getAnalytics(app!) : null)
    : null;

// @ts-ignore
export default app;

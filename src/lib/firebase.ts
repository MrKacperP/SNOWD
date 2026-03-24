// Firebase Configuration
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAnalytics, Analytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const isPlaceholderValue = (value?: string) => {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("your_") ||
    normalized.startsWith("example") ||
    normalized.includes("your_app_id") ||
    normalized.includes("your_project_id") ||
    normalized.includes("your_measurement_id") ||
    normalized.includes("your_api_key") ||
    normalized.includes("your_auth_domain")
  );
};

// Check if Firebase config is valid
const hasRequiredConfig = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

export const isFirebaseConfigured = !!(
  hasRequiredConfig &&
  !isPlaceholderValue(firebaseConfig.apiKey) &&
  !isPlaceholderValue(firebaseConfig.authDomain) &&
  !isPlaceholderValue(firebaseConfig.projectId) &&
  !isPlaceholderValue(firebaseConfig.appId)
);

export const canUseAnalytics = !!(
  isFirebaseConfigured &&
  firebaseConfig.measurementId &&
  !isPlaceholderValue(firebaseConfig.measurementId)
);

export const canWriteAdminNotifications = isFirebaseConfigured;

// Initialize Firebase (only on client side with valid config)
let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (typeof window !== 'undefined' && isFirebaseConfigured) {
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
  typeof window !== 'undefined' && app! && canUseAnalytics
    ? isSupported().then(yes => yes ? getAnalytics(app!) : null)
    : null;

// @ts-ignore
export default app;

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApps, initializeApp } from "firebase/app";
// @ts-expect-error getReactNativePersistence is only in the react-native build's types.
import { getReactNativePersistence, initializeAuth, getAuth, type Auth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firstLaunch = getApps().length === 0;
const app = firstLaunch
  ? initializeApp({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    })
  : getApps()[0];

// Keep people signed in between launches, the same Firebase project as the website.
export const auth: Auth = firstLaunch
  ? initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
  : getAuth(app);
// React Native has no browser streaming transport, so Firestore long-polls.
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
export const storage = getStorage(app);

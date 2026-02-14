// Run: npx ts-node --esm scripts/seed-admin.ts
// Or: npx tsx scripts/seed-admin.ts
// Creates the admin account in Firebase Auth + Firestore

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function seedAdmin() {
  const email = "admin@gmail.com";
  const password = "000000";

  try {
    // Try to create the account
    let uid: string;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log("Created admin auth account:", uid);
    } catch (e: unknown) {
      if ((e as { code?: string }).code === "auth/email-already-in-use") {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        console.log("Admin auth account already exists:", uid);
      } else {
        throw e;
      }
    }

    // Create/update Firestore profile
    await setDoc(doc(db, "users", uid), {
      uid,
      email,
      displayName: "SNOWD Admin",
      phone: "",
      role: "admin",
      avatar: "",
      createdAt: new Date(),
      onboardingComplete: true,
      province: "ON",
      city: "Ottawa",
      postalCode: "",
      address: "",
      isOnline: true,
    }, { merge: true });

    console.log("Admin profile created/updated in Firestore");
    console.log("Login: admin@gmail.com / 000000");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding admin:", error);
    process.exit(1);
  }
}

seedAdmin();

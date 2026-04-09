// Run: npx tsx scripts/seed-dev-users.ts
// Creates two test users for local QA:
// - dev1@snowd.ca (client)
// - dev2@snowd.ca (operator)

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import * as dotenv from "dotenv";

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

type SeedUser = {
  email: string;
  password: string;
  displayName: string;
  role: "client" | "operator";
  city: string;
  province: string;
  postalCode: string;
  address: string;
};

const SEED_USERS: SeedUser[] = [
  {
    email: "dev1@snowd.ca",
    password: "snowd123",
    displayName: "Dev Client",
    role: "client",
    city: "Ottawa",
    province: "ON",
    postalCode: "K1A 0B1",
    address: "111 Test Street",
  },
  {
    email: "dev2@snowd.ca",
    password: "snowd123",
    displayName: "Dev Operator",
    role: "operator",
    city: "Ottawa",
    province: "ON",
    postalCode: "K1A 0B1",
    address: "222 Test Avenue",
  },
];

async function ensureAuthUser(email: string, password: string): Promise<string> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user.uid;
    }
    throw e;
  }
}

async function seedDevUsers() {
  try {
    for (const user of SEED_USERS) {
      const uid = await ensureAuthUser(user.email, user.password);

      if (user.role === "client") {
        await setDoc(
          doc(db, "users", uid),
          {
            uid,
            email: user.email,
            displayName: user.displayName,
            phone: "",
            role: "client",
            avatar: "",
            createdAt: new Date(),
            onboardingComplete: true,
            province: user.province,
            city: user.city,
            postalCode: user.postalCode,
            address: user.address,
            isOnline: false,
            lat: 45.4215,
            lng: -75.6972,
            savedOperators: [],
            jobHistory: [],
            propertyDetails: {
              propertySize: "medium",
              serviceTypes: ["driveway"],
              specialInstructions: "",
              photos: [],
            },
          },
          { merge: true }
        );
      } else {
        await setDoc(
          doc(db, "users", uid),
          {
            uid,
            email: user.email,
            displayName: user.displayName,
            phone: "",
            role: "operator",
            avatar: "",
            createdAt: new Date(),
            onboardingComplete: true,
            accountApproved: true,
            idVerified: true,
            verificationStatus: "approved",
            stripeConnectAccountId: "dev_seed_connect_account",
            isAvailable: true,
            verified: true,
            isStudent: false,
            bio: "QA test operator account",
            equipment: ["Shovel", "Snow Blower"],
            serviceRadius: 30,
            serviceTypes: ["driveway", "walkway"],
            pricing: {
              driveway: { small: 30, medium: 40, large: 55 },
              walkway: 20,
              sidewalk: 25,
              hourlyRate: 45,
            },
            rating: 5,
            reviewCount: 1,
            activeJobs: [],
            completedJobs: 0,
            availability: {
              monday: { start: "07:00", end: "18:00" },
              tuesday: { start: "07:00", end: "18:00" },
              wednesday: { start: "07:00", end: "18:00" },
              thursday: { start: "07:00", end: "18:00" },
              friday: { start: "07:00", end: "18:00" },
            },
            province: user.province,
            city: user.city,
            postalCode: user.postalCode,
            address: user.address,
            isOnline: false,
            lat: 45.425,
            lng: -75.695,
          },
          { merge: true }
        );
      }

      await signOut(auth);
      console.log(`Seeded ${user.role}: ${user.email}`);
    }

    console.log("Done. Test logins:");
    console.log("- dev1@snowd.ca / snowd123 (client)");
    console.log("- dev2@snowd.ca / snowd123 (operator)");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding dev users:", error);
    process.exit(1);
  }
}

seedDevUsers();

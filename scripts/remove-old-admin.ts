// Run: npx tsx scripts/remove-old-admin.ts
// Removes the admin@gmail.com account from Firestore
// The only admin should be kacperprymicz@gmail.com

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, deleteUser } from "firebase/auth";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, updateDoc } from "firebase/firestore";
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

async function removeOldAdmin() {
  const oldAdminEmail = "admin@gmail.com";
  const oldAdminPassword = "000000";

  try {
    // Sign in as the old admin to delete the auth account
    console.log("Signing in as admin@gmail.com...");
    const cred = await signInWithEmailAndPassword(auth, oldAdminEmail, oldAdminPassword);
    const uid = cred.user.uid;
    console.log("Signed in. UID:", uid);

    // Delete the Firestore user document
    console.log("Deleting Firestore user document...");
    await deleteDoc(doc(db, "users", uid));
    console.log("Firestore document deleted.");

    // Delete the auth account
    console.log("Deleting auth account...");
    await deleteUser(cred.user);
    console.log("Auth account deleted.");

    console.log("\n✅ admin@gmail.com has been completely removed.");
    console.log("The only admin should now be kacperprymicz@gmail.com");
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      console.log("admin@gmail.com does not exist or invalid credentials. Already removed.");

      // Still try to clean up any Firestore documents with that email
      try {
        const q = query(collection(db, "users"), where("email", "==", oldAdminEmail));
        const snap = await getDocs(q);
        for (const docSnap of snap.docs) {
          console.log(`Removing orphaned Firestore doc: ${docSnap.id}`);
          await deleteDoc(doc(db, "users", docSnap.id));
        }
        if (snap.docs.length > 0) {
          console.log("Orphaned documents cleaned up.");
        }
      } catch {}
    } else {
      console.error("Error:", err);
    }
  }

  process.exit(0);
}

removeOldAdmin();

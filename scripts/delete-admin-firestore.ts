import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, "users"), where("email", "==", "admin@gmail.com"));
  const snap = await getDocs(q);

  if (snap.empty) {
    console.log("No Firestore document found for admin@gmail.com");
  } else {
    for (const docSnap of snap.docs) {
      console.log("Deleting doc:", docSnap.id);
      await deleteDoc(doc(db, "users", docSnap.id));
      console.log("Deleted.");
    }
  }

  process.exit(0);
}

run();

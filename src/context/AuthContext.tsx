"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  deleteUser,
} from "firebase/auth";
import { arrayUnion, deleteDoc, doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "@/lib/firebase";
import { UserProfile, ClientProfile, OperatorProfile } from "@/lib/types";
import { sendAdminNotif } from "@/lib/adminNotifications";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | ClientProfile | OperatorProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithEmailPassword: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | ClientProfile | OperatorProfile | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !db) {
      return;
    }

    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }

      if (firebaseUser) {
        const docRef = doc(db, "users", firebaseUser.uid);

        // Gate watch setup behind a readable one-time fetch to avoid repeating
        // watch-stream permission errors when Firestore rules are stale/deployed incorrectly.
        try {
          const initialSnap = await getDoc(docRef);
          if (initialSnap.exists()) {
            setProfile(initialSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }

          profileUnsubscribe = onSnapshot(
            docRef,
            (docSnap) => {
              if (docSnap.exists()) {
                setProfile(docSnap.data() as UserProfile);
              } else {
                setProfile(null);
              }
              setLoading(false);
            },
            (error) => {
              const code = (error as { code?: string }).code || "";
              if (code === "permission-denied") {
                console.warn("Profile realtime listener disabled due to Firestore permission-denied.");
              } else {
                console.error("Error listening to profile:", error);
              }
              setLoading(false);
            }
          );
        } catch (error) {
          const code = (error as { code?: string }).code || "";
          if (code === "permission-denied") {
            console.warn("Profile read denied by Firestore rules. Falling back to auth-only session state.");
          } else {
            console.error("Error fetching initial profile:", error);
          }
          setProfile(null);
          setLoading(false);
        }
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
    }

    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    sendAdminNotif({
      type: "login",
      message: `User logged in: ${cred.user.email ?? "Google user"}`,
      uid: cred.user.uid,
      meta: { email: cred.user.email ?? "" },
    });
    // Notify admin if this is a first-time Google signup
    if (cred.user.metadata.creationTime === cred.user.metadata.lastSignInTime) {
      sendAdminNotif({
        type: "signup",
        message: `New Google signup: ${cred.user.email}`,
        uid: cred.user.uid,
        meta: { email: cred.user.email ?? "" },
      });
    }
    return cred.user;
  };

  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
    }

    const cred = await signInWithEmailAndPassword(auth, email, password);
    sendAdminNotif({
      type: "login",
      message: `User logged in: ${cred.user.email ?? "email user"}`,
      uid: cred.user.uid,
      meta: { email: cred.user.email ?? "" },
    });
    return cred.user;
  };

  const signOut = async () => {
    if (!isFirebaseConfigured || !auth) return;

    // Clear state immediately so UI responds before the async call finishes
    setUser(null);
    setProfile(null);
    await firebaseSignOut(auth);
  };

  const deleteAccount = async () => {
    if (!isFirebaseConfigured || !auth || !db) {
      throw new Error("Firebase is not configured. Add valid NEXT_PUBLIC_FIREBASE_* values in .env.local");
    }

    if (!user) throw new Error("No user logged in");

    const accountHistoryRef = doc(db, "accountHistory", encodeURIComponent((user.email || "").trim().toLowerCase()));
    await setDoc(
      accountHistoryRef,
      {
        email: (user.email || "").trim().toLowerCase(),
        deletedAccountIds: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Remove the private profile before Auth deletion while the user's credentials
    // still authorize the Firestore delete.
    await deleteDoc(doc(db, "users", user.uid));
    await deleteUser(user);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signInWithGoogle, signInWithEmailPassword, signOut, refreshProfile, deleteAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

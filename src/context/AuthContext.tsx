"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile, ClientProfile, OperatorProfile } from "@/lib/types";
import { sendAdminNotif } from "@/lib/adminNotifications";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | ClientProfile | OperatorProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  sendPhoneCode: (phoneNumber: string) => Promise<ConfirmationResult>;
  confirmPhoneCode: (confirmationResult: ConfirmationResult, code: string) => Promise<User>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | ClientProfile | OperatorProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Clean up previous profile listener
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }

      if (firebaseUser) {
        // Set up real-time listener for profile changes
        const docRef = doc(db, "users", firebaseUser.uid);
        profileUnsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to profile:", error);
          setProfile(null);
          setLoading(false);
        });
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

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Notify admin of new signup
    sendAdminNotif({
      type: "signup",
      message: `New signup: ${email}`,
      uid: cred.user.uid,
      meta: { email },
    });
    return cred.user;
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
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

  const sendPhoneCode = async (phoneNumber: string): Promise<ConfirmationResult> => {
    const w = window as unknown as Record<string, unknown>;

    // Fully destroy any existing verifier
    if (w.recaptchaVerifier) {
      try {
        (w.recaptchaVerifier as RecaptchaVerifier).clear();
      } catch {}
      w.recaptchaVerifier = undefined;
    }

    // Reset the grecaptcha widget if it exists
    if (typeof (window as unknown as { grecaptcha?: { reset: (id?: number) => void } }).grecaptcha?.reset === "function") {
      try {
        (window as unknown as { grecaptcha: { reset: (id?: number) => void } }).grecaptcha.reset();
      } catch {}
    }

    // Clear the container so a fresh widget can mount
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";

    const recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        w.recaptchaVerifier = undefined;
      },
    });
    w.recaptchaVerifier = recaptchaVerifier;

    // Render explicitly so it's ready before signInWithPhoneNumber
    await recaptchaVerifier.render();

    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    return confirmation;
  };

  const confirmPhoneCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User> => {
    const result = await confirmationResult.confirm(code);
    return result.user;
  };

  const signOut = async () => {
    // Clear state immediately so UI responds before the async call finishes
    setUser(null);
    setProfile(null);
    await firebaseSignOut(auth);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, signInWithGoogle, sendPhoneCode, confirmPhoneCode, signOut, refreshProfile }}
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

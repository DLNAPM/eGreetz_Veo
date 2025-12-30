
// Fix: Consolidate modular imports and separate type declarations to ensure compatibility with ESM resolution and avoid "no exported member" errors
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import type { Auth, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { GreetingRecord } from '../types';

// Provided Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUXkZHySvB2S1aiLBXK5nW5aD9GNBQT7g",
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const initializeFirebase = () => {
  if (app) return;

  try {
    let config = firebaseConfig;
    try {
      // @ts-ignore
      const envConfig = (import.meta as any).env?.VITE_FIREBASE_CONFIG;
      if (envConfig && envConfig !== "undefined") {
        config = JSON.parse(envConfig);
      }
    } catch (e) {
      // Silently fall back to provided config
    }

    if (!config.apiKey || config.apiKey === "undefined") {
      console.warn("Firebase config missing. Features disabled.");
      return;
    }

    // Initialize App
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    
    // Initialize services directly using the app instance
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
};

// Execute initialization immediately
initializeFirebase();

const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!auth && !!db;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth not initialized");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  if (auth) {
    await signOut(auth);
  }
};

// Fix: Export a listener wrapper to ensure correct modular Firebase usage
export const onAuthStateChangedListener = (callback: (user: User | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firestore not initialized");
  return await addDoc(collection(db, 'greetings'), {
    ...greeting,
    userId
  });
};

export const getUserGreetings = async (userId: string): Promise<GreetingRecord[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'greetings'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GreetingRecord));
  } catch (error) {
    console.error("Failed to fetch greetings:", error);
    return [];
  }
};

export const deleteGreeting = async (greetingId: string) => {
  if (!db) throw new Error("Firestore not initialized");
  await deleteDoc(doc(db, 'greetings', greetingId));
};

export { auth, db };

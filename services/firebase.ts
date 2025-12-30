
// Fix: Separating type and value imports to resolve "no exported member" errors in certain TypeScript environments.
import { initializeApp, getApps, getApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { GreetingRecord } from '../types';

// Production Firebase configuration
// We use process.env.API_KEY as the primary key source for this environment.
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

/**
 * Initialize Firebase App with singleton pattern
 */
const getAppInstance = (): FirebaseApp | null => {
  try {
    if (getApps().length > 0) return getApp();
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined' && firebaseConfig.apiKey !== '') {
      return initializeApp(firebaseConfig);
    }
  } catch (e) {
    console.error("Firebase App initialization failed:", e);
  }
  return null;
};

const app = getAppInstance();

/**
 * Initialize Services only if app exists to avoid "Component not registered" errors
 */
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

/**
 * Check if Firebase is correctly configured and initialized
 */
export const isFirebaseEnabled = () => {
  return !!app && !!auth && !!db && !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined' && firebaseConfig.apiKey !== '';
};

/**
 * Handle Google Login
 */
export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Firebase Auth service not available. Check your API configuration.");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Login Error:", error.code, error.message);
    if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
      throw new Error("Configuration Error: The provided API Key is not valid for this Firebase project.");
    }
    throw error;
  }
};

/**
 * Handle Logout
 */
export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

/**
 * Listen for auth state changes
 */
export const onAuthStateChangedListener = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

/**
 * Save a new greeting record
 */
export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firestore service not available");
  return await addDoc(collection(db, 'greetings'), {
    ...greeting,
    userId,
    createdAt: Date.now()
  });
};

/**
 * Fetch all greetings for a user
 */
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

/**
 * Delete a greeting record
 */
export const deleteGreeting = async (greetingId: string): Promise<void> => {
  if (!db) throw new Error("Firestore service not available");
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type User = FirebaseUser;

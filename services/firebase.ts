
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

/**
 * Safely accesses environment variables.
 * In Vite, these are usually on import.meta.env, but we use process.env mapping
 * via vite.config.js for maximum compatibility with Render.com.
 */
const getEnvVar = (key: string): string | undefined => {
  // Check process.env first (defined in vite.config.js)
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // Fallback to import.meta.env with safety check
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) {
      return metaEnv[key];
    }
  } catch (e) {
    // import.meta.env might not be available in all contexts
  }
  return undefined;
};

const getFirebaseConfig = () => {
  // Option 1: Load from a single JSON string
  const configStr = getEnvVar('VITE_FIREBASE_CONFIG');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch (e) {
      console.error("Failed to parse VITE_FIREBASE_CONFIG environment variable:", e);
    }
  }
  
  // Option 2: Load from individual environment variables
  return {
    apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
    authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
    storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnvVar('VITE_FIREBASE_APP_ID'),
    measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID')
  };
};

const firebaseConfig = getFirebaseConfig();

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Only initialize if we have at least an API key present
if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    
    if (app) {
      auth = getAuth(app);
      db = getFirestore(app);
    }
  } catch (error) {
    console.error("Firebase Initialization failed:", error);
  }
}

const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!app && !!auth && !!db;

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) {
    throw new Error("Authentication service unavailable. Please ensure VITE_FIREBASE_... environment variables are set in your Render dashboard.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Login Error:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  await signOut(auth);
};

export const onAuthStateChangedListener = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Database unavailable.");
  return await addDoc(collection(db, 'greetings'), {
    ...greeting,
    userId,
    createdAt: Date.now()
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
    console.error("Fetch greetings failed:", error);
    return [];
  }
};

export const deleteGreeting = async (greetingId: string): Promise<void> => {
  if (!db) return;
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type { FirebaseUser as User };
export { auth, db };

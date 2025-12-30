
// Fix: Consolidating imports to ensure modular exports are correctly resolved
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User as FirebaseUser,
  type Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy,
  type Firestore
} from 'firebase/firestore';
import { GreetingRecord } from '../types';

// Production Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

// Initialize Firebase App
// Fix: Ensure app initialization handles environment-specific type resolution
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
// CRITICAL: Immediately call getAuth and getFirestore to register components with the App instance
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!app && !!auth && !!db && !!process.env.API_KEY;

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Firebase Auth service not available");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Production login failed:", error);
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

export const onAuthStateChangedListener = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firestore service not available");
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
    console.error("Failed to fetch production greetings:", error);
    return [];
  }
};

export const deleteGreeting = async (greetingId: string): Promise<void> => {
  if (!db) throw new Error("Firestore service not available");
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type User = FirebaseUser;
export { auth, db };

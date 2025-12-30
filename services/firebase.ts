
// Fix: Use standard Firebase v9 modular imports.
// If "no exported member" errors persist, ensure the 'firebase' package is version 9 or later.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  type User,
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

// Provided Production Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUXkZHySvB2S1aiLBXK5nW5aD9GNBQT7g",
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!app && !!auth && !!db;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase Auth service not available");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Production login failed:", error);
    throw error;
  }
};

export const logout = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

export const onAuthStateChangedListener = (callback: (user: User | null) => void) => {
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

export const deleteGreeting = async (greetingId: string) => {
  if (!db) throw new Error("Firestore service not available");
  await deleteDoc(doc(db, 'greetings', greetingId));
};

export type { User, Auth };
export { auth, db };

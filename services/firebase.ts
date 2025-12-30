
// Fix: Consolidating imports to resolve 'no exported member' errors which can occur in some TypeScript/build environments when value and type imports are separated.
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

// The Firebase configuration for the egreetz-d0846 project.
// Note: This is separate from the Gemini API Key.
const firebaseConfig = {
  apiKey: "AIzaSyDUXkZHySvB2S1aiLBXK5nW5aD9GNBQT7g",
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

// Safe initialization of Firebase app
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

try {
  // Use getApps and initializeApp from the consolidated modular imports
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
  console.error("Firebase Initialization Error:", error);
}

const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!app && !!auth && !!db;

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Authentication service is not initialized.");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Login Error:", error.code, error.message);
    if (error.code === 'auth/api-key-not-valid') {
      throw new Error("The Firebase API key is invalid. Please check your project configuration.");
    }
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout error:", error);
  }
};

export const onAuthStateChangedListener = (callback: (user: FirebaseUser | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firestore service is not initialized.");
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
    console.error("Failed to fetch greetings:", error);
    return [];
  }
};

export const deleteGreeting = async (greetingId: string): Promise<void> => {
  if (!db) throw new Error("Firestore service is not initialized.");
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type { FirebaseUser as User };
export { auth, db };

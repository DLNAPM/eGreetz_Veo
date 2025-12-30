
// Fix: Consolidating Firebase modular imports to resolve member export errors and ensure correct type resolution.
import { 
  initializeApp, 
  getApps, 
  getApp, 
  type FirebaseApp 
} from 'firebase/app';
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

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "egreetz-d0846.firebaseapp.com",
  projectId: "egreetz-d0846",
  storageBucket: "egreetz-d0846.firebasestorage.app",
  messagingSenderId: "546450368214",
  appId: "1:546450368214:web:2e0827d27d3c0506174b77",
  measurementId: "G-MRV9FYGGEQ"
};

const getAppInstance = (): FirebaseApp | null => {
  try {
    // Prevent double initialization by checking for existing apps
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

// Fix: Use the app instance to initialize services correctly.
export const auth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;

export const isFirebaseEnabled = () => {
  return !!app && !!auth && !!db && !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'undefined';
};

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Firebase Auth service not available. Verify your API configuration.");
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Firebase Login Error:", error.code, error.message);
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
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firestore service not available");
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
  if (!db) throw new Error("Firestore service not available");
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type User = FirebaseUser;

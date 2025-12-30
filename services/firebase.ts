import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, Auth } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy, Firestore } from 'firebase/firestore';
import { GreetingRecord } from '../types';

const firebaseConfigStr = process.env.VITE_FIREBASE_CONFIG;

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const initializeFirebase = () => {
  if (!firebaseConfigStr) {
    console.warn("Firebase configuration (VITE_FIREBASE_CONFIG) is missing.");
    return;
  }

  try {
    const config = JSON.parse(firebaseConfigStr);
    if (!config.apiKey || config.apiKey === "undefined") {
      console.warn("Firebase API Key is missing.");
      return;
    }
    
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Failed to parse or initialize Firebase:", error);
  }
};

initializeFirebase();

const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!auth && !!db;

export const loginWithGoogle = async () => {
  if (!auth) throw new Error("Firebase is not initialized");
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logout = () => auth && signOut(auth);

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Firebase is not initialized");
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
  if (!db) throw new Error("Firebase is not initialized");
  await deleteDoc(doc(db, 'greetings', greetingId));
};

export { auth, db };
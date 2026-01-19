
// Consolidated Firebase imports to resolve module member resolution errors for initializeApp, getAuth, etc.
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
  updateDoc,
  getDoc,
  serverTimestamp,
  type Firestore
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  type FirebaseStorage
} from 'firebase/storage';
import { GreetingRecord } from '../types';

// Helper to get environment variables from either process.env or import.meta.env
const getEnvVar = (key: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[key]) return metaEnv[key];
  } catch (e) {}
  return undefined;
};

// Parse Firebase configuration from environment
const getFirebaseConfig = () => {
  const configStr = getEnvVar('VITE_FIREBASE_CONFIG');
  if (configStr) {
    try {
      return JSON.parse(configStr);
    } catch (e) {}
  }
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
let storage: FirebaseStorage | null = null;

// Initialize Firebase only if mandatory config is available
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
      storage = getStorage(app);
    }
  } catch (error) {
    console.error("Firebase Initialization failed:", error);
  }
}

const googleProvider = new GoogleAuthProvider();

export const isFirebaseEnabled = () => !!app && !!auth && !!db && !!storage;

export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth) throw new Error("Authentication service unavailable.");
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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

/**
 * Uploads a video blob to Firebase Storage and returns a permanent URL.
 */
export const uploadVideoToCloud = async (blob: Blob, userId: string): Promise<string> => {
  if (!storage) throw new Error("Cloud Storage unavailable.");
  const fileName = `greetings/${userId}/${Date.now()}.mp4`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

/**
 * Uploads an audio file/blob to Firebase Storage and returns a permanent URL.
 */
export const uploadAudioToCloud = async (data: File | Blob, userId: string): Promise<string> => {
  if (!storage) throw new Error("Cloud Storage unavailable.");
  const isFile = data instanceof File;
  const extension = isFile ? data.name.split('.').pop() : 'pcm';
  const fileName = `audio/${userId}/${Date.now()}.${extension}`;
  const storageRef = ref(storage, data);
  await uploadBytes(storageRef, data);
  return await getDownloadURL(storageRef);
};

export const saveGreeting = async (userId: string, greeting: Omit<GreetingRecord, 'id'>) => {
  if (!db) throw new Error("Database unavailable.");
  return await addDoc(collection(db, 'greetings'), {
    ...greeting,
    userId,
    createdAt: Date.now()
  });
};

export const updateGreeting = async (id: string, greeting: Partial<GreetingRecord>) => {
  if (!db) throw new Error("Database unavailable.");
  const docRef = doc(db, 'greetings', id);
  await updateDoc(docRef, {
    ...greeting,
    updatedAt: serverTimestamp()
  });
};

export const getUserGreetings = async (userId: string): Promise<GreetingRecord[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'greetings'),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GreetingRecord));
    
    // Sort in memory to avoid needing composite indexes for simple userId filtering
    return results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error("Fetch greetings failed:", error);
    return [];
  }
};

/**
 * Fetches a specific greeting by ID (for Short URL Viewer)
 */
export const getGreetingById = async (id: string): Promise<GreetingRecord | null> => {
  if (!db) return null;
  const docRef = doc(db, 'greetings', id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as GreetingRecord;
  }
  return null;
};

/**
 * Fetches a specific shared greeting by ID (for Short URL Viewer)
 */
export const getSharedGreetingById = async (id: string): Promise<GreetingRecord | null> => {
  if (!db) return null;
  const docRef = doc(db, 'shared_greetings', id);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    return { 
      id: snap.id, 
      ...data, 
      isReceived: true,
      videoUrl: data.videoUrl,
      voiceUrl: data.voiceUrl,
      backgroundMusicUrl: data.backgroundMusicUrl
    } as any;
  }
  return null;
};

/**
 * Internal Share: Sends a greeting to another user's email.
 */
export const sendToInternalUser = async (senderName: string, recipientEmail: string, greeting: GreetingRecord) => {
  if (!db) throw new Error("Database unavailable.");
  const shareRef = collection(db, 'shared_greetings');
  await addDoc(shareRef, {
    recipientEmail: recipientEmail.toLowerCase().trim(),
    senderName,
    greetingId: greeting.id,
    videoUrl: greeting.videoUrl,
    voiceUrl: greeting.voiceUrl || null,
    occasion: greeting.occasion,
    message: greeting.message,
    theme: greeting.theme,
    voice: greeting.voice || 'Female',
    backgroundMusicUrl: greeting.backgroundMusicUrl || null,
    sharedAt: serverTimestamp(),
    createdAt: greeting.createdAt
  });
};

/**
 * Group Share: Sends a greeting to multiple users.
 */
export const sendToGroup = async (senderName: string, emails: string[], greeting: GreetingRecord) => {
  const tasks = emails.map(email => sendToInternalUser(senderName, email, greeting));
  await Promise.all(tasks);
};

/**
 * Fetches greetings shared with the current user.
 */
export const getReceivedGreetings = async (email: string): Promise<GreetingRecord[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'shared_greetings'),
      where('recipientEmail', '==', email.toLowerCase())
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data(),
      isReceived: true // Flag to identify shared content in UI
    } as any));

    // Sort in memory by sharedAt (handle Firestore timestamp object or numeric value)
    return results.sort((a, b) => {
      const timeA = a.sharedAt?.toMillis?.() || a.sharedAt || a.createdAt || 0;
      const timeB = b.sharedAt?.toMillis?.() || b.sharedAt || b.createdAt || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Fetch shared failed:", error);
    return [];
  }
};

export const deleteGreeting = async (greetingId: string): Promise<void> => {
  if (!db) return;
  const docRef = doc(db, 'greetings', greetingId);
  await deleteDoc(docRef);
};

export type { FirebaseUser as User };
export { auth, db, storage };

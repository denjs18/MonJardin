import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

// Check if we have valid Firebase config
const hasValidConfig = Object.values(firebaseConfig).every(
  (value) => value !== undefined && value !== ""
);

if (hasValidConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);
}

export { app, db, storage, auth };

// Helper functions for Firestore operations
export const firestoreHelpers = {
  // Convert Firestore timestamp to Date
  toDate: (timestamp: Timestamp | null): Date | null => {
    return timestamp ? timestamp.toDate() : null;
  },

  // Convert Date to Firestore timestamp
  toTimestamp: (date: Date | null): Timestamp | null => {
    return date ? Timestamp.fromDate(date) : null;
  },

  // Generic add document
  async add<T extends DocumentData>(
    collectionName: string,
    data: T
  ): Promise<string> {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  },

  // Generic update document
  async update<T extends DocumentData>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<void> {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
  },

  // Generic delete document
  async delete(collectionName: string, id: string): Promise<void> {
    if (!db) throw new Error("Firebase not initialized");
    await deleteDoc(doc(db, collectionName, id));
  },

  // Generic get single document
  async get<T>(collectionName: string, id: string): Promise<T | null> {
    if (!db) throw new Error("Firebase not initialized");
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  },

  // Generic query documents
  async query<T>(
    collectionName: string,
    ...constraints: QueryConstraint[]
  ): Promise<T[]> {
    if (!db) throw new Error("Firebase not initialized");
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as T)
    );
  },
};

// Export Firestore utilities for direct use
export {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => hasValidConfig;

// Auth helper functions
export const authHelpers = {
  // Create a new user account
  async signUp(email: string, password: string, displayName?: string): Promise<User> {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    return userCredential.user;
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User> {
    if (!auth) throw new Error("Firebase Auth not initialized");
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  },

  // Sign out
  async signOut(): Promise<void> {
    if (!auth) throw new Error("Firebase Auth not initialized");
    await signOut(auth);
  },

  // Send password reset email
  async resetPassword(email: string): Promise<void> {
    if (!auth) throw new Error("Firebase Auth not initialized");
    await sendPasswordResetEmail(auth, email);
  },

  // Get current user
  getCurrentUser(): User | null {
    if (!auth) return null;
    return auth.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    if (!auth) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(auth, callback);
  },
};

export type { User };

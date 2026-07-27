import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAnalytics, type Analytics, isSupported } from "firebase/analytics";
import { getAuth, type Auth, connectAuthEmulator } from "firebase/auth";
import { getStorage, type FirebaseStorage, connectStorageEmulator } from "firebase/storage";
import { getFirestore, type Firestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;
let firestore: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
  }
  return app;
}

export async function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (!analytics) {
    const supported = await isSupported();
    if (supported) {
      analytics = getAnalytics(getFirebaseApp());
    }
  }
  return analytics ?? null;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      connectAuthEmulator(auth, "http://127.0.0.1:9099");
    }
  }
  return auth;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      connectStorageEmulator(storage, "127.0.0.1", 9199);
    }
  }
  return storage;
}

export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    firestore = getFirestore(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true") {
      connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
    }
  }
  return firestore;
}

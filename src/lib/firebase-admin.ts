import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountBase64) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY not set. " +
      "Paste the full service account JSON (base64-encoded) into .env.local"
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, "base64").toString("utf-8")
  );

  return initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

let adminAuth: Auth | undefined;
let adminStorage: Storage | undefined;
let adminFirestore: Firestore | undefined;

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

export function getAdminStorage(): Storage {
  if (!adminStorage) {
    adminStorage = getStorage(getAdminApp());
  }
  return adminStorage;
}

export function getAdminFirestore(): Firestore {
  if (!adminFirestore) {
    adminFirestore = getFirestore(getAdminApp());
  }
  return adminFirestore;
}

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name, valid: true };
  } catch {
    return { valid: false };
  }
}

export async function createFirebaseUser(email: string, password: string, displayName?: string) {
  return getAdminAuth().createUser({ email, password, displayName });
}

export async function deleteFirebaseUser(uid: string) {
  return getAdminAuth().deleteUser(uid);
}

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "./firebase";

export type FirebaseUser = User;

export async function signUpWithFirebase(email: string, password: string, displayName: string) {
  const auth = getFirebaseAuth();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred.user;
}

export async function signInWithFirebase(email: string, password: string) {
  const auth = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOutFirebase() {
  await signOut(getFirebaseAuth());
}

export async function resetFirebasePassword(email: string) {
  await sendPasswordResetEmail(getFirebaseAuth(), email);
}

export function onFirebaseAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { onFirebaseAuthChanged, getFirebaseIdToken } from "@/lib/firebase-auth";

interface FirebaseAuthContextValue {
  firebaseUser: User | null;
  loading: boolean;
  getIdToken: () => Promise<string | null>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue>({
  firebaseUser: null,
  loading: true,
  getIdToken: async () => null,
});

export function useFirebaseAuth() {
  return useContext(FirebaseAuthContext);
}

export function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onFirebaseAuthChanged((user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsub;
  }, []);

  const getIdToken = async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  };

  return (
    <FirebaseAuthContext.Provider value={{ firebaseUser, loading, getIdToken }}>
      {children}
    </FirebaseAuthContext.Provider>
  );
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { firestore } from "./firestore";

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  coins: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function describeAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/unauthorized-domain":
      return "This domain is not authorised for Google sign-in yet. Add rivalr-phi.vercel.app to Firebase Console > Authentication > Settings > Authorized domains, then try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups for this site and try again.";
    case "auth/cancelled-popup-request":
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "permission-denied":
      return "Firestore is rejecting reads. Publish the firestore.rules file in Firebase Console > Firestore > Rules, then try again.";
    default:
      return (err as { message?: string })?.message ?? "Something went wrong while signing in. Please try again.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      (async () => {
        try {
          let userData = await firestore.users.get(firebaseUser.uid);
          if (!userData) {
            userData = await firestore.users.create({
              google_id: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              name: firebaseUser.displayName ?? "User",
              avatar_url: firebaseUser.photoURL,
            });
          }
          if (!cancelled) setUser(userData as User);
        } catch (e) {
          console.error("Failed to resolve Firestore user", e);
          if (!cancelled) setError(describeAuthError(e));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  async function signInWithGoogle() {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      console.error("Sign-in failed", e);
      setError(describeAuthError(e));
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
    setUser(null);
  }

  async function refreshUser() {
    if (!user) return;
    const fresh = await firestore.users.get(user.google_id);
    if (fresh) setUser(fresh as User);
  }

  function clearError() {
    setError(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, signInWithGoogle, signOut, refreshUser, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
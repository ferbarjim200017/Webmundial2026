"use client";
// =====================================================================
//  Contexto de autenticación (Firebase Auth + perfil en Firestore)
// =====================================================================
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, googleProvider, isFirebaseConfigured } from "./firebase";
import { ADMIN_EMAILS } from "./constants";
import type { AppUser, Role } from "./types";

interface AuthContextValue {
  user: AppUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  configured: boolean;
  isAdmin: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function roleForEmail(email: string | null): Role {
  if (email && ADMIN_EMAILS.includes(email.toLowerCase())) return "admin";
  return "member";
}

async function ensureUserDoc(fbUser: FirebaseUser) {
  const ref = doc(db, "users", fbUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: fbUser.email,
      displayName: fbUser.displayName,
      photoURL: fbUser.photoURL,
      role: roleForEmail(fbUser.email),
      playerId: null,
      createdAt: Date.now(),
    });
  } else {
    // Mantener datos básicos sincronizados (foto/nombre del proveedor) y
    // promover a admin si su correo está en la lista (sin degradar nunca).
    const data = snap.data();
    const updates: Record<string, unknown> = {};
    if (data.email !== fbUser.email) updates.email = fbUser.email;
    if (!data.photoURL && fbUser.photoURL) updates.photoURL = fbUser.photoURL;
    if (data.role !== "admin" && roleForEmail(fbUser.email) === "admin")
      updates.role = "admin";
    if (Object.keys(updates).length) await setDoc(ref, updates, { merge: true });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const profileUnsub = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      profileUnsub.current?.();
      profileUnsub.current = null;

      if (!fbUser) {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(fbUser);
      try {
        await ensureUserDoc(fbUser);
      } catch (e) {
        console.error("ensureUserDoc", e);
      }

      profileUnsub.current = onSnapshot(doc(db, "users", fbUser.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setUser({
            uid: fbUser.uid,
            email: d.email ?? fbUser.email,
            displayName: d.displayName ?? fbUser.displayName,
            photoURL: d.photoURL ?? fbUser.photoURL,
            role: (d.role as Role) ?? "member",
            playerId: d.playerId ?? null,
            createdAt: d.createdAt,
          });
        }
        setLoading(false);
      });
    });

    return () => {
      unsub();
      profileUnsub.current?.();
    };
  }, []);

  const signInGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };
  const signInEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };
  const signUpEmail = async (name: string, email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (name) await updateProfile(cred.user, { displayName: name });
    await ensureUserDoc(cred.user);
  };
  const logout = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        configured: isFirebaseConfigured,
        isAdmin: user?.role === "admin",
        signInGoogle,
        signInEmail,
        signUpEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

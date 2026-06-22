// =====================================================================
//  Inicialización del SDK web de Firebase (cliente)
// =====================================================================
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Las claves del SDK web de Firebase son públicas (se incluyen en el bundle del
// navegador igualmente). La seguridad la dan las reglas de Firestore + Auth, no
// estas claves. Se dejan como valores por defecto para que funcione en Vercel
// sin configurar variables; aun así, cualquier NEXT_PUBLIC_FIREBASE_* las
// sobrescribe si se define.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyB3LNoYoOq6t7q-W_bhScAQ2SLatOafyPQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "webviaje2026.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "webviaje2026",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "webviaje2026.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "236806243504",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:236806243504:web:e575864a1371864c402775",
};

/** ¿Están definidas las variables mínimas de Firebase? */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
}

export const auth = authInstance as Auth;
export const db = dbInstance as Firestore;
export const googleProvider = new GoogleAuthProvider();

import { getFirestore } from "firebase/firestore"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth"
import { getStorage, type FirebaseStorage } from "firebase/storage"
import type { Firestore } from "firebase/firestore"

const firebaseConfig  = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** Missing web-app keys. Null when the client can talk to Firebase Auth. */
export function firebaseConfigError(): string | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    return "Add the Firebase web app keys to .env.local, then restart the dev server.";
  }
  return null;
}



let app
let auth: Auth
let provider: GoogleAuthProvider
let db: Firestore
let storage: FirebaseStorage
export function getCurrentUsersToken() {
  return new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      unsub();
      resolve(user?.getIdToken());
    });
  });
}
if (typeof window !== "undefined") {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  auth = getAuth(app)
  provider = new GoogleAuthProvider()
  db = getFirestore(app)
  storage = getStorage(app)
}
export { app,auth, provider, db, storage }
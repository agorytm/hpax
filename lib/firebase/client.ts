// Client Firebase — singleton, browser-only init.
// getAuth / getFirestore are guarded so they never run on the server during
// Next.js SSR or build-time pre-rendering (where NEXT_PUBLIC_* vars may be absent).

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getAuth,      type Auth }      from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             ?? '',
}

// initializeApp itself is safe with empty strings; it's getAuth() that throws.
function getClientApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
}

export function getClientAuth(): Auth {
  return getAuth(getClientApp())
}

export function getClientDb(): Firestore {
  return getFirestore(getClientApp())
}

// Legacy singleton exports — only resolved in the browser.
// Components that import these use them exclusively inside useEffect / event
// handlers, so the null cast is safe; they're never called server-side.
export const auth: Auth      = typeof window !== 'undefined' ? getClientAuth() : null as unknown as Auth
export const db:   Firestore = typeof window !== 'undefined' ? getClientDb()   : null as unknown as Firestore

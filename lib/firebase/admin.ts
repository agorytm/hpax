// Firebase Admin SDK — utilisé uniquement dans les API Routes (serveur).
// Lazy-initialized pour éviter le crash au build time (env vars absentes).

import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { getAuth, Auth }           from 'firebase-admin/auth'

function getAdminApp(): App {
  if (getApps().length > 0) return getApp()

  const projectId   = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    )
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
}

export function getAdminDb(): Firestore  { return getFirestore(getAdminApp()) }
export function getAdminAuth(): Auth     { return getAuth(getAdminApp()) }

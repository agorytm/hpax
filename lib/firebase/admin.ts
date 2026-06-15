// Firebase Admin SDK — utilisé uniquement dans les API Routes (serveur).
// N'est JAMAIS importé côté client.
// Utilise le service account pour bypasser les Firestore Security Rules
// (équivalent au rôle postgres SECURITY DEFINER).

import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth }      from 'firebase-admin/auth'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // Vercel stocke la clé privée avec des \n échappés
      privateKey:  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminDb   = getFirestore()
export const adminAuth = getAuth()

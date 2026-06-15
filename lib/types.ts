import type { Timestamp } from 'firebase/firestore'

export interface Profile {
  id: string
  displayName: string
  verified: boolean
  messageCount: number   // 0–100, source of truth pour le compteur
  createdAt: Timestamp | null
}

// Message tel que stocké dans Firestore (displayName dénormalisé pour
// éviter les JOINs — Firebase n'en a pas).
export interface Message {
  id: string
  userId: str
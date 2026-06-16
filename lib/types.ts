import type { Timestamp } from 'firebase/firestore'

export interface Profile {
  id: string
  displayName: string
  verified: boolean
  messageCount: number
  createdAt: Timestamp | null
  blocked?: boolean
}

export interface Message {
  id: string
  userId: string
  content: string
  slotNumber: number
  displayName: string
  verified: boolean
  createdAt: Timestamp | null
}

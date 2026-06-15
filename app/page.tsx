'use client'

// Page racine — gère l'état auth via Firebase onAuthStateChanged.
// Pas de SSR ici : Firebase auth est client-side.
// Rendu initial : écran de chargement (≈ 100ms) → puis la vue correcte.

import { useEffect, useState }        from 'react'
import { useRouter }                  from 'next/navigation'
import { onAuthStateChanged, User }   from 'firebase/auth'
import {
  collection, query, orderBy, limit,
  getDocs, doc, getDoc, onSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { auth, db }   from '@/lib/firebase/client'
import HpaxMain       from '@/components/HpaxMain'
import type { Message, Profile } from '@/lib/types'
import Link           from 'next/link'

type AppState = 'loading' | 'public' | 'app'

function toMessage(id: string, data: DocumentData): Message {
  return {
    id,
    userId:      data.userId      ?? '',
    content:     data.content     ?? '',
    slotNumber:  data.slotNumber  ?? 0,
    displayName: data.displayName ?? '',
    verified:    data.verified    ?? false,
    createdAt:   data.createdAt   ?? null,
  }
}

export default function HomePage() {
  const [appState,  setAppState]  = useState<AppState>('loading')
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [messages,  setMessages]  = useState<Message[]>([])
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fireUser => {
      setFirebaseUser(fireUser)

      if (!fireUser) {
        // ── Non connecté : charge le feed public ──────────
        const q = query(
          collection(db, 'messages'),
          orderBy('createdAt', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        setMessages(snap.docs.map(d => toMessage(d.id, d.data())))
        setAppState('public')
        return
      }

      // ── Connecté : vérifie le profil ──────────────────
      const profileSnap = await getDoc(doc(db, 'profiles', fireUser.uid))
      if (!profileSnap.exists()) {
        router.replace('/join/name')
        return
      }

      const pd = profileSnap.data()!
      setProfile({
        id:           fireUser.uid,
        displayName:  pd.displayName,
        verified:     pd.verified ?? false,
        messageCount: pd.messageCount ?? 0,
        createdAt:    pd.createdAt ?? null,
      })

      setAppState('app')
    })

    return () => unsub()
  }, [router])

  // Abonnement realtime au feed (actif seulement quand connecté)
  useEffect(() => {
    if (appState !== 'app') return

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    )

    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => toMessage(d.id, d.data())))
    })

    return () => unsub()
  }, [appState])

  // ── Loading ─────────────────────────────────────────────
  if (appState === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <span className="font-mono text-[12px] text-[#333] tracking-[0.3em]">HPAX</span>
      </main>
    )
  }

  // ── App connectée ────────────────────────────────────────
  if (appState === 'app' && profile && firebaseUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="
          relative bg-[#0a0a0a] text-white overflow-hidden
          w-full h-screen
          md:w-[360px] md:h-[740px] md:rounded-[36px] md:border md:border-[#333]
        ">
          <HpaxMain
            profile={profile}
            firebaseUser={firebaseUser}
            initialMessages={messages}
          />
        </div>
      </main>
    )
  }

  // ── Landing publique ─────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="
        relative bg-[#0a0a0a] text-white overflow-hidden
        w-full h-screen
        md:w-[360px] md:h-[740px] md:rounded-[36px] md:border md:border-[#333]
      ">
        <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

          {/* Top bar */}
          <div className="w-full relative flex items-center justify-center mb-9 shrink-0">
            <span className="font-mono text-[13px] tracking-[0.3em] text-[#666]">HPAX</span>
            <Link
              href="/join"
              className="absolute right-0 font-mono text-[10px] text-[#555] hover:text-[#888] transition-colors"
            >
              Join →
            </Link>
          </div>

          {/* Tagline */}
          <div className="flex flex-col items-center mb-10 leading-none">
            <div
              className="font-serif font-bold text-white"
              style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}
            >
              100
            </div>
            <div className="w-24 h-px bg-[#444] my-1" />
            <div
              className="font-serif text-[#5
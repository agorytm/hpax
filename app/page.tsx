'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState }       from 'react'
import { useRouter }                 from 'next/navigation'
import { onAuthStateChanged, User }  from 'firebase/auth'
import { collection, query, orderBy, limit, getDocs, doc, getDoc, onSnapshot, DocumentData } from 'firebase/firestore'
import { auth, db }                  from '@/lib/firebase/client'
import HpaxMain                      from '@/components/HpaxMain'
import FeedOverlay                   from '@/components/FeedOverlay'
import type { Message, Profile }     from '@/lib/types'
import { T, type Lang }              from '@/lib/translations'
import Link                          from 'next/link'

type AppState = 'loading' | 'public' | 'app'

function toMessage(id: string, data: DocumentData): Message {
  return { id, userId: data.userId ?? '', content: data.content ?? '', slotNumber: data.slotNumber ?? 0, displayName: data.displayName ?? '', verified: data.verified ?? false, createdAt: data.createdAt ?? null }
}

function getLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('hpax_lang') as Lang) ?? 'fr'
}

export default function HomePage() {
  const [appState,     setAppState]     = useState<AppState>('loading')
  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [messages,     setMessages]     = useState<Message[]>([])
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [overlayOpen,  setOverlayOpen]  = useState(false)
  const [lang,         setLang]         = useState<Lang>('fr')
  const router = useRouter()

  useEffect(() => { setLang(getLang()) }, [])

  const t = T[lang]

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fireUser => {
      setFirebaseUser(fireUser)
      if (!fireUser) {
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(20))
        const snap = await getDocs(q)
        setMessages(snap.docs.map(d => toMessage(d.id, d.data())))
        setAppState('public')
        return
      }
      const profileSnap = await getDoc(doc(db, 'profiles', fireUser.uid))
      if (!profileSnap.exists()) { router.replace('/join/name'); return }
      const pd = profileSnap.data()!
      setProfile({ id: fireUser.uid, displayName: pd.displayName, verified: pd.verified ?? false, messageCount: pd.messageCount ?? 0, createdAt: pd.createdAt ?? null })
      setAppState('app')
    })
    return () => unsub()
  }, [router])

  useEffect(() => {
    if (appState !== 'app') return
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, snap => setMessages(snap.docs.map(d => toMessage(d.id, d.data()))))
  }, [appState])

  if (appState === 'loading') return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <span className="font-mono text-[12px] text-[#333]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
    </main>
  )

  if (appState === 'app' && profile && firebaseUser) return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="relative bg-[#0a0a0a] text-white overflow-hidden w-full h-screen md:w-[360px] md:h-[740px] md:rounded-[36px]" style={{ border: '0.5px solid #333' }}>
        <HpaxMain profile={profile} firebaseUser={firebaseUser} initialMessages={messages} />
      </div>
    </main>
  )

  /* Public view */
  const feedPreview = messages.slice(0, 3)
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
      <div className="relative bg-[#0a0a0a] text-white overflow-hidden w-full h-screen md:w-[360px] md:h-[740px] md:rounded-[36px]" style={{ border: '0.5px solid #333' }}>
        <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

          {/* Top bar — hamburger → /join */}
          <div className="w-full relative flex items-center justify-center mb-9 shrink-0">
            <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
            <Link href="/join" className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 group" aria-label="Join">
              {[0,1,2].map(i => <span key={i} className="block w-[18px] h-px bg-[#444] group-hover:bg-[#777] transition-colors" />)}
            </Link>
          </div>

          {/* Counter 100/100 */}
          <div className="flex flex-col items-center leading-none shrink-0" style={{ marginBottom: '40px' }}>
            <div className="font-serif font-bold text-white" style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}>100</div>
            <div className="w-24 h-px bg-[#444]" style={{ margin: '4px 0 8px' }} />
            <div className="font-serif text-[#555]" style={{ fontSize: '30px', letterSpacing: '-1px' }}>100</div>
          </div>

          {/* Fake input */}
          <Link href="/join" className="w-full mb-[14px] block">
            <div className="w-full font-mono text-[12px] text-[#444] rounded-[6px] px-4 py-4 cursor-text" style={{ border: '0.5px solid #333' }}>
              {t.placeholder}
            </div>
          </Link>

          {/* CTA button */}
          <Link href="/join" className="w-full rounded-[6px] text-white font-serif text-[16px] font-bold py-[17px] mb-[30px] text-center block transition-all hover:bg-white hover:text-[#0a0a0a]" style={{ border: '0.5px solid #fff' }}>
            {t.button}
          </Link>

          {/* Feed preview */}
          <div className="w-full cursor-pointer" onClick={() => setOverlayOpen(true)}>
            {feedPreview.map(msg => (
              <div key={msg.id} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                <div className="font-mono text-[10px] text-[#555] shrink-0" style={{ minWidth: '46px' }}>
                  <span className="text-[#999]">{msg.slotNumber}</span>/100
                </div>
                <div className="flex flex-col" style={{ gap: '3px' }}>
                  <span className="font-mono text-[9px] text-[#666] uppercase" style={{ letterSpacing: '0.12em' }}>
                    {msg.displayName}{msg.verified && <span className="ml-1 text-[#555]">✓</span>}
                  </span>
                  <p className="font-serif text-[14px] italic text-[#ccc]" style={{ lineHeight: 1.35 }}>&ldquo;{msg.content}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 h-10" />
        </div>

        <FeedOverlay open={overlayOpen} messages={messages} onClose={() => setOverlayOpen(false)} lang={lang} />
      </div>
    </main>
  )
}

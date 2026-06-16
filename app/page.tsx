'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, orderBy, limit, getDocs, onSnapshot, DocumentData } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import HpaxMain from '@/components/HpaxMain'
import FeedOverlay from '@/components/FeedOverlay'
import type { Message, Profile } from '@/lib/types'
import { T, type Lang } from '@/lib/translations'
import Link from 'next/link'

type AppState = 'loading' | 'public' | 'app'
type MenuPanel = null | 'about' | 'how' | 'terms'

function toMessage(id: string, data: DocumentData): Message {
  return { id, userId: data.userId ?? '', content: data.content ?? '', slotNumber: data.slotNumber ?? 0, displayName: data.displayName ?? '', verified: data.verified ?? false, createdAt: data.createdAt ?? null }
}
function getLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('hpax_lang') as Lang) ?? 'fr'
}

export default function HomePage() {
  const [appState, setAppState] = useState<AppState>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [lang, setLang] = useState<Lang>('fr')
  const [menuOpen, setMenuOpen] = useState(false)
  const [panel, setPanel] = useState<MenuPanel>(null)
  const router = useRouter()

  useEffect(() => { setLang(getLang()) }, [])
  const t = T[lang]

  function toggleLang() {
    const next: Lang = lang === 'fr' ? 'en' : 'fr'
    setLang(next)
    localStorage.setItem('hpax_lang', next)
  }

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
      // Use /api/me (Admin SDK) — reliable profile check, bypasses Firestore client rules
      const token = await fireUser.getIdToken()
      const meRes = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } })
      const { profile: pd } = await meRes.json().catch(() => ({ profile: null }))
      if (!pd) { router.replace('/join/name'); return }
      setProfile(pd)
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
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <span className="font-mono text-[12px] text-[#333]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
    </main>
  )

  if (appState === 'app' && profile && firebaseUser) return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="relative bg-[#0a0a0a] text-white overflow-hidden w-full h-screen md:w-[360px] md:h-[740px] md:rounded-[36px]" style={{ border: '0.5px solid #333' }}>
        <HpaxMain profile={profile} firebaseUser={firebaseUser} initialMessages={messages} />
      </div>
    </main>
  )

  const feedPreview = messages.slice(0, 3)
  const sections: { key: MenuPanel; label: string }[] = [
    { key: 'about', label: t.menuAbout },
    { key: 'how', label: t.menuHow },
    { key: 'terms', label: t.menuTerms },
  ]

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="relative bg-[#0a0a0a] text-white overflow-hidden w-full h-screen md:w-[360px] md:h-[740px] md:rounded-[36px]" style={{ border: '0.5px solid #333' }}>
        <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

          <div className="w-full relative flex items-center justify-center mb-9 shrink-0">
            <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
            <button onClick={() => { setMenuOpen(true); setPanel(null) }}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 group" aria-label="Menu">
              {[0,1,2].map(i => <span key={i} className="block w-[18px] h-px bg-[#444] group-hover:bg-[#777] transition-colors" />)}
            </button>
          </div>

          <div className="flex flex-col items-center leading-none shrink-0" style={{ marginBottom: '40px' }}>
            <div className="font-serif font-bold text-white" style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}>100</div>
            <div className="w-24 h-px bg-[#444]" style={{ margin: '4px 0 8px' }} />
            <div className="font-serif text-[#555]" style={{ fontSize: '30px', letterSpacing: '-1px' }}>100</div>
          </div>

          {/* White fake textarea — clicking goes to /join */}
          <Link href="/join" className="w-full mb-[14px] block">
            <div className="w-full font-mono text-[12px] rounded-[6px] px-4 py-4 cursor-text"
              style={{ background: 'white', border: '0.5px solid #ddd', color: '#bbb', minHeight: '54px' }}>
              {t.placeholder}
            </div>
          </Link>

          <Link href="/join" className="w-full rounded-[6px] text-white font-serif text-[16px] font-bold py-[17px] mb-[30px] text-center block transition-all hover:bg-white hover:text-[#0a0a0a]" style={{ border: '0.5px solid #fff' }}>
            {t.button}
          </Link>

          <div className="w-full cursor-pointer" onClick={() => setOverlayOpen(true)}>
            {feedPreview.map(msg => (
              <div key={msg.id} className="flex items-baseline gap-3 py-3" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                <div className="font-mono text-[10px] text-[#555] shrink-0" style={{ minWidth: '46px' }}>
                  <span className="text-[#999]">{msg.slotNumber}</span>/100
                </div>
                <div className="flex flex-col" style={{ gap: '3px' }}>
                  <span className="font-mono text-[9px] text-[#666] uppercase" style={{ letterSpacing: '0.12em' }}>
                    {msg.displayName}{msg.verified && <span className="ml-1 text-[#555]">&#10003;</span>}
                  </span>
                  <p className="font-serif text-[14px] italic text-[#ccc]" style={{ lineHeight: 1.35 }}>&ldquo;{msg.content}&rdquo;</p>
                </div>
              </div>
            ))}
          </div>
          <div className="shrink-0 h-10" />
        </div>

        <FeedOverlay open={overlayOpen} messages={messages} onClose={() => setOverlayOpen(false)} lang={lang} />

        {menuOpen && (
          <div className="absolute inset-0 z-40 flex flex-col bg-[#0a0a0a]">
            <div className="flex items-center justify-between px-7 pt-10 pb-6 shrink-0">
              <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
              <button onClick={() => { setMenuOpen(false); setPanel(null) }} className="font-mono text-[20px] text-[#555] hover:text-white transition-colors leading-none">&times;</button>
            </div>
            {panel ? (
              <div className="flex-1 overflow-y-auto px-7 pb-10">
                <button onClick={() => setPanel(null)} className="font-mono text-[10px] text-[#444] uppercase tracking-[0.15em] mb-8 flex items-center gap-2 hover:text-[#888] transition-colors">
                  &larr; {lang === 'fr' ? 'retour' : 'back'}
                </button>
                {panel === 'about' && (
                  <div>
                    <h2 className="font-serif font-bold text-white text-[20px] mb-6">{t.aboutTitle}</h2>
                    <div className="space-y-4">
                      <p className="font-mono text-[11px] text-[#555] leading-relaxed italic">{t.aboutQuote}</p>
                      <p className="font-mono text-[11px] text-[#555] leading-relaxed">{t.aboutP1}</p>
                      <p className="font-mono text-[11px] text-[#555] leading-relaxed">{t.aboutP2}</p>
                      <p className="font-mono text-[11px] text-[#555] leading-relaxed">{t.aboutP3}</p>
                      <p className="font-mono text-[10px] text-[#333] leading-relaxed mt-6">{t.aboutFooter}</p>
                    </div>
                  </div>
                )}
                {panel === 'how' && (
                  <div>
                    <h2 className="font-serif font-bold text-white text-[20px] mb-6">{t.menuHow}</h2>
                    <div className="space-y-6">
                      {[t.howStep1, t.howStep2, t.howStep3, t.howStep4].map((step, i) => (
                        <div key={i} className="flex gap-4">
                          <span className="font-mono text-[10px] text-[#333] shrink-0 pt-0.5">{i + 1}.</span>
                          <p className="font-mono text-[11px] text-[#555] leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {panel === 'terms' && (
                  <div>
                    <h2 className="font-serif font-bold text-white text-[20px] mb-6">{t.menuTerms}</h2>
                    <div className="space-y-4">
                      {[t.t1, t.t2, t.t3, t.t4, t.t5, t.t6].map((term, i) => (
                        <p key={i} className="font-mono text-[10px] text-[#444] leading-relaxed">{term}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <nav className="flex-1 px-7 flex flex-col">
                {sections.map(s => (
                  <button key={s.key} onClick={() => setPanel(s.key)}
                    className="text-left py-5 font-serif font-bold text-white text-[18px] hover:text-[#aaa] transition-colors"
                    style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                    {s.label}
                  </button>
                ))}
                <Link href="/join" className="py-5 font-serif font-bold text-white text-[18px] hover:text-[#aaa] transition-colors block" style={{ borderBottom: '0.5px solid #1a1a1a' }}>
                  {lang === 'fr' ? 'Se connecter' : 'Sign in'}
                </Link>
                <button onClick={toggleLang} className="text-left py-5 font-mono text-[11px] text-[#555] uppercase tracking-[0.15em] hover:text-[#888] transition-colors mt-auto">
                  {t.menuLanguage}
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useCallback, useState, useEffect } from 'react'
import { signOut, User }         from 'firebase/auth'
import { auth }                  from '@/lib/firebase/client'
import MessageForm               from './MessageForm'
import FeedOverlay               from './FeedOverlay'
import WelcomeModal              from './WelcomeModal'
import type { Message, Profile } from '@/lib/types'
import { T, type Lang }          from '@/lib/translations'

interface Props {
  profile:         Profile
  firebaseUser:    User
  initialMessages: Message[]
}

type MenuPanel = null | 'about' | 'how' | 'account' | 'terms'

function getLang(): Lang {
  if (typeof window === 'undefined') return 'fr'
  return (localStorage.getItem('hpax_lang') as Lang) ?? 'fr'
}

export default function HpaxMain({ profile, firebaseUser, initialMessages }: Props) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [menuPanel,   setMenuPanel]   = useState<MenuPanel>(null)
  const [myCount,     setMyCount]     = useState(profile.messageCount)
  const [lang,        setLang]        = useState<Lang>('fr')

  useEffect(() => { setLang(getLang()) }, [])

  const t = T[lang]

  const handlePosted = useCallback((msg: Message) => {
    setMyCount(msg.slotNumber)
  }, [])

  function toggleLang() {
    const next: Lang = lang === 'fr' ? 'en' : 'fr'
    localStorage.setItem('hpax_lang', next)
    setLang(next)
    setMenuOpen(false)
  }

  async function handleSignOut() {
    await signOut(auth)
    window.location.href = '/'
  }

  function openPanel(p: MenuPanel) {
    setMenuPanel(p)
    setMenuOpen(false)
  }

  const remaining    = 100 - myCount
  const feedPreview  = initialMessages.slice(0, 3)

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      {/* Welcome modal — shows once on first login */}
      <WelcomeModal lang={lang} />

      <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

        {/* Top bar */}
        <div className="w-full relative flex items-center justify-center mb-9 shrink-0">
          <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>{t.logo}</span>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 group"
            aria-label="Menu"
          >
            {[0,1,2].map(i => (
              <span key={i} className={`block w-[18px] h-px transition-colors ${menuOpen ? 'bg-[#777]' : 'bg-[#444]'} group-hover:bg-[#777]`} />
            ))}
          </button>
        </div>

        {/* Counter */}
        <div className="flex flex-col items-center leading-none shrink-0" style={{ marginBottom: '40px' }}>
          <div className="font-serif font-bold text-white" style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}>
            {remaining}
          </div>
          <div className="w-24 h-px bg-[#444]" style={{ margin: '4px 0 8px' }} />
          <div className="font-serif text-[#555]" style={{ fontSize: '30px', letterSpacing: '-1px' }}>
            100
          </div>
        </div>

        {/* Zero state OR form */}
        {remaining === 0 ? (
          <div className="w-full flex flex-col items-center mb-[30px]">
            <p className="font-serif italic text-[#444] text-[13px] mt-2">{t.youveSaid}</p>
          </div>
        ) : (
          <MessageForm
            slotCount={myCount}
            displayName={profile.displayName}
            firebaseUser={firebaseUser}
            onPosted={handlePosted}
            lang={lang}
          />
        )}

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
                <p className="font-serif text-[14px] italic text-[#ccc]" style={{ lineHeight: 1.35 }}>
                  &ldquo;{msg.content}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 h-10" />
      </div>

      {/* Feed overlay */}
      <FeedOverlay open={overlayOpen} messages={initialMessages} onClose={() => setOverlayOpen(false)} lang={lang} />

      {/* Hamburger dropdown */}
      {menuOpen && (
        <>
          <div className="absolute inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-7 top-12 z-30 flex flex-col overflow-hidden"
            style={{ background: '#111', border: '0.5px solid #222', borderRadius: '8px', minWidth: '200px' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #1a1a1a' }}>
              <div className="font-mono text-[9px] text-[#555] uppercase" style={{ letterSpacing: '0.12em', marginBottom: '2px' }}>
                {lang === 'fr' ? 'Connecté en tant que' : 'Signed in as'}
              </div>
              <div className="font-mono text-[11px] text-[#888]">{profile.displayName}</div>
              <div className="font-mono text-[9px] text-[#444]" style={{ marginTop: '4px' }}>{myCount}/100 {lang === 'fr' ? 'utilisés' : 'used'}</div>
            </div>
            {([
              { label: t.menuAbout,   panel: 'about'   as MenuPanel },
              { label: t.menuHow,     panel: 'how'     as MenuPanel },
              { label: t.menuAccount, panel: 'account' as MenuPanel },
              { label: t.menuTerms,   panel: 'terms'   as MenuPanel },
            ] as { label: string; panel: MenuPanel }[]).map(item => (
              <button key={item.panel!} onClick={() => openPanel(item.panel)}
                className="font-mono text-[11px] text-[#666] hover:text-white text-left transition-colors"
                style={{ padding: '11px 16px', borderBottom: '0.5px solid #1a1a1a' }}>
                {item.label}
              </button>
            ))}
            <button onClick={toggleLang}
              className="font-mono text-[11px] text-[#555] hover:text-white text-left transition-colors"
              style={{ padding: '11px 16px', borderBottom: '0.5px solid #1a1a1a' }}>
              {t.menuLanguage}
            </button>
            <button onClick={handleSignOut}
              className="font-mono text-[11px] text-[#555] hover:text-white text-left transition-colors"
              style={{ padding: '11px 16px' }}>
              {t.menuSignOut}
            </button>
          </div>
        </>
      )}

      {/* Menu panels */}
      {menuPanel && (
        <MenuPanelOverlay panel={menuPanel} profile={profile} myCount={myCount} lang={lang} onClose={() => setMenuPanel(null)} />
      )}
    </div>
  )
}

/* ── Menu panel overlay ── */
function MenuPanelOverlay({ panel, profile, myCount, lang, onClose }:
  { panel: MenuPanel; profile: Profile; myCount: number; lang: Lang; onClose: () => void }) {
  const t = T[lang]
  const titles: Record<NonNullable<MenuPanel>, string> = {
    about: t.aboutTitle, how: t.menuHow, account: t.menuAccount, terms: t.menuTerms,
  }
  return (
    <div className="absolute inset-0 z-40 flex flex-col overflow-y-auto"
      style={{ background: '#0a0a0a', padding: '40px 28px' }}>
      <div className="flex items-center justify-between shrink-0" style={{ marginBottom: '32px' }}>
        <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
        <button onClick={onClose} className="font-mono text-[18px] text-[#555] hover:text-white transition-colors leading-none">✕</button>
      </div>
      <h2 className="font-serif text-white font-bold text-[22px]" style={{ marginBottom: '24px' }}>{titles[panel!]}</h2>
      {panel === 'about'   && <AboutContent t={t} />}
      {panel === 'how'     && <HowContent t={t} />}
      {panel === 'account' && <AccountContent t={t} profile={profile} myCount={myCount} />}
      {panel === 'terms'   && <TermsContent t={t} />}
    </div>
  )
}

function AboutContent({ t }: { t: typeof T['en'] }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="font-serif text-[#ccc] text-[15px] italic leading-relaxed">{t.aboutQuote}</p>
      <p className="font-mono text-[11px] text-[#666] leading-relaxed">{t.aboutP1}</p>
      <p className="font-mono text-[11px] text-[#666] leading-relaxed">{t.aboutP2}</p>
      <p className="font-mono text-[11px] text-[#555] leading-relaxed">{t.aboutP3}</p>
      <div className="mt-4" style={{ borderTop: '0.5px solid #1a1a1a', paddingTop: '16px' }}>
        <p className="font-mono text-[10px] text-[#444]" style={{ letterSpacing: '0.12em' }}>{t.aboutFooter}</p>
      </div>
    </div>
  )
}

function HowContent({ t }: { t: typeof T['en'] }) {
  const steps = [
    { n: '01', title: t.howStep1Title, body: t.howStep1 },
    { n: '02', title: t.howStep2Title, body: t.howStep2 },
    { n: '03', title: t.howStep3Title, body: t.howStep3 },
    { n: '04', title: t.howStep4Title, body: t.howStep4 },
  ]
  return (
    <div className="flex flex-col gap-6">
      {steps.map(s => (
        <div key={s.n} className="flex gap-4">
          <span className="font-mono text-[11px] text-[#333] shrink-0 mt-[2px]">{s.n}</span>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[11px] text-[#888] uppercase" style={{ letterSpacing: '0.12em' }}>{s.title}</span>
            <p className="font-mono text-[11px] text-[#555] leading-relaxed">{s.body}</p>
          </div>
        </div>
      ))}
      <div className="mt-2" style={{ borderTop: '0.5px solid #1a1a1a', paddingTop: '16px' }}>
        <p className="font-mono text-[10px] text-[#444] leading-relaxed">{t.howFooter}</p>
      </div>
    </div>
  )
}

function AccountContent({ t, profile, myCount }: { t: typeof T['en']; profile: Profile; myCount: number }) {
  return (
    <div className="flex flex-col gap-5">
      <div style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
        <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>{t.accountName}</div>
        <div className="font-serif text-white text-[16px]">{profile.displayName}</div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1" style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
          <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>{t.accountUsed}</div>
          <div className="font-serif text-white text-[22px] font-bold">{myCount}</div>
        </div>
        <div className="flex-1" style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
          <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>{t.accountLeft}</div>
          <div className="font-serif text-white text-[22px] font-bold">{100 - myCount}</div>
        </div>
      </div>
      {profile.verified && <div className="font-mono text-[10px] text-[#555]">{t.accountVerified}</div>}
      <p className="font-mono text-[10px] text-[#444] leading-relaxed">{t.accountNote}</p>
    </div>
  )
}

function TermsContent({ t }: { t: typeof T['en'] }) {
  const items = [
    [t.t1title, t.t1], [t.t2title, t.t2], [t.t3title, t.t3],
    [t.t4title, t.t4], [t.t5title, t.t5], [t.t6title, t.t6],
  ]
  return (
    <div className="flex flex-col gap-4">
      {items.map(([title, body]) => (
        <div key={title}>
          <div className="font-mono text-[10px] text-[#666] uppercase mb-1" style={{ letterSpacing: '0.1em' }}>{title}</div>
          <p className="font-mono text-[10px] text-[#444] leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  )
}

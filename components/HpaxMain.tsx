'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { signOut, User }         from 'firebase/auth'
import { auth }                  from '@/lib/firebase/client'
import MessageForm               from './MessageForm'
import FeedOverlay               from './FeedOverlay'
import type { Message, Profile } from '@/lib/types'

interface Props {
  profile:         Profile
  firebaseUser:    User
  initialMessages: Message[]
}

type MenuPanel = null | 'about' | 'how' | 'account' | 'terms'

export default function HpaxMain({ profile, firebaseUser, initialMessages }: Props) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [menuPanel,   setMenuPanel]   = useState<MenuPanel>(null)
  const [myCount,     setMyCount]     = useState(profile.messageCount)

  const handlePosted = useCallback((msg: Message) => {
    setMyCount(msg.slotNumber)
  }, [])

  async function handleSignOut() {
    await signOut(auth)
    window.location.href = '/'
  }

  function openPanel(p: MenuPanel) {
    setMenuPanel(p)
    setMenuOpen(false)
  }

  const feedPreview = initialMessages.slice(0, 3)

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

        {/* Top bar */}
        <div className="w-full relative flex items-center justify-center mb-9 shrink-0" style={{ marginBottom: '36px' }}>
          <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-1 group"
            aria-label="Menu"
          >
            <span className={`block w-[18px] h-px transition-colors ${menuOpen ? 'bg-[#777]' : 'bg-[#444]'} group-hover:bg-[#777]`} />
            <span className={`block w-[18px] h-px transition-colors ${menuOpen ? 'bg-[#777]' : 'bg-[#444]'} group-hover:bg-[#777]`} />
            <span className={`block w-[18px] h-px transition-colors ${menuOpen ? 'bg-[#777]' : 'bg-[#444]'} group-hover:bg-[#777]`} />
          </button>
        </div>

        {/* Counter */}
        <div className="flex flex-col items-center leading-none shrink-0" style={{ marginBottom: '40px' }}>
          <div className="font-serif font-bold text-white" style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}>
            {100 - myCount}
          </div>
          <div className="w-24 h-px bg-[#444]" style={{ margin: '4px 0 8px' }} />
          <div className="font-serif text-[#555]" style={{ fontSize: '30px', letterSpacing: '-1px' }}>
            100
          </div>
        </div>

        {/* Message form */}
        <MessageForm
          slotCount={myCount}
          displayName={profile.displayName}
          firebaseUser={firebaseUser}
          onPosted={handlePosted}
        />

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

      {/* Full-screen feed overlay */}
      <FeedOverlay open={overlayOpen} messages={initialMessages} onClose={() => setOverlayOpen(false)} />

      {/* ── Hamburger dropdown ── */}
      {menuOpen && (
        <>
          <div className="absolute inset-0 z-20" onClick={() => setMenuOpen(false)} />
          <div
            className="absolute right-7 top-12 z-30 flex flex-col overflow-hidden"
            style={{ background: '#111', border: '0.5px solid #222', borderRadius: '8px', minWidth: '200px' }}
          >
            {/* User header */}
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #1a1a1a' }}>
              <div className="font-mono text-[9px] text-[#555] uppercase" style={{ letterSpacing: '0.12em', marginBottom: '2px' }}>Signed in as</div>
              <div className="font-mono text-[11px] text-[#888]">{profile.displayName}</div>
              <div className="font-mono text-[9px] text-[#444]" style={{ marginTop: '4px' }}>{myCount}/100 messages used</div>
            </div>
            {/* Menu items */}
            {[
              { label: 'À propos de HPAX',   panel: 'about'   as MenuPanel },
              { label: 'Comment ça marche',  panel: 'how'     as MenuPanel },
              { label: 'Mon compte',         panel: 'account' as MenuPanel },
              { label: 'Conditions',         panel: 'terms'   as MenuPanel },
            ].map(item => (
              <button
                key={item.panel}
                onClick={() => openPanel(item.panel)}
                className="font-mono text-[11px] text-[#666] hover:text-white text-left transition-colors"
                style={{ padding: '11px 16px', borderBottom: '0.5px solid #1a1a1a' }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleSignOut}
              className="font-mono text-[11px] text-[#555] hover:text-white text-left transition-colors"
              style={{ padding: '11px 16px' }}
            >
              Se déconnecter
            </button>
          </div>
        </>
      )}

      {/* ── Menu panels ── */}
      {menuPanel && (
        <MenuPanelOverlay panel={menuPanel} profile={profile} myCount={myCount} onClose={() => setMenuPanel(null)} />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────── */
/*  Menu panel overlay                         */
/* ─────────────────────────────────────────── */
function MenuPanelOverlay({
  panel,
  profile,
  myCount,
  onClose,
}: {
  panel:   MenuPanel
  profile: Profile
  myCount: number
  onClose: () => void
}) {
  const titles: Record<NonNullable<MenuPanel>, string> = {
    about:   'À propos',
    how:     'Comment ça marche',
    account: 'Mon compte',
    terms:   'Conditions',
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto"
      style={{ background: '#0a0a0a', padding: '40px 28px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between shrink-0" style={{ marginBottom: '32px' }}>
        <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
        <button onClick={onClose} className="font-mono text-[18px] text-[#555] hover:text-white transition-colors leading-none">✕</button>
      </div>

      <h2 className="font-serif text-white font-bold text-[22px]" style={{ marginBottom: '24px' }}>
        {titles[panel!]}
      </h2>

      {panel === 'about' && <AboutContent />}
      {panel === 'how'   && <HowContent />}
      {panel === 'account' && <AccountContent profile={profile} myCount={myCount} />}
      {panel === 'terms' && <TermsContent />}
    </div>
  )
}

function AboutContent() {
  return (
    <div className="flex flex-col gap-5">
      <p className="font-serif text-[#ccc] text-[15px] italic leading-relaxed">
        &ldquo;100 messages. À vie. Pas un de plus.&rdquo;
      </p>
      <p className="font-mono text-[11px] text-[#666] leading-relaxed" style={{ letterSpacing: '0.02em' }}>
        HPAX repose sur une idée simple : chaque être humain a droit à 100 messages dans sa vie numérique. Pas de fil infini, pas de scroll sans fin — juste 100 chances de dire quelque chose qui compte vraiment.
      </p>
      <p className="font-mono text-[11px] text-[#666] leading-relaxed" style={{ letterSpacing: '0.02em' }}>
        Quand vous publiez, votre compteur descend. Quand il atteint zéro, votre voix sur HPAX est permanente — et silencieuse.
      </p>
      <p className="font-mono text-[11px] text-[#555] leading-relaxed" style={{ letterSpacing: '0.02em' }}>
        Ce n&apos;est pas Twitter. Ce n&apos;est pas Instagram. C&apos;est un registre — un endroit où chaque mot a du poids parce qu&apos;il fait partie d&apos;un nombre fini.
      </p>
      <div className="mt-4" style={{ borderTop: '0.5px solid #1a1a1a', paddingTop: '16px' }}>
        <p className="font-mono text-[10px] text-[#444]" style={{ letterSpacing: '0.12em' }}>HPAX — Human Permanent Archive of eXperience</p>
      </div>
    </div>
  )
}

function HowContent() {
  const steps = [
    { n: '01', title: 'Créez votre compte', body: 'Entrez votre email. Vous recevez un lien de connexion — aucun mot de passe nécessaire.' },
    { n: '02', title: 'Choisissez votre nom', body: 'Votre nom est permanent. Il apparaîtra sur chaque message que vous publiez, pour toujours.' },
    { n: '03', title: 'Écrivez ce qui compte', body: 'Vous avez 100 messages à vie. Chaque message est horodaté et numéroté (ex : 3/100). Il est public et permanent.' },
    { n: '04', title: 'Votre héritage', body: 'Une fois votre 100e message publié, votre profil reste visible dans le feed pour toujours. Votre voix, figée dans le temps.' },
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
        <p className="font-mono text-[10px] text-[#444] leading-relaxed">
          Les messages sont limités à 100 mots. Pas de modifications, pas de suppressions une fois publiés — sauf décision de modération.
        </p>
      </div>
    </div>
  )
}

function AccountContent({ profile, myCount }: { profile: Profile; myCount: number }) {
  const remaining = 100 - myCount
  return (
    <div className="flex flex-col gap-5">
      <div style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
        <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>Nom</div>
        <div className="font-serif text-white text-[16px]">{profile.displayName}</div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1" style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
          <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>Utilisés</div>
          <div className="font-serif text-white text-[22px] font-bold">{myCount}</div>
        </div>
        <div className="flex-1" style={{ border: '0.5px solid #1a1a1a', borderRadius: '6px', padding: '16px' }}>
          <div className="font-mono text-[9px] text-[#444] uppercase mb-1" style={{ letterSpacing: '0.12em' }}>Restants</div>
          <div className="font-serif text-white text-[22px] font-bold">{remaining}</div>
        </div>
      </div>
      {profile.verified && (
        <div className="font-mono text-[10px] text-[#555]" style={{ letterSpacing: '0.08em' }}>
          ✓ Compte vérifié
        </div>
      )}
      <p className="font-mono text-[10px] text-[#444] leading-relaxed" style={{ marginTop: '8px' }}>
        Votre nom est permanent et ne peut pas être modifié. Chaque message publié est définitif.
      </p>
    </div>
  )
}

function TermsContent() {
  return (
    <div className="flex flex-col gap-4">
      {[
        ['1. Caractère définitif', 'Tout message publié sur HPAX est permanent. Aucune modification ou suppression n\'est possible après publication, sauf en cas de violation des présentes conditions.'],
        ['2. Limite de 100 messages', 'Chaque utilisateur dispose de 100 messages à vie. Cette limite est stricte et non extensible.'],
        ['3. Contenu', 'Vous êtes seul responsable du contenu que vous publiez. Tout contenu illégal, haineux, ou portant atteinte à des tiers est interdit. HPAX se réserve le droit de supprimer tout contenu en violation de ces règles.'],
        ['4. Identité', 'Vous vous engagez à renseigner votre vrai nom. Les pseudonymes et usurpations d\'identité sont interdits.'],
        ['5. Données', 'Vos messages sont publics et accessibles à tous. Votre email n\'est jamais affiché publiquement.'],
        ['6. Modération', 'HPAX dispose d\'une équipe de modération pouvant supprimer tout contenu sans préavis en cas de violation des présentes conditions.'],
      ].map(([title, body]) => (
        <div key={title}>
          <div className="font-mono text-[10px] text-[#666] uppercase mb-1" style={{ letterSpacing: '0.1em' }}>{title}</div>
          <p className="font-mono text-[10px] text-[#444] leading-relaxed">{body}</p>
        </div>
      ))}
    </div>
  )
}

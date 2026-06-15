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

export default function HpaxMain({ profile, firebaseUser, initialMessages }: Props) {
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [myCount,     setMyCount]     = useState(profile.messageCount)
  const menuRef = useRef<HTMLDivElement>(null)

  const handlePosted = useCallback((msg: Message) => {
    setMyCount(msg.slotNumber)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    function onOut(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onOut)
    return () => document.removeEventListener('mousedown', onOut)
  }, [menuOpen])

  async function handleSignOut() {
    await signOut(auth)
    window.location.href = '/'
  }

  const feedPreview = initialMessages.slice(0, 3)

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0a0a0a]">
      <div className="flex flex-col items-center h-full pt-10 px-7 overflow-y-auto">

        {/* Top bar */}
        <div className="w-full relative flex items-center justify-center mb-9 shrink-0">
          <span className="font-mono text-[13px] tracking-[0.3em] text-[#666]">HPAX</span>
          <div ref={menuRef} className="absolute right-0 top-1/2 -translate-y-1/2">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="flex flex-col gap-1 p-2 -m-2 cursor-pointer"
              aria-label="Menu"
            >
              {[0, 1, 2].map(i => (
                <span key={i} className={`block w-[18px] h-px transition-colors ${menuOpen ? 'bg-[#777]' : 'bg-[#444]'}`} />
              ))}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 flex flex-col bg-[#111] border border-[#222] rounded-[6px] overflow-hidden z-30 min-w-[140px]">
                <span className="font-mono text-[9px] text-[#555] px-3 py-2 uppercase tracking-[0.12em] border-b border-[#1a1a1a]">
                  {profile.displayName}{profile.verified && <span className="ml-1">✓</span>}
                </span>
                <button
                  onClick={handleSignOut}
                  className="font-mono text-[10px] text-[#666] hover:text-white px-3 py-3 text-left transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Counter — personal slot count */}
        <div className="flex flex-col items-center mb-10 leading-none shrink-0">
          <div
            className="font-serif font-bold text-white"
            style={{ fontSize: '124px', letterSpacing: '-5px', lineHeight: 1 }}
          >
            {100 - myCount}
          </div>
          <div className="w-24 h-px bg-[#444] my-1" />
          <div className="font-serif text-[#555]" style={{ fontSize: '30px', letterSpacing: '-1px' }}>
            100
          </div>
        </div>

        {/* Input form */}
        <MessageForm
          slotCount={myCount}
          displayName={profile.displayName}
          firebaseUser={firebaseUser}
          onPosted={handlePosted}
        />

        {/* Feed preview — click to expand */}
        <div
          className="w-full cursor-pointer"
          onClick={() => setOverlayOpen(true)}
        >
          {feedPreview.map(msg => (
            <div key={msg.id} className="flex items-baseline gap-3 py-3 border-b border-[#1a1a1a]">
              <div className="font-mono text-[10px] text-[#555] min-w-[46px] shrink-0">
                <span className="text-[#999]">{msg.slotNumber}</span>/100
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="font-mono text-[9px] tracking-[0.12em] text-[#666] uppercase">
                  {msg.displayName}{msg.verified && <span className="ml-1 text-[#555]">✓</span>}
                </span>
                <p className="font-serif text-[14px] italic leading-[1.35] text-[#ccc]">
                  &ldquo;{msg.content}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="shrink-0 h-10" />
      </div>

      {/* Full-screen feed overlay */}
      <FeedOverlay
        open={overlayOpen}
        messages={initialMessages}
        onClose={() => setOverlayOpen(false)}
      />
    </div>
  )
}

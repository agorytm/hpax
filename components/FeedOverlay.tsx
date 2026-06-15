'use client'
import { useEffect, useRef } from 'react'
import type { Message }      from '@/lib/types'
import type { Lang }         from '@/lib/translations'
import { T }                 from '@/lib/translations'
import FeedEntry             from './FeedEntry'

interface Props {
  messages: Message[]
  open:     boolean
  onClose:  () => void
  lang?:    Lang
}

export default function FeedOverlay({ messages, open, onClose, lang = 'fr' }: Props) {
  const t         = T[lang]
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0
  }, [open])

  return (
    <div
      className="absolute inset-0 bg-[#0a0a0a] z-10"
      style={{
        opacity:       open ? 1 : 0,
        transition:    open ? 'opacity 0.35s cubic-bezier(0.22,1,0.36,1)' : 'opacity 0.3s ease',
        pointerEvents: open ? 'auto' : 'none',
      }}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 flex flex-col"
        style={{
          transform:  open ? 'translateY(0)' : 'translateY(48px)',
          transition: open ? 'transform 0.45s cubic-bezier(0.22,1,0.36,1)' : 'transform 0.25s ease-in',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 px-7 pt-10" style={{ marginBottom: '28px' }}>
          <span className="font-mono text-[13px] text-[#666]" style={{ letterSpacing: '0.3em' }}>HPAX</span>
          <button onClick={onClose} className="font-mono text-[18px] text-[#555] hover:text-white transition-colors leading-none" aria-label="Fermer">✕</button>
        </div>

        {/* Feed */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 px-7 pb-10">
          {messages.length === 0 ? (
            <p className="font-mono text-[11px] text-[#444] mt-16 text-center">{t.feedEmpty}</p>
          ) : (
            messages.map((msg, i) => (
              <div key={msg.id} style={{
                opacity:    open ? 1 : 0,
                transform:  open ? 'translateY(0)' : 'translateY(14px)',
                transition: open
                  ? `opacity 0.5s ease ${0.08 + i * 0.055}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${0.08 + i * 0.055}s`
                  : 'none',
              }}>
                <FeedEntry message={msg} highlight={msg.slotNumber <= 10} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

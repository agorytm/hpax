'use client'
import { useEffect, useState } from 'react'
import type { Lang }           from '@/lib/translations'
import { T }                   from '@/lib/translations'

interface Props {
  lang: Lang
}

export default function WelcomeModal({ lang }: Props) {
  const t = T[lang]
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const key = 'hpax_welcomed'
    if (!localStorage.getItem(key)) {
      setVisible(true)
    }
    setMounted(true)
  }, [])

  function dismiss() {
    localStorage.setItem('hpax_welcomed', '1')
    setVisible(false)
  }

  if (!mounted || !visible) return null

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col items-center justify-center px-7"
      style={{ background: 'rgba(10,10,10,0.97)' }}
    >
      {/* Logo */}
      <div className="font-mono text-[13px] text-[#444] mb-12" style={{ letterSpacing: '0.3em' }}>
        HPAX
      </div>

      {/* Title */}
      <h2
        className="font-serif font-bold text-white text-center mb-6"
        style={{ fontSize: '26px', lineHeight: 1.2, letterSpacing: '-0.5px' }}
      >
        {t.welcomeTitle}
      </h2>

      {/* Body */}
      <p
        className="font-mono text-[#555] text-center leading-relaxed mb-8"
        style={{ fontSize: '11px', letterSpacing: '0.02em' }}
      >
        {t.welcomeBody}
      </p>

      {/* Subtitle */}
      <p
        className="font-serif italic text-[#777] text-center mb-12"
        style={{ fontSize: '14px' }}
      >
        {t.welcomeSubtitle}
      </p>

      {/* Divider */}
      <div className="w-16 h-px bg-[#222] mb-12" />

      {/* Button */}
      <button
        onClick={dismiss}
        className="w-full font-serif font-bold text-white text-center transition-all hover:bg-white hover:text-[#0a0a0a]"
        style={{
          fontSize: '16px',
          border: '0.5px solid #fff',
          borderRadius: '6px',
          padding: '17px',
        }}
      >
        {t.welcomeButton}
      </button>
    </div>
  )
}

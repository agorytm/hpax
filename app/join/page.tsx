'use client'

import { useState } from 'react'
import { sendSignInLinkToEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

type Step = 'email' | 'sent'

export default function JoinPage() {
  const [step,    setStep]    = useState<Step>('email')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || loading) return

    setLoading(true)
    setError(null)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin

    try {
      await sendSignInLinkToEmail(auth, email.trim().toLowerCase(), {
        // Firebase redirigera vers cette URL après le clic sur le lien
        url:             `${siteUrl}/auth/finish`,
        handleCodeInApp: true,
      })

      // Sauvegarde l'email pour le retrouver sur la page /auth/finish
      // (même appareil) ou pour afficher un message utile
      window.localStorage.setItem('hpax_email_for_sign_in', email.trim().toLowerCase())
      setStep('sent')

    } catch (err: unknown) {
      console.error(err)
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#1a1a1a]">
      <div className="w-full max-w-[360px]">

        <p className="font-mono text-[13px] tracking-[0.3em] text-[#666] text-center mb-16">
          HPAX
        </p>

        {step === 'email' ? (
          <form onSubmit={handleSend} className="flex flex-col gap-4">
            <p className="text-[#555] font-mono text-[11px] tracking-[0.12em] uppercase mb-2">
              Enter your email to begin.
            </p>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
              autoComplete="email"
              autoFocus
            />
            {error && (
              <p className="text-[#666] font-mono text-[11px]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full border border-white rounded-[6px] text-white font-serif text-[16px] font-bold py-4 transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-white font-serif text-[18px] mb-3">
              Check your inbox.
            </p>
            <p className="text-[#555] font-mono text-[11px] tracking-wide">
              We sent a link to{' '}
              <span className="text-[#888]">{email}</span>
            </p>
      
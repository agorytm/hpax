'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export default function JoinNamePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idToken, setIdToken] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      if (!user) { router.replace('/join'); return }

      // Check via /api/me — if profile already exists, skip straight to app
      const token = await user.getIdToken()
      const meRes = await fetch('/api/me', { headers: { 'Authorization': `Bearer ${token}` } })
      const { profile } = await meRes.json().catch(() => ({ profile: null }))
      if (profile) { router.replace('/'); return }

      setIdToken(token)
    })
    return () => unsub()
  }, [router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const fn = firstName.trim()
    const ln = lastName.trim()
    if (!fn || !ln || loading || !idToken) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body: JSON.stringify({ displayName: `${fn} ${ln}` }),
    })
    setLoading(false)
    if (!res.ok) { setError('Could not create your profile. Try again.'); return }
    router.replace('/')
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#1a1a1a]">
      <div className="w-full max-w-[360px]">
        <p className="font-mono text-[13px] tracking-[0.3em] text-[#666] text-center mb-16">HPAX</p>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <p className="text-[#555] font-mono text-[11px] tracking-[0.12em] uppercase mb-2">
            Your name — permanent, choose carefully.
          </p>
          <input type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
            placeholder="First name" maxLength={30} autoFocus
            className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
          />
          <input type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
            placeholder="Last name" maxLength={30}
            className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
          />
          {error && <p className="text-[#666] font-mono text-[11px]">{error}</p>}
          <button type="submit" disabled={loading || !firstName.trim() || !lastName.trim() || !idToken}
            className="w-full border border-white rounded-[6px] text-white font-serif text-[16px] font-bold py-4 mt-2 transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed">
            {loading ? 'Creating...' : 'This is my name.'}
          </button>
        </form>
      </div>
    </main>
  )
}

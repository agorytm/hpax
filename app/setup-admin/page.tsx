'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'

export default function SetupAdminPage() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'noauth'>('loading')
  const [masterKey, setMasterKey] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setStatus(user ? 'ready' : 'noauth')
    })
    return () => unsub()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setResult(null)
    try {
      const user = auth.currentUser
      if (!user) { setResult('Non connecté.'); setBusy(false); return }
      const token = await user.getIdToken()
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ masterKey }),
      })
      const json = await res.json()
      if (res.ok) {
        setResult('✓ Admin activé ! Déconnecte-toi et reconnecte-toi, puis va sur /admin')
      } else {
        setResult(`✗ ${json.error}`)
      }
    } catch (err) {
      setResult('Erreur réseau')
    }
    setBusy(false)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
      <div className="w-full max-w-[360px] flex flex-col gap-6">
        <span className="font-mono text-[11px] text-[#444] tracking-[0.3em]">HPAX — SETUP ADMIN</span>

        {status === 'loading' && (
          <p className="font-mono text-[11px] text-[#333]">Chargement…</p>
        )}

        {status === 'noauth' && (
          <p className="font-mono text-[11px] text-[#555]">
            Tu dois être connecté sur hpax.app avant d&apos;accéder à cette page.{' '}
            <a href="/join" className="text-[#888] underline">Se connecter</a>
          </p>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="font-mono text-[9px] text-[#444] uppercase tracking-[0.15em]">
                Master key
              </label>
              <input
                type="password"
                value={masterKey}
                onChange={e => setMasterKey(e.target.value)}
                placeholder="Entrez la master key"
                className="bg-transparent border border-[#222] rounded-[4px] font-mono text-[12px] px-3 py-2 text-white placeholder-[#333] outline-none focus:border-[#444]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={busy || !masterKey}
              className="font-mono text-[11px] text-[#888] border border-[#333] rounded-[4px] py-2 hover:border-[#555] hover:text-white transition-colors disabled:opacity-30"
            >
              {busy ? '…' : 'Activer admin'}
            </button>
            {result && (
              <p className={`font-mono text-[11px] ${result.startsWith('✓') ? 'text-[#4a4]' : 'text-[#a44]'}`}>
                {result}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}

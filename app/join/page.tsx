'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'register'

export default function JoinPage() {
  const [mode,     setMode]     = useState<Mode>('login')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const router = useRouter()

  function switchMode(m: Mode) { setMode(m); setError(null) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
        const snap = await getDoc(doc(db, 'profiles', cred.user.uid))
        router.replace(snap.exists() ? '/' : '/join/name')
      } else {
        await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
        router.replace('/join/name')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Email ou mot de passe incorrect.')
      } else if (code === 'auth/email-already-in-use') {
        setError('Email déjà utilisé — connectez-vous.')
      } else if (code === 'auth/weak-password') {
        setError('Mot de passe trop court (6 caractères min).')
      } else if (code === 'auth/invalid-email') {
        setError('Adresse email invalide.')
      } else {
        setError('Erreur. Réessayez.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#0a0a0a]">
      <div className="w-full max-w-[360px]">

        <p className="font-mono text-[13px] tracking-[0.3em] text-[#666] text-center mb-16">
          HPAX
        </p>

        {/* Mode toggle */}
        <div className="flex gap-6 mb-8">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${mode === 'login' ? 'text-white' : 'text-[#444] hover:text-[#666]'}`}
          >
            Se connecter
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`font-mono text-[11px] tracking-[0.12em] uppercase transition-colors ${mode === 'register' ? 'text-white' : 'text-[#444] hover:text-[#666]'}`}
          >
            Première connexion
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
            autoComplete="email"
            autoFocus
          />
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Choisir un mot de passe' : 'Mot de passe'}
            className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {error && (
            <p className="text-[#c55] font-mono text-[11px]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full border border-white rounded-[6px] text-white font-serif text-[16px] font-bold py-4 transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

      </div>
    </main>
  )
}

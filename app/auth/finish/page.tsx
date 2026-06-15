'use client'

export const dynamic = 'force-dynamic'

// /auth/finish — page vers laquelle Firebase redirige après clic sur le magic link.
// Cette page finalise la connexion et redirige vers l'app ou l'onboarding nom.

import { useEffect, useState } from 'react'
import { useRouter }           from 'next/navigation'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { doc, getDoc }         from 'firebase/firestore'
import { auth, db }            from '@/lib/firebase/client'

type Status = 'loading' | 'need_email' | 'error'

export default function AuthFinishPage() {
  const [status,   setStatus]   = useState<Status>('loading')
  const [email,    setEmail]    = useState('')
  const [inputVal, setInputVal] = useState('')
  const [errMsg,   setErrMsg]   = useState('')
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Vérifie que l'URL est bien un lien de connexion Firebase
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setStatus('error')
      setErrMsg('Invalid or expired link.')
      return
    }

    // Récupère l'email sauvegardé (même appareil)
    const saved = window.localStorage.getItem('hpax_email_for_sign_in') ?? ''
    if (saved) {
      // Appareil identique → connexion automatique
      finishSignIn(saved)
    } else {
      // Appareil différent → demande l'email
      setStatus('need_email')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function finishSignIn(emailToUse: string) {
    setStatus('loading')
    try {
      const result = await signInWithEmailLink(auth, emailToUse, window.location.href)
      window.localStorage.removeItem('hpax_email_for_sign_in')

      // Vérifie si le profil existe déjà
      const profileSnap = await getDoc(doc(db, 'profiles', result.user.uid))

      if (!profileSnap.exists()) {
        router.replace('/join/name')
      } else {
        router.replace('/')
      }
    } catch (err: unknown) {
      console.error(err)
      setStatus('error')
      setErrMsg('The link is invalid or has expired. Please try again.')
    }
  }

  if (status === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#1a1a1a]">
        <p className="font-mono text-[12px] text-[#444]">Signing you in…</p>
      </main>
    )
  }

  if (status === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-[#1a1a1a]">
        <div className="text-center">
          <p className="font-mono text-[12px] text-[#666] mb-6">{errMsg}</p>
          <a href="/join" className="font-serif text-white underline text-[14px]">
            Try again
          </a>
        </div>
      </main>
    )
  }

  // Appareil différent : demande l'email
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-[#1a1a1a]">
      <div className="w-full max-w-[360px]">
        <p className="font-mono text-[13px] tracking-[0.3em] text-[#666] text-center mb-16">
          HPAX
        </p>
        <form
          onSubmit={e => { e.preventDefault(); if (inputVal.trim()) finishSignIn(inputVal.trim()) }}
          className="flex flex-col gap-4"
        >
          <p className="text-[#555] font-mono text-[11px] tracking-[0.12em] uppercase mb-2">
            Confirm your email to sign in.
          </p>
          <input
            type="email"
            required
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="your@email.com"
            className="w-full bg-transparent border border-[#333] rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] focus:border-[#555] transition-colors"
            autoFocus
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="w-full border border-white rounded-[6px] text-white font-serif text-[16px] font-bold py-4 transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30"
          >
            Continue
          </button>
        </form>
      </div>
    </main>
  )
}

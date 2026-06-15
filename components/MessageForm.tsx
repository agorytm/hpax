'use client'

import { useState } from 'react'
import type { User } from 'firebase/auth'
import ShareModal   from './ShareModal'
import type { Message } from '@/lib/types'

const MAX_WORDS = 100

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface Props {
  slotCount:    number
  displayName:  string
  firebaseUser: User
  onPosted:     (msg: Message) => void
}

export default function MessageForm({ slotCount, displayName, firebaseUser, onPosted }: Props) {
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [shareMsg, setShareMsg] = useState<Message | null>(null)

  const wordCount = countWords(content)
  const overLimit = wordCount > MAX_WORDS

  if (slotCount >= 100) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || loading || overLimit) return

    setLoading(true)
    setError(null)

    const idToken = await firebaseUser.getIdToken()
    const res = await fetch('/api/post', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body:    JSON.stringify({ content: trimmed }),
    })

    setLoading(false)
    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      const code = json.error as string
      if (code === 'LIMIT_REACHED')   setError('You have said your 100 things.')
      else if (code === 'TOO_MANY_WORDS') setError('Too long.')
      else if (code === 'RATE_LIMITED')   setError('Wait a moment before posting again.')
      else setError('Something went wrong. Try again.')
      return
    }

    const newMsg: Message = { ...json.message, createdAt: null }
    setContent('')
    onPosted(newMsg)
    setShareMsg(newMsg)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-[14px] mb-[30px]">
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Say something that matters."
          rows={3}
          className={`w-full bg-transparent border rounded-[6px] text-white font-mono text-[12px] px-4 py-4 outline-none placeholder-[#444] transition-colors resize-none ${overLimit ? 'border-[#553333]' : 'border-[#333] focus:border-[#555]'}`}
          disabled={loading}
        />
        {error && <p className="font-mono text-[11px] text-[#666]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !content.trim() || overLimit}
          className="w-full bg-transparent border border-white rounded-[6px] text-white font-serif text-[16px] font-bold py-[17px] transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {loading ? '...' : 'I have said.'}
        </button>
      </form>

      {shareMsg && (
        <ShareModal
          open
          onClose={() => setShareMsg(null)}
          content={shareMsg.content}
          slotNumber={shareMsg.slotNumber}
          displayName={displayName}
        />
      )}
    </>
  )
}

'use client'
import { useState }       from 'react'
import type { User }      from 'firebase/auth'
import ShareModal         from './ShareModal'
import type { Message }   from '@/lib/types'
import { T, type Lang }   from '@/lib/translations'

const MAX_WORDS = 100
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

interface Props {
  slotCount:    number
  displayName:  string
  firebaseUser: User
  onPosted:     (msg: Message) => void
  lang?:        Lang
}

export default function MessageForm({ slotCount, displayName, firebaseUser, onPosted, lang = 'fr' }: Props) {
  const t = T[lang]
  const [content,  setContent]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [shareMsg, setShareMsg] = useState<Message | null>(null)

  const wordCount = countWords(content)
  const overLimit = wordCount > MAX_WORDS

  if (slotCount >= 100) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || loading || overLimit) return
    setLoading(true)
    setError(null)
    try {
      const token = await firebaseUser.getIdToken()
      const res   = await fetch('/api/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setError(j.error ?? 'Error. Try again.')
        return
      }
      const msg: Message = await res.json()
      setContent('')
      onPosted(msg)
      setShareMsg(msg)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full" style={{ marginBottom: '30px' }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={t.placeholder}
          rows={1}
          className="w-full font-mono text-[#111] text-[12px] bg-white outline-none resize-none placeholder-[#bbb] caret-black"
          style={{
            border: `0.5px solid ${overLimit ? '#f55' : '#ddd'}`,
            borderRadius: '6px',
            padding: '16px',
            marginBottom: '14px',
            minHeight: '54px',
            transition: 'border-color 0.2s',
          }}
          onInput={e => {
            const el = e.currentTarget
            el.style.height = 'auto'
            el.style.height = el.scrollHeight + 'px'
          }}
        />
        {error && <p className="font-mono text-[10px] text-[#555] mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading || !content.trim() || overLimit}
          className="w-full font-serif font-bold text-white transition-all hover:bg-white hover:text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ border: '0.5px solid #fff', borderRadius: '6px', fontSize: '16px', padding: '17px' }}
        >
          {loading ? '…' : t.button}
        </button>
      </form>

      {shareMsg && (
        <ShareModal
          open={true}
          content={shareMsg.content}
          slotNumber={shareMsg.slotNumber}
          displayName={displayName}
          onClose={() => setShareMsg(null)}
        />
      )}
    </>
  )
}

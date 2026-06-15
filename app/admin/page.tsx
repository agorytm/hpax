'use client'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import {
  collection, query, orderBy, limit, getDocs,
  DocumentData,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import type { Message, Profile } from '@/lib/types'

type AdminState = 'loading' | 'denied' | 'ready'

function toMsg(id: string, d: DocumentData): Message {
  return { id, userId: d.userId, content: d.content, slotNumber: d.slotNumber,
    displayName: d.displayName, verified: d.verified, createdAt: d.createdAt ?? null }
}
function toProfile(id: string, d: DocumentData): Profile {
  return { id, displayName: d.displayName, verified: d.verified ?? false,
    messageCount: d.messageCount ?? 0, createdAt: d.createdAt ?? null }
}

export default function AdminPage() {
  const [state,    setState]    = useState<AdminState>('loading')
  const [user,     setUser]     = useState<User | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats,    setStats]    = useState<Record<string, number> | null>(null)

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)
  const [adminPin,     setAdminPin]     = useState('')
  const [masterKey,    setMasterKey]    = useState('')
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fireUser => {
      if (!fireUser) { setState('denied'); return }
      // Check admin claim via token result
      const token = await fireUser.getIdTokenResult()
      if (!token.claims.admin) { setState('denied'); return }
      setUser(fireUser)
      setState('ready')
    })
    return () => unsub()
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    const idToken = await user.getIdToken()

    // Stats
    const statsRes = await fetch('/api/admin/stats', {
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (statsRes.ok) setStats(await statsRes.json())

    // Messages (last 50)
    const msgSnap = await getDocs(
      query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50))
    )
    setMessages(msgSnap.docs.map(d => toMsg(d.id, d.data())))

    // Profiles (last 50 by creation)
    const profSnap = await getDocs(
      query(collection(db, 'profiles'), orderBy('createdAt', 'desc'), limit(50))
    )
    setProfiles(profSnap.docs.map(d => toProfile(d.id, d.data())))
  }, [user])

  useEffect(() => { if (state === 'ready') loadData() }, [state, loadData])

  async function handleDelete() {
    if (!deleteTarget || !user) return
    setDeleting(true)
    setDeleteStatus(null)
    const idToken = await user.getIdToken()
    const res = await fetch('/api/admin/delete-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ messageId: deleteTarget.id, adminPin, masterKey }),
    })
    setDeleting(false)
    const json = await res.json()
    if (res.ok) {
      setDeleteStatus('✓ Deleted')
      setMessages(prev => prev.filter(m => m.id !== deleteTarget.id))
      setTimeout(() => { setDeleteTarget(null); setDeleteStatus(null); setAdminPin(''); setMasterKey('') }, 1500)
    } else {
      setDeleteStatus(`✗ ${json.error}`)
    }
  }

  async function handleSetVerified(userId: string, verified: boolean) {
    if (!user) return
    const idToken = await user.getIdToken()
    await fetch('/api/admin/set-verified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ userId, verified }),
    })
    setProfiles(prev => prev.map(p => p.id === userId ? { ...p, verified } : p))
  }

  // ── Views ─────────────────────────────────────────────────────────────────

  if (state === 'loading') return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <span className="font-mono text-[12px] text-[#333] tracking-[0.3em]">HPAX ADMIN</span>
    </main>
  )

  if (state === 'denied') return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <span className="font-mono text-[11px] text-[#444]">Access denied.</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 border-b border-[#1a1a1a] pb-6">
          <div>
            <span className="font-mono text-[13px] tracking-[0.3em] text-[#444]">HPAX</span>
            <span className="font-mono text-[11px] text-[#333] ml-3">ADMIN</span>
          </div>
          <span className="font-mono text-[10px] text-[#333]">{user?.email}</span>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              ['Total users',    stats.totalUsers],
              ['Total messages', stats.totalMessages],
              ['Last 24h',       stats.messages24h],
              ['Last 7 days',    stats.messages7d],
            ].map(([label, val]) => (
              <div key={label as string} className="border border-[#1a1a1a] rounded-[6px] p-4">
                <div className="font-serif text-[28px] font-bold leading-none mb-1">{val}</div>
                <div className="font-mono text-[9px] text-[#444] uppercase tracking-[0.12em]">{label as string}</div>
              </div>
            ))}
          </div>
        )}

        {/* Messages */}
        <section className="mb-10">
          <h2 className="font-mono text-[11px] text-[#444] uppercase tracking-[0.15em] mb-4">
            Recent Messages
          </h2>
          <div className="space-y-1">
            {messages.map(msg => (
              <div key={msg.id} className="flex items-start gap-3 py-3 border-b border-[#111] group">
                <span className="font-mono text-[10px] text-[#333] min-w-[46px] shrink-0">
                  {msg.slotNumber}/100
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-[#555] uppercase tracking-[0.1em] mr-2">
                    {msg.displayName}
                  </span>
                  <p className="font-serif text-[13px] italic text-[#999] leading-[1.35] mt-0.5 break-words">
                    &ldquo;{msg.content}&rdquo;
                  </p>
                </div>
                <button
                  onClick={() => { setDeleteTarget(msg); setDeleteStatus(null) }}
                  className="shrink-0 font-mono text-[9px] text-[#333] hover:text-[#ff4444] transition-colors opacity-0 group-hover:opacity-100 px-2 py-1"
                >
                  delete
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Profiles */}
        <section>
          <h2 className="font-mono text-[11px] text-[#444] uppercase tracking-[0.15em] mb-4">
            Users
          </h2>
          <div className="space-y-1">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-2 border-b border-[#111]">
                <span className="font-mono text-[10px] text-[#666] flex-1">{p.displayName}</span>
                <span className="font-mono text-[9px] text-[#333]">{p.messageCount}/100</span>
                <button
                  onClick={() => handleSetVerified(p.id, !p.verified)}
                  className={`font-mono text-[9px] px-2 py-1 border rounded-[3px] transition-colors ${
                    p.verified
                      ? 'border-[#444] text-[#888] hover:border-[#333] hover:text-[#555]'
                      : 'border-[#333] text-[#444] hover:border-[#555] hover:text-[#888]'
                  }`}
                >
                  {p.verified ? '✓ verified' : 'verify'}
                </button>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Delete modal — 3-code confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-[8px] p-8 w-full max-w-[420px] flex flex-col gap-5">
            <div>
              <p className="font-mono text-[10px] text-[#555] uppercase tracking-[0.15em] mb-2">
                Delete confirmation
              </p>
              <p className="font-serif text-[13px] italic text-[#888] leading-[1.4]">
                &ldquo;{deleteTarget.content.substring(0, 120)}&rdquo;
              </p>
              <p className="font-mono text-[9px] text-[#444] mt-2">
                {deleteTarget.displayName} — slot {deleteTarget.slotNumber}/100
              </p>
            </div>

            <div className="space-y-3">
              {/* Code 1: auto (Firebase session) */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#2a7a2a] w-4">✓</span>
                <span className="font-mono text-[10px] text-[#333]">Admin session active</span>
              </div>

              {/* Code 2: admin PIN */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#555] w-4">2</span>
                <input
                  type="password"
                  placeholder="Admin PIN"
                  value={adminPin}
                  onChange={e => setAdminPin(e.target.value)}
                  className="flex-1 bg-transparent border border-[#222] rounded-[4px] font-mono text-[11px] px-3 py-2 text-white placeholder-[#333] outline-none focus:border-[#444]"
                />
              </div>

              {/* Code 3: master key */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-[#555] w-4">3</span>
                <input
                  type="password"
                  placeholder="Master key"
                  value={masterKey}
                  onChange={e => setMasterKey(e.target.value)}
                  className="flex-1 bg-transparent border border-[#222] rounded-[4px] font-mono text-[11px] px-3 py-2 text-white placeholder-[#333] outline-none focus:border-[#444]"
                />
              </div>
            </div>

            {deleteStatus && (
              <p className={`font-mono text-[11px] ${deleteStatus.startsWith('✓') ? 'text-[#2a7a2a]' : 'text-[#aa3333]'}`}>
                {deleteStatus}
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setAdminPin(''); setMasterKey('') }}
                className="flex-1 font-mono text-[10px] text-[#444] border border-[#1a1a1a] rounded-[4px] py-2 hover:text-[#666] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || !adminPin || !masterKey}
                className="flex-1 font-mono text-[10px] text-[#aa3333] border border-[#331a1a] rounded-[4px] py-2 hover:bg-[#331a1a] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {deleting ? '…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

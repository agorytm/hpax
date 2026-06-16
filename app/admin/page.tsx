'use client'

import { useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { collection, query, orderBy, limit, getDocs, DocumentData } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/client'
import type { Message, Profile } from '@/lib/types'

type AdminLevel = 'loading' | 'denied' | 'admin' | 'superAdmin'
type AdminTab = 'messages' | 'users' | 'texts'

function toMsg(id: string, d: DocumentData): Message {
  return { id, userId: d.userId, content: d.content, slotNumber: d.slotNumber,
    displayName: d.displayName, verified: d.verified, createdAt: d.createdAt ?? null }
}
function toProfile(id: string, d: DocumentData): Profile {
  return { id, displayName: d.displayName, verified: d.verified ?? false,
    messageCount: d.messageCount ?? 0, createdAt: d.createdAt ?? null }
}

export default function AdminPage() {
  const [level, setLevel] = useState<AdminLevel>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<AdminTab>('messages')
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [config, setConfig] = useState<Record<string, string>>({})
  const [configEdits, setConfigEdits] = useState<Record<string, string>>({})
  const [configSaving, setConfigSaving] = useState(false)
  const [configStatus, setConfigStatus] = useState<string | null>(null)

  // Delete/edit modal
  const [actionTarget, setActionTarget] = useState<Message | null>(null)
  const [actionMode, setActionMode] = useState<'delete' | 'edit'>('delete')
  const [adminPin, setAdminPin] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [restoreSlot, setRestoreSlot] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async fireUser => {
      if (!fireUser) { setLevel('denied'); return }
      const token = await fireUser.getIdTokenResult()
      if (token.claims.superAdmin) { setUser(fireUser); setLevel('superAdmin'); return }
      if (token.claims.admin) { setUser(fireUser); setLevel('admin'); return }
      setLevel('denied')
    })
    return () => unsub()
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    const idToken = await user.getIdToken()

    const statsRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${idToken}` } })
    if (statsRes.ok) setStats(await statsRes.json())

    const msgSnap = await getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(100)))
    setMessages(msgSnap.docs.map(d => toMsg(d.id, d.data())))

    const profSnap = await getDocs(query(collection(db, 'profiles'), orderBy('createdAt', 'desc'), limit(100)))
    setProfiles(profSnap.docs.map(d => toProfile(d.id, d.data())))

    const cfgRes = await fetch('/api/admin/config', { headers: { Authorization: `Bearer ${idToken}` } })
    if (cfgRes.ok) {
      const data = await cfgRes.json()
      setConfig(data)
      setConfigEdits(data)
    }
  }, [user])

  useEffect(() => { if (level === 'admin' || level === 'superAdmin') loadData() }, [level, loadData])

  async function handleDelete() {
    if (!actionTarget || !user) return
    setActionBusy(true); setActionStatus(null)
    const idToken = await user.getIdToken()
    const res = await fetch('/api/admin/delete-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ messageId: actionTarget.id, adminPin, masterKey, restoreSlot }),
    })
    setActionBusy(false)
    const json = await res.json()
    if (res.ok) {
      setActionStatus(restoreSlot ? '✓ Supprimé — slot rendu' : '✓ Supprimé — slot conservé')
      setMessages(prev => prev.filter(m => m.id !== actionTarget.id))
      setTimeout(() => { setActionTarget(null); setActionStatus(null); setAdminPin(''); setMasterKey(''); setRestoreSlot(false) }, 1500)
    } else { setActionStatus(`✗ ${json.error}`) }
  }

  async function handleEdit() {
    if (!actionTarget || !user) return
    setActionBusy(true); setActionStatus(null)
    const idToken = await user.getIdToken()
    const res = await fetch('/api/admin/edit-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ messageId: actionTarget.id, content: editContent }),
    })
    setActionBusy(false)
    const json = await res.json()
    if (res.ok) {
      setActionStatus('✓ Modifié')
      setMessages(prev => prev.map(m => m.id === actionTarget.id ? { ...m, content: editContent } : m))
      setTimeout(() => { setActionTarget(null); setActionStatus(null); setEditContent('') }, 1200)
    } else { setActionStatus(`✗ ${json.error}`) }
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

  async function handleSaveConfig() {
    if (!user) return
    setConfigSaving(true); setConfigStatus(null)
    const idToken = await user.getIdToken()
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify(configEdits),
    })
    setConfigSaving(false)
    setConfigStatus(res.ok ? '✓ Sauvegardé' : '✗ Erreur')
    setTimeout(() => setConfigStatus(null), 2000)
  }

  if (level === 'loading') return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <span className="font-mono text-[12px] text-[#444] tracking-[0.3em]">HPAX ADMIN</span>
    </main>
  )
  if (level === 'denied') return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <span className="font-mono text-[11px] text-[#555]">Accès refusé.</span>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[#1a1a1a] pb-5">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[13px] tracking-[0.3em] text-[#666]">HPAX ADMIN</span>
            <span className={`font-mono text-[9px] px-2 py-0.5 rounded-[3px] ${
              level === 'superAdmin' ? 'bg-[#1a1a00] text-[#aa9900]' : 'bg-[#0a1a0a] text-[#449944]'
            }`}>
              {level === 'superAdmin' ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-[#444]">{user?.email}</span>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {([['Utilisateurs', stats.totalUsers], ['Messages', stats.totalMessages], ['24h', stats.messages24h], ['7 jours', stats.messages7d]] as [string, number][]).map(([label, val]) => (
              <div key={label} className="border border-[#1a1a1a] rounded-[5px] p-4">
                <div className="font-serif text-[26px] font-bold leading-none mb-1 text-white">{val}</div>
                <div className="font-mono text-[9px] text-[#555] uppercase tracking-[0.12em]">{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-[#111]">
          {(['messages', 'users', 'texts'] as AdminTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-[10px] uppercase tracking-[0.15em] px-4 py-2 transition-colors ${
                tab === t ? 'text-white border-b border-white -mb-px' : 'text-[#444] hover:text-[#888]'
              }`}>
              {t === 'messages' ? 'Messages' : t === 'users' ? 'Utilisateurs' : 'Textes app'}
            </button>
          ))}
        </div>

        {/* Messages tab */}
        {tab === 'messages' && (
          <div className="space-y-0">
            {messages.map(msg => (
              <div key={msg.id} className="flex items-start gap-3 py-3 border-b border-[#111] group">
                <span className="font-mono text-[10px] text-[#444] min-w-[46px] shrink-0">{msg.slotNumber}/100</span>
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-[9px] text-[#666] uppercase tracking-[0.1em] mr-2">{msg.displayName}</span>
                  <p className="font-serif text-[13px] italic text-white leading-[1.35] mt-0.5 break-words">&ldquo;{msg.content}&rdquo;</p>
                </div>
                {level === 'superAdmin' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => { setActionTarget(msg); setActionMode('edit'); setEditContent(msg.content); setActionStatus(null) }}
                      className="font-mono text-[9px] text-[#555] hover:text-[#88f] px-2 py-1">edit</button>
                    <button onClick={() => { setActionTarget(msg); setActionMode('delete'); setActionStatus(null); setAdminPin(''); setMasterKey(''); setRestoreSlot(false) }}
                      className="font-mono text-[9px] text-[#555] hover:text-[#f44] px-2 py-1">del</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-0">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center gap-4 py-2.5 border-b border-[#111]">
                <span className="font-mono text-[11px] text-white flex-1">{p.displayName}</span>
                <span className="font-mono text-[9px] text-[#555]">{p.messageCount}/100</span>
                <button onClick={() => handleSetVerified(p.id, !p.verified)}
                  className={`font-mono text-[9px] px-2 py-1 border rounded-[3px] transition-colors ${
                    p.verified ? 'border-[#444] text-[#888] hover:border-[#333]' : 'border-[#333] text-[#555] hover:text-[#888]'
                  }`}>
                  {p.verified ? '✓ vérifié' : 'vérifier'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Texts tab */}
        {tab === 'texts' && (
          <div className="flex flex-col gap-4">
            {Object.entries(configEdits).map(([key, val]) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="font-mono text-[9px] text-[#555] uppercase tracking-[0.1em]">{key}</label>
                <textarea
                  value={val}
                  onChange={e => setConfigEdits(prev => ({ ...prev, [key]: e.target.value }))}
                  rows={val.length > 80 ? 3 : 1}
                  className="bg-[#0f0f0f] border border-[#222] rounded-[4px] font-mono text-[11px] px-3 py-2 text-white resize-none outline-none focus:border-[#444]"
                />
              </div>
            ))}
            <div className="flex items-center gap-3 mt-2">
              <button onClick={handleSaveConfig} disabled={configSaving}
                className="font-mono text-[10px] text-[#888] border border-[#333] rounded-[4px] px-4 py-2 hover:text-white hover:border-[#555] transition-colors disabled:opacity-30">
                {configSaving ? '…' : 'Sauvegarder'}
              </button>
              {configStatus && (
                <span className={`font-mono text-[10px] ${configStatus.startsWith('✓') ? 'text-[#4a4]' : 'text-[#a44]'}`}>{configStatus}</span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal delete / edit */}
      {actionTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#0f0f0f] border border-[#2a2a2a] rounded-[8px] p-7 w-full max-w-[440px] flex flex-col gap-5">

            <div>
              <p className="font-mono text-[9px] text-[#555] uppercase tracking-[0.15em] mb-2">
                {actionMode === 'edit' ? 'Modifier le message' : 'Supprimer le message'}
              </p>
              <p className="font-serif text-[12px] italic text-[#888]">&ldquo;{actionTarget.content.substring(0, 100)}&rdquo;</p>
              <p className="font-mono text-[9px] text-[#444] mt-1">{actionTarget.displayName} — {actionTarget.slotNumber}/100</p>
            </div>

            {actionMode === 'edit' ? (
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={4}
                className="bg-transparent border border-[#222] rounded-[4px] font-serif text-[13px] italic px-3 py-2 text-white resize-none outline-none focus:border-[#444]"
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#2a7a2a] w-4">✓</span>
                  <span className="font-mono text-[10px] text-[#444]">Session super admin active</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#555] w-4">2</span>
                  <input type="password" placeholder="Admin PIN" value={adminPin} onChange={e => setAdminPin(e.target.value)}
                    className="flex-1 bg-transparent border border-[#222] rounded-[4px] font-mono text-[11px] px-3 py-2 text-white placeholder-[#333] outline-none focus:border-[#444]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#555] w-4">3</span>
                  <input type="password" placeholder="Master key" value={masterKey} onChange={e => setMasterKey(e.target.value)}
                    className="flex-1 bg-transparent border border-[#222] rounded-[4px] font-mono text-[11px] px-3 py-2 text-white placeholder-[#333] outline-none focus:border-[#444]" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={restoreSlot} onChange={e => setRestoreSlot(e.target.checked)}
                    className="accent-white" />
                  <span className="font-mono text-[10px] text-[#666]">Rendre le slot à l&apos;utilisateur (+1 message disponible)</span>
                </label>
              </div>
            )}

            {actionStatus && (
              <p className={`font-mono text-[11px] ${actionStatus.startsWith('✓') ? 'text-[#4a4]' : 'text-[#a44]'}`}>{actionStatus}</p>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setActionTarget(null); setActionStatus(null) }}
                className="flex-1 font-mono text-[10px] text-[#444] border border-[#1a1a1a] rounded-[4px] py-2 hover:text-[#666] transition-colors">
                Annuler
              </button>
              <button
                onClick={actionMode === 'edit' ? handleEdit : handleDelete}
                disabled={actionBusy || (actionMode === 'delete' && (!adminPin || !masterKey))}
                className={`flex-1 font-mono text-[10px] border rounded-[4px] py-2 transition-colors disabled:opacity-30 ${
                  actionMode === 'edit' ? 'text-[#88f] border-[#224] hover:bg-[#111833]' : 'text-[#f44] border-[#311] hover:bg-[#1a0808]'
                }`}>
                {actionBusy ? '…' : actionMode === 'edit' ? 'Enregistrer' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

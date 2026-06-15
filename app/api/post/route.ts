// POST /api/post — Publication d'un message.
//
// Sécurité :
// • Vérifie le Firebase ID token (Authorization: Bearer <token>)
// • Exécute un runTransaction Firestore avec le Admin SDK
// • Lit le compteur AVANT d'insérer (verrou de transaction → anti-race condition)
// • Si count >= 100 → rejette, même si 50 requêtes arrivent en même temps
// • Les Security Rules bloquent tout write direct depuis le client
// • Le slot est toujours assigné ici, jamais par le client

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { FieldValue }         from 'firebase-admin/firestore'

const MAX_WORDS = 100

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

// Rate limiting simple en mémoire (par UID, 1 post / 30s)
// Pour la prod : remplacer par Upstash Redis ou similaire
const lastPost = new Map<string, number>()

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 })
  }

  const idToken = authHeader.slice(7)
  let uid: string

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken)
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }

  // ── 2. Rate limiting ──────────────────────────────────────
  const now = Date.now()
  const last = lastPost.get(uid) ?? 0
  if (now - last < 30_000) {
    return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
  }

  // ── 3. Validation du contenu ──────────────────────────────
  let content: string
  try {
    const body = await req.json()
    content = String(body?.content ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  if (!content) {
    return NextResponse.json({ error: 'CONTENT_EMPTY' }, { status: 400 })
  }
  if (countWords(content) > MAX_WORDS) {
    return NextResponse.json({ error: 'TOO_MANY_WORDS' }, { status: 400 })
  }

  // ── 4. Transaction atomique ───────────────────────────────
  // runTransaction() avec Admin SDK garantit l'isolation :
  // si deux requêtes lisent le même profileRef en parallèle,
  // Firestore relance la transaction perdante. La logique est donc
  // toujours cohérente.
  const profileRef = getAdminDb().collection('profiles').doc(uid)

  try {
    const result = await getAdminDb().runTransaction(async (tx) => {
      const profileSnap = await tx.get(profileRef)

      if (!profileSnap.exists) {
        throw Object.assign(new Error('NO_PROFILE'), { code: 404 })
      }

      const profile = profileSnap.data()!
      const currentCount = profile.messageCount as number

      if (currentCount >= 100) {
        throw Object.assign(new Error('LIMIT_REACHED'), { code: 403 })
      }

      const slotNumber  = currentCount + 1
      const messageRef  = getAdminDb().collection('messages').doc()

      tx.update(profileRef, { messageCount: FieldValue.increment(1) })
      tx.set(messageRef, {
        userId:      uid,
        content,
        slotNumber,
        displayName: profile.displayName as string,
        verified:    profile.verified    as boolean ?? false,
        createdAt:   FieldValue.serverTimestamp(),
      })

      return {
        id: messageRef.id,
        userId: uid,
        content,
        slotNumber,
        displayName: profile.displayName as string,
        verified:    profile.verified    as boolean ?? false,
      }
    })

    lastPost.set(uid, now)
    return NextResponse.json({ success: true, message: result })

  } catch (err: unknown) {
    const e = err as Error & { code?: number }
    if (e.message === 'LIMIT_REACHED') {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 403 })
    }
    if (e.message === 'NO_PROFILE') {
      return NextResponse.json({ error: 'NO_PROFILE' }, { status: 404 })
    }
    console.error('[POST /api/post]', e)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

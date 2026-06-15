// POST /api/profile — Création du profil lors de l'onboarding.
//
// Appelé une seule fois par utilisateur (première connexion).
// Utilise Admin SDK pour bypasser les Security Rules qui bloquent
// les updates côté client (le displayName est permanent).

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { FieldValue }         from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // ── 1. Auth ──────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'NOT_AUTHENTICATED' }, { status: 401 })
  }

  let uid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7))
    uid = decoded.uid
  } catch {
    return NextResponse.json({ error: 'INVALID_TOKEN' }, { status: 401 })
  }

  // ── 2. Validation du nom ──────────────────────────────────
  let displayName: string
  try {
    const body = await req.json()
    displayName = String(body?.displayName ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
  }

  if (displayName.length < 2 || displayName.length > 60) {
    return NextResponse.json({ error: 'INVALID_NAME' }, { status: 400 })
  }

  // ── 3. Idempotent : ne crée pas si déjà existant ─────────
  const profileRef = getAdminDb().collection('profiles').doc(uid)
  const existing   = await profileRef.get()

  if (existing.exists) {
    return NextResponse.json({ success: true, profile: existing.data() })
  }

  // ── 4. Création ───────────────────────────────────────────
  const profileData = {
    displayName,
    verified:     false,
    messageCount: 0,
    createdAt:    FieldValue.serverTimestamp(),
  }

  await profileRef.set(profileData)

  return NextResponse.json({ success: true, profile: { ...profileData, id: uid } })
}

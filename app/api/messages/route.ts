import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const MAX_WORDS = 100

function countWords(t: string) {
  return t.trim().split(/\s+/).filter(Boolean).length
}

export async function POST(req: NextRequest) {
  try {
    // Auth
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let uid: string
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Body
    const { content } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }
    if (countWords(content) > MAX_WORDS) {
      return NextResponse.json({ error: 'Max 100 mots par message.' }, { status: 400 })
    }

    const db = getAdminDb()

    // Profil utilisateur
    const profileSnap = await db.collection('profiles').doc(uid).get()
    if (!profileSnap.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const pd = profileSnap.data()!
    const displayName: string = pd.displayName ?? ''
    const verified: boolean  = pd.verified ?? false
    const messageCount: number = pd.messageCount ?? 0

    // Quota : 100 messages à vie par utilisateur
    if (messageCount >= 100) {
      return NextResponse.json({ error: '100 messages à vie. Votre quota est épuisé.' }, { status: 409 })
    }

    // Numéro personnel : 1/100, 2/100, 3/100…
    const slotNumber = messageCount + 1

    // Écriture atomique
    const msgRef = db.collection('messages').doc()
    await db.runTransaction(async tx => {
      tx.set(msgRef, {
        userId: uid,
        content: content.trim(),
        slotNumber,
        displayName,
        verified,
        createdAt: FieldValue.serverTimestamp(),
      })
      tx.update(db.collection('profiles').doc(uid), {
        messageCount: FieldValue.increment(1),
      })
    })

    return NextResponse.json({
      id: msgRef.id,
      userId: uid,
      content: content.trim(),
      slotNumber,
      displayName,
      verified,
      createdAt: null,
    })
  } catch (err) {
    console.error('[/api/messages]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const MAX_WORDS = 100
function countWords(t: string) { return t.trim().split(/\s+/).filter(Boolean).length }

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let uid: string
    let displayName: string
    let verified: boolean
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content } = await req.json()
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }
    if (countWords(content) > MAX_WORDS) {
      return NextResponse.json({ error: 'Too many words (max 100)' }, { status: 400 })
    }

    const db = getAdminDb()

    const profileSnap = await db.collection('profiles').doc(uid).get()
    if (!profileSnap.exists) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    const pd = profileSnap.data()!
    displayName = pd.displayName ?? ''
    verified = pd.verified ?? false

    if ((pd.messageCount ?? 0) >= 1) {
      return NextResponse.json({ error: 'Already posted' }, { status: 409 })
    }

    const messagesSnap = await db.collection('messages').get()
    const takenSlots = new Set(messagesSnap.docs.map(d => d.data().slotNumber as number))
    const available: number[] = []
    for (let i = 1; i <= 100; i++) { if (!takenSlots.has(i)) available.push(i) }
    if (available.length === 0) {
      return NextResponse.json({ error: 'No slots available' }, { status: 409 })
    }
    const slotNumber = available[Math.floor(Math.random() * available.length)]

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

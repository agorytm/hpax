import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.superAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

    const { messageId, adminPin, masterKey, restoreSlot } = await req.json()
    if (!messageId || !adminPin || !masterKey) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const pinHash = process.env.ADMIN_PIN_HASH
    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!pinHash || !masterHash) return NextResponse.json({ error: 'Server error' }, { status: 500 })

    if (sha256(adminPin) !== pinHash) return NextResponse.json({ error: 'Wrong PIN' }, { status: 403 })
    if (sha256(masterKey) !== masterHash) return NextResponse.json({ error: 'Wrong master key' }, { status: 403 })

    const db = getAdminDb()
    const msgRef = db.collection('messages').doc(messageId)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    const userId = msgSnap.data()!.userId

    await db.runTransaction(async tx => {
      tx.delete(msgRef)
      if (restoreSlot && userId) {
        tx.update(db.collection('profiles').doc(userId), {
          messageCount: FieldValue.increment(-1),
        })
      }
    })

    return NextResponse.json({ ok: true, slotRestored: !!restoreSlot })
  } catch (err) {
    console.error('[admin/delete-message]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

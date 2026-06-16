import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
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

    const { masterKey, seedOnly } = await req.json()
    if (!masterKey) return NextResponse.json({ error: 'Missing master key' }, { status: 400 })

    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!masterHash) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    if (sha256(masterKey) !== masterHash) return NextResponse.json({ error: 'Wrong master key' }, { status: 403 })

    const db = getAdminDb()
    const snap = seedOnly
      ? await db.collection('messages').where('userId', '==', 'seed').get()
      : await db.collection('messages').get()

    const BATCH_SIZE = 499
    let deleted = 0
    const docs = snap.docs
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch()
      docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref))
      await batch.commit()
      deleted += Math.min(BATCH_SIZE, docs.length - i)
    }

    return NextResponse.json({ ok: true, deleted })
  } catch (err) {
    console.error('[admin/purge-messages]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

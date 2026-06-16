import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/**
 * POST /api/admin/delete-user
 * Super admin only — requires masterKey
 * Body: { userId, masterKey }
 * Deletes Firebase Auth account + Firestore profile
 * Messages are kept (orphaned) — use delete-message to remove them separately
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.superAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

    const { userId, masterKey } = await req.json()
    if (!userId || !masterKey) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!masterHash) return NextResponse.json({ error: 'Server error' }, { status: 500 })
    if (sha256(masterKey) !== masterHash) return NextResponse.json({ error: 'Wrong master key' }, { status: 403 })

    const db = getAdminDb()

    // Delete Firebase Auth account
    await getAdminAuth().deleteUser(userId)

    // Delete Firestore profile
    await db.collection('profiles').doc(userId).delete()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/delete-user]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

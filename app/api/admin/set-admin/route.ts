import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/set-admin
 * Body: { userId, masterKey }
 * Requires: admin claim + master key (only Ben can grant/revoke admin)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.admin) return NextResponse.json({ error: 'NOT_ADMIN' }, { status: 403 })

    const { userId, grantAdmin, masterKey } = await req.json().catch(() => ({}))
    if (!userId || typeof grantAdmin !== 'boolean' || !masterKey) {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    // Master key required to grant/revoke admin
    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!masterHash) return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
    const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
    if (sha256(masterKey) !== masterHash) {
      return NextResponse.json({ error: 'WRONG_CREDENTIALS' }, { status: 403 })
    }

    await getAdminAuth().setCustomUserClaims(userId, { admin: grantAdmin })

    await getAdminDb().collection('adminLogs').add({
      adminUid: decoded.uid, action: 'set-admin',
      targetId: userId, grantAdmin, at: new Date(),
    })

    return NextResponse.json({ ok: true, userId, admin: grantAdmin })
  } catch (err) {
    console.error('[admin/set-admin]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

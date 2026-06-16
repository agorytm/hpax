import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/bootstrap
 * Body: { masterKey }
 * Sets { admin: true, superAdmin: true } on the authenticated user.
 * Use ONCE to bootstrap the owner account.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)

    const { masterKey } = await req.json().catch(() => ({}))
    if (!masterKey) return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })

    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!masterHash) return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })

    const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
    if (sha256(masterKey) !== masterHash) {
      return NextResponse.json({ error: 'WRONG_MASTER_KEY' }, { status: 403 })
    }

    await getAdminAuth().setCustomUserClaims(decoded.uid, { admin: true, superAdmin: true })
    return NextResponse.json({ ok: true, uid: decoded.uid })
  } catch (err) {
    console.error('[admin/bootstrap]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

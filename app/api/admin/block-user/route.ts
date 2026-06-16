import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/block-user
 * Admin or superAdmin
 * Body: { userId, blocked: boolean }
 * Disables/enables the Firebase account (user can't sign in while blocked)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userId, blocked } = await req.json()
    if (!userId || typeof blocked !== 'boolean') {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await getAdminAuth().updateUser(userId, { disabled: blocked })

    // Also mark in Firestore for display
    const db = getAdminDb()
    await db.collection('profiles').doc(userId).update({ blocked })

    return NextResponse.json({ ok: true, blocked })
  } catch (err) {
    console.error('[admin/block-user]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

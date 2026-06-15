import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

/**
 * POST /api/admin/set-verified
 * Body: { userId, verified: boolean }
 * Requires: admin claim
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.admin) return NextResponse.json({ error: 'NOT_ADMIN' }, { status: 403 })

    const { userId, verified } = await req.json().catch(() => ({}))
    if (!userId || typeof verified !== 'boolean') {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    // Update profile
    await getAdminDb().collection('profiles').doc(userId).update({ verified })

    // Also update all their messages (denormalized)
    const msgs = await getAdminDb().collection('messages')
      .where('userId', '==', userId).get()
    const batch = getAdminDb().batch()
    msgs.docs.forEach(d => batch.update(d.ref, { verified }))
    await batch.commit()

    await getAdminDb().collection('adminLogs').add({
      adminUid: decoded.uid, action: 'set-verified',
      targetId: userId, verified, at: new Date(),
    })

    return NextResponse.json({ ok: true, userId, verified })
  } catch (err) {
    console.error('[admin/set-verified]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

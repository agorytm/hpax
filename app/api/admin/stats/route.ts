import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

/**
 * GET /api/admin/stats
 * Returns: total users, total messages, messages last 24h, last 7d
 * Requires: admin claim
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.admin) return NextResponse.json({ error: 'NOT_ADMIN' }, { status: 403 })

    const now   = Date.now()
    const day   = now - 86_400_000
    const week  = now - 7 * 86_400_000

    const [profilesSnap, messagesSnap, recentDaySnap, recentWeekSnap] = await Promise.all([
      getAdminDb().collection('profiles').count().get(),
      getAdminDb().collection('messages').count().get(),
      getAdminDb().collection('messages')
        .where('createdAt', '>=', new Date(day)).count().get(),
      getAdminDb().collection('messages')
        .where('createdAt', '>=', new Date(week)).count().get(),
    ])

    return NextResponse.json({
      totalUsers:     profilesSnap.data().count,
      totalMessages:  messagesSnap.data().count,
      messages24h:    recentDaySnap.data().count,
      messages7d:     recentWeekSnap.data().count,
    })
  } catch (err) {
    console.error('[admin/stats]', err)
    return NextResponse.json({ error: 'SERVER_ERROR' }, { status: 500 })
  }
}

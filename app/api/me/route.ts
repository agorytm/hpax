import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

/**
 * GET /api/me
 * Returns the current user's profile using Admin SDK — bypasses Firestore rules.
 * More reliable than client-side getDoc() for auth checks.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ profile: null })

    let uid: string
    try {
      const decoded = await getAdminAuth().verifyIdToken(idToken)
      uid = decoded.uid
    } catch {
      return NextResponse.json({ profile: null })
    }

    const snap = await getAdminDb().collection('profiles').doc(uid).get()
    if (!snap.exists) return NextResponse.json({ profile: null })

    const data = snap.data()!
    return NextResponse.json({
      profile: {
        id: uid,
        displayName: data.displayName ?? '',
        verified: data.verified ?? false,
        messageCount: data.messageCount ?? 0,
        createdAt: data.createdAt ?? null,
      }
    })
  } catch (err) {
    console.error('[/api/me]', err)
    return NextResponse.json({ profile: null })
  }
}

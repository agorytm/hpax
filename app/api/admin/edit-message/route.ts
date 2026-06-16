import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

const MAX_WORDS = 100
function countWords(t: string) {
  return t.trim().split(/\s+/).filter(Boolean).length
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.superAdmin) return NextResponse.json({ error: 'Super admin only' }, { status: 403 })

    const { messageId, content } = await req.json()
    if (!messageId || !content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    if (countWords(content) > MAX_WORDS) {
      return NextResponse.json({ error: 'Max 100 mots' }, { status: 400 })
    }

    const db = getAdminDb()
    const msgRef = db.collection('messages').doc(messageId)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    await msgRef.update({ content: content.trim(), editedAt: new Date() })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/edit-message]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

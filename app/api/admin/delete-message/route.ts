import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { createHash } from 'crypto'

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex')
}

/**
 * POST /api/admin/delete-message
 * Body: { messageId, adminPin, masterKey }
 *
 * 3 verifications, all server-side:
 *   1. Firebase token + custom claim admin:true
 *   2. adminPin  → sha256 must match ADMIN_PIN_HASH
 *   3. masterKey → sha256 must match ADMIN_MASTER_KEY_HASH
 *
 * Every attempt is logged in Firestore (adminLogs collection).
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  let uid = 'unknown'

  try {
    // 1. Firebase Auth + admin claim
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return fail('MISSING_TOKEN', 401)

    const decoded = await adminAuth.verifyIdToken(idToken)
    uid = decoded.uid
    if (!decoded.admin) return fail('NOT_ADMIN', 403)

    // 2. Parse body
    const body = await req.json().catch(() => ({}))
    const { messageId, adminPin, masterKey } = body
    if (!messageId || !adminPin || !masterKey) {
      await log(uid, ip, 'delete', messageId, 'MISSING_FIELDS')
      return fail('MISSING_FIELDS', 400)
    }

    // 3. Server config check
    const pinHash    = process.env.ADMIN_PIN_HASH
    const masterHash = process.env.ADMIN_MASTER_KEY_HASH
    if (!pinHash || !masterHash) {
      await log(uid, ip, 'delete', messageId, 'SERVER_CONFIG_ERROR')
      return fail('SERVER_ERROR', 500)
    }

    // 4. Verify admin PIN
    if (sha256(adminPin) !== pinHash) {
      await log(uid, ip, 'delete', messageId, 'WRONG_PIN')
      return fail('WRONG_CREDENTIALS', 403)
    }

    // 5. Verify master key
    if (sha256(masterKey) !== masterHash) {
      await log(uid, ip, 'delete', messageId, 'WRONG_MASTER_KEY')
      return fail('WRONG_CREDENTIALS', 403)
    }

    // 6. Check message exists
    const msgRef  = adminDb.collection('messages').doc(messageId)
    const msgSnap = await msgRef.get()
    if (!msgSnap.exists) {
      await log(uid, ip, 'delete', messageId, 'MESSAGE_NOT_FOUND')
      return fail('NOT_FOUND', 404)
    }
    const msgData = msgSnap.data()!

    // 7. Atomic delete: remove message + decrement user counter
    await adminDb.runTransaction(async tx => {
      const profileRef = adminDb.collection('profiles').doc(msgData.userId)
      tx.delete(msgRef)
      tx.update(profileRef, { messageCount: FieldValue.increment(-1) })
    })

    // 8. Log success (includes truncated content for audit trail)
    await log(uid, ip, 'delete', messageId, 'SUCCESS', {
      deletedUserId:  msgData.userId,
      deletedContent: (msgData.content ?? '').substring(0, 80),
      deletedSlot:    msgData.slotNumber,
    })

    return NextResponse.json({ ok: true, messageId })

  } catch (err: unknown) {
    await log(uid, ip, 'delete', 'unknown', 'EXCEPTION', { error: String(err) })
    console.error('[admin/delete-message]', err)
    return fail('SERVER_ERROR', 500)
  }
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status })
}

async function log(
  adminUid: string, ip: string, action: string,
  targetId: string, result: string, extra?: Record<string, unknown>
) {
  try {
    await adminDb.collection('adminLogs').add({
      adminUid, ip, action, targetId, result, ...extra, at: new Date(),
    })
  } catch { /* never crash the route because of logging */ }
}

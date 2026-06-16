import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminAuth } from '@/lib/firebase/admin'

export const dynamic = 'force-dynamic'

const DEFAULT_CONFIG = {
  welcomeTitle: 'HPAX',
  welcomeSubtitle: 'Une archive humaine.',
  welcomeBody: 'Vous avez 100 messages à vie. Chaque message est horodaté, numéroté, et public pour toujours.',
  welcomeCta: 'Commencer',
  mainTagline: 'Cent messages. À vie.',
  mainDescription: 'Une archive de voix humaines. Permanente. Irréversible.',
  howStep1: 'Entrez votre email. Vous recevez un lien de connexion — aucun mot de passe nécessaire.',
  howStep2: 'Votre nom est permanent. Il apparaîtra sur chaque message que vous publiez, pour toujours.',
  howStep3: 'Vous avez 100 messages à vie. Chaque message est horodaté et numéroté (ex : 3/100).',
  howStep4: 'Une fois votre 100e message publié, votre profil reste visible dans le feed pour toujours.',
  aboutText: 'HPAX est une archive humaine permanente. Pas un réseau social. Pas un forum. Un espace où chaque voix compte, une fois pour toutes.',
  conditionsText: "Tout message publié est permanent et public. Aucune suppression possible par l'utilisateur. 100 messages à vie, non extensibles. Contenu illégal ou haineux soumis à modération.",
  joinTitle: 'Rejoindre HPAX',
  joinSubtitle: 'Entrez votre email pour commencer.',
  joinEmailPlaceholder: 'votre@email.com',
  joinNamePlaceholder: 'Votre prénom ou pseudonyme',
  joinNameHint: 'Ce nom sera permanent et visible sur tous vos messages.',
}

export async function GET() {
  try {
    const db = getAdminDb()
    const snap = await db.collection('config').doc('texts').get()
    const data = snap.exists ? snap.data()! : {}
    return NextResponse.json({ ...DEFAULT_CONFIG, ...data })
  } catch {
    return NextResponse.json(DEFAULT_CONFIG)
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const decoded = await getAdminAuth().verifyIdToken(idToken)
    if (!decoded.admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const updates = await req.json()
    const allowed = Object.keys(DEFAULT_CONFIG)
    const filtered: Record<string, string> = {}
    for (const key of allowed) {
      if (typeof updates[key] === 'string') filtered[key] = updates[key]
    }

    const db = getAdminDb()
    await db.collection('config').doc('texts').set(filtered, { merge: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/config]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

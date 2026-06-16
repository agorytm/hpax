import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const PIN_HASH = process.env.ADMIN_PIN_HASH ?? ''

const CITATIONS: Array<{ text: string; author: string }> = [
  { text: "Le secret d'ennuyer est celui de tout dire.", author: "Voltaire" },
  { text: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", author: "Antoine de Saint-Exupéry" },
  { text: "La vie, c'est ce qui arrive quand on a d'autres projets.", author: "John Lennon" },
  { text: "Je pense, donc je suis.", author: "René Descartes" },
  { text: "L'imagination est plus importante que le savoir.", author: "Albert Einstein" },
  { text: "Le génie, c'est un pour cent d'inspiration et quatre-vingt-dix-neuf pour cent de transpiration.", author: "Thomas Edison" },
  { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Mahatma Gandhi" },
  { text: "Deux choses sont infinies : l'univers et la bêtise humaine. Mais en ce qui concerne l'univers, je n'en ai pas encore acquis la certitude absolue.", author: "Albert Einstein" },
  { text: "Celui qui déplace une montagne commence par déplacer de petites pierres.", author: "Confucius" },
  { text: "Dans le milieu du chemin de notre vie, je me trouvai dans une forêt obscure.", author: "Dante Alighieri" },
  { text: "Il n'y a qu'une façon d'éviter la critique : ne rien faire, ne rien dire et n'être rien.", author: "Aristote" },
  { text: "Nous sommes ce que nous faisons de manière répétée. L'excellence n'est donc pas un acte, mais une habitude.", author: "Aristote" },
  { text: "La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information.", author: "Albert Einstein" },
  { text: "Mieux vaut allumer une bougie que maudire les ténèbres.", author: "Confucius" },
  { text: "La vie sans examen ne vaut pas la peine d'être vécue.", author: "Socrate" },
  { text: "Ce que nous savons est une goutte, ce que nous ignorons est un océan.", author: "Isaac Newton" },
  { text: "Soyez vous-même, tous les autres sont déjà pris.", author: "Oscar Wilde" },
  { text: "Je n'ai pas échoué. J'ai simplement trouvé 10 000 solutions qui ne fonctionnent pas.", author: "Thomas Edison" },
  { text: "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.", author: "Franklin D. Roosevelt" },
  { text: "Parlez seulement si vous êtes sûr de dire quelque chose de plus beau que le silence.", author: "Pythagore" },
  { text: "La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute.", author: "Nelson Mandela" },
  { text: "Un voyage de mille lieues commence toujours par un premier pas.", author: "Lao Tseu" },
  { text: "Ce que l'on conçoit bien s'énonce clairement, et les mots pour le dire arrivent aisément.", author: "Nicolas Boileau" },
  { text: "La liberté des uns s'arrête là où commence celle des autres.", author: "Jean-Paul Sartre" },
  { text: "L'art est le mensonge qui nous permet de reconnaître la vérité.", author: "Pablo Picasso" },
  { text: "Vivez comme si vous deviez mourir demain. Apprenez comme si vous deviez vivre éternellement.", author: "Mahatma Gandhi" },
  { text: "Il faut toujours viser la lune, car même en cas d'échec, on atterrit dans les étoiles.", author: "Oscar Wilde" },
  { text: "La folie, c'est de faire toujours la même chose et de s'attendre à un résultat différent.", author: "Albert Einstein" },
  { text: "Le bonheur n'est pas quelque chose de tout fait. Il vient de vos propres actions.", author: "Dalaï-Lama XIV" },
  { text: "Vivez comme si vous n'aviez jamais été blessé, dansez comme si personne ne vous regardait.", author: "Mark Twain" },
]

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json().catch(() => ({}))
    if (!pin) return NextResponse.json({ error: 'Missing PIN' }, { status: 401 })

    const hash = crypto.createHash('sha256').update(String(pin)).digest('hex')
    if (hash !== PIN_HASH) return NextResponse.json({ error: 'Wrong PIN' }, { status: 403 })

    const db = getAdminDb()

    // Delete existing seed messages
    const existing = await db.collection('messages').where('userId', '==', 'seed').get()
    const deleteBatch = db.batch()
    existing.docs.forEach(d => deleteBatch.delete(d.ref))
    if (!existing.empty) await deleteBatch.commit()

    // Insert with correct field names matching Message type
    const batch = db.batch()
    const now = new Date()

    CITATIONS.forEach((c, i) => {
      const ref = db.collection('messages').doc()
      batch.set(ref, {
        userId: 'seed',
        content: c.text,
        slotNumber: i + 1,
        displayName: c.author,
        verified: true,
        createdAt: FieldValue.serverTimestamp(),
      })
    })

    await batch.commit()
    return NextResponse.json({ ok: true, count: CITATIONS.length })
  } catch (err) {
    console.error('[admin/seed]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

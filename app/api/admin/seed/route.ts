import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const PIN_HASH = process.env.ADMIN_PIN_HASH ?? ''

const CITATIONS: Array<{ text: string; author: string; year: number }> = [
  { text: "Le secret d'ennuyer est celui de tout dire.", author: "Voltaire", year: 1694 },
  { text: "On ne voit bien qu'avec le cœur. L'essentiel est invisible pour les yeux.", author: "Antoine de Saint-Exupéry", year: 1900 },
  { text: "La vie, c'est ce qui arrive quand on a d'autres projets.", author: "John Lennon", year: 1940 },
  { text: "Je pense, donc je suis.", author: "René Descartes", year: 1596 },
  { text: "L'imagination est plus importante que le savoir.", author: "Albert Einstein", year: 1879 },
  { text: "Le génie, c'est un pour cent d'inspiration et quatre-vingt-dix-neuf pour cent de transpiration.", author: "Thomas Edison", year: 1847 },
  { text: "Soyez le changement que vous voulez voir dans le monde.", author: "Mahatma Gandhi", year: 1869 },
  { text: "Le bonheur n'est pas quelque chose de tout fait. Il vient de vos propres actions.", author: "Dalaï-Lama XIV", year: 1935 },
  { text: "Deux choses sont infinies : l'univers et la bêtise humaine. Mais en ce qui concerne l'univers, je n'en ai pas encore acquis la certitude absolue.", author: "Albert Einstein", year: 1879 },
  { text: "Celui qui déplace une montagne commence par déplacer de petites pierres.", author: "Confucius", year: -551 },
  { text: "La folie, c'est de faire toujours la même chose et de s'attendre à un résultat différent.", author: "Albert Einstein", year: 1879 },
  { text: "Dans le milieu du chemin de notre vie, je me trouvai dans une forêt obscure.", author: "Dante Alighieri", year: 1265 },
  { text: "Il n'y a qu'une façon d'éviter la critique : ne rien faire, ne rien dire et n'être rien.", author: "Aristote", year: -384 },
  { text: "Nous sommes ce que nous faisons de manière répétée. L'excellence n'est donc pas un acte, mais une habitude.", author: "Aristote", year: -384 },
  { text: "La connaissance s'acquiert par l'expérience, tout le reste n'est que de l'information.", author: "Albert Einstein", year: 1879 },
  { text: "Le temps que tu prends pour ta rose fait ta rose si importante.", author: "Antoine de Saint-Exupéry", year: 1900 },
  { text: "Mieux vaut allumer une bougie que maudire les ténèbres.", author: "Confucius", year: -551 },
  { text: "La vie sans examen ne vaut pas la peine d'être vécue.", author: "Socrate", year: -470 },
  { text: "Ce que nous savons est une goutte, ce que nous ignorons est un océan.", author: "Isaac Newton", year: 1643 },
  { text: "Il faut toujours viser la lune, car même en cas d'échec, on atterrit dans les étoiles.", author: "Oscar Wilde", year: 1854 },
  { text: "Soyez vous-même, tous les autres sont déjà pris.", author: "Oscar Wilde", year: 1854 },
  { text: "Je n'ai pas échoué. J'ai simplement trouvé 10 000 solutions qui ne fonctionnent pas.", author: "Thomas Edison", year: 1847 },
  { text: "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.", author: "Franklin D. Roosevelt", year: 1882 },
  { text: "Parlez seulement si vous êtes sûr de dire quelque chose de plus beau que le silence.", author: "Pythagore", year: -570 },
  { text: "La plus grande gloire n'est pas de ne jamais tomber, mais de se relever à chaque chute.", author: "Nelson Mandela", year: 1918 },
  { text: "Un voyage de mille lieues commence toujours par un premier pas.", author: "Lao Tseu", year: -604 },
  { text: "Ce que l'on conçoit bien s'énonce clairement, et les mots pour le dire arrivent aisément.", author: "Nicolas Boileau", year: 1636 },
  { text: "La liberté des uns s'arrête là où commence celle des autres.", author: "Jean-Paul Sartre", year: 1905 },
  { text: "L'art est le mensonge qui nous permet de reconnaître la vérité.", author: "Pablo Picasso", year: 1881 },
  { text: "Vivez comme si vous deviez mourir demain. Apprenez comme si vous deviez vivre éternellement.", author: "Mahatma Gandhi", year: 1869 },
]

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json().catch(() => ({}))
    if (!pin) return NextResponse.json({ error: 'Missing PIN' }, { status: 401 })

    const hash = crypto.createHash('sha256').update(String(pin)).digest('hex')
    if (hash !== PIN_HASH) return NextResponse.json({ error: 'Wrong PIN' }, { status: 403 })

    const db = getAdminDb()
    const batch = db.batch()
    const now = new Date()

    for (let i = 0; i < CITATIONS.length; i++) {
      const c = CITATIONS[i]
      const ref = db.collection('messages').doc()
      batch.set(ref, {
        text: `"${c.text}" — ${c.author}`,
        displayName: c.author,
        uid: 'seed',
        verified: true,
        createdAt: new Date(now.getTime() - (CITATIONS.length - i) * 60_000),
        wordCount: c.text.split(/\s+/).length,
      })
    }

    await batch.commit()
    return NextResponse.json({ ok: true, count: CITATIONS.length })
  } catch (err) {
    console.error('[admin/seed]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

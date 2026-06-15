import { NextResponse } from 'next/server'
import { getAdminDb }   from '@/lib/firebase/admin'
import { Timestamp }    from 'firebase-admin/firestore'

// One-time seed route — protected by secret header, remove after use
const SEED_SECRET = process.env.SEED_SECRET ?? 'hpax-seed-2024'

const QUOTES = [
  { name: 'Marcus Aurelius',        slot: 1,  content: 'You have power over your mind, not outside events. Realise this, and you will find strength.' },
  { name: 'Simone de Beauvoir',     slot: 2,  content: 'One is not born, but rather becomes, a woman.' },
  { name: 'Albert Camus',           slot: 3,  content: 'In the depth of winter I finally learned that there was in me an invincible summer.' },
  { name: 'Virginia Woolf',         slot: 4,  content: 'You cannot find peace by avoiding life.' },
  { name: 'James Baldwin',          slot: 5,  content: 'Not everything that is faced can be changed, but nothing can be changed until it is faced.' },
  { name: 'Frida Kahlo',            slot: 6,  content: 'I tried to drown my sorrows, but the bastards learned how to swim.' },
  { name: 'Franz Kafka',            slot: 7,  content: 'A book must be the axe for the frozen sea inside us.' },
  { name: 'Hannah Arendt',          slot: 8,  content: 'The most radical revolutionary will become a conservative the day after the revolution.' },
  { name: 'Oscar Wilde',            slot: 9,  content: 'To live is the rarest thing in the world. Most people exist, that is all.' },
  { name: 'Rainer Maria Rilke',     slot: 10, content: 'Perhaps all the dragons in our lives are princesses who are only waiting to see us act, just once, with beauty and courage.' },
  { name: 'Audre Lorde',            slot: 11, content: 'When I dare to be powerful, to use my strength in the service of my vision, then it becomes less and less important whether I am afraid.' },
  { name: 'Friedrich Nietzsche',    slot: 12, content: 'Without music, life would be a mistake.' },
  { name: 'Toni Morrison',          slot: 13, content: 'If you have some power, then your job is to empower somebody else.' },
  { name: 'Samuel Beckett',         slot: 14, content: 'Ever tried. Ever failed. No matter. Try again. Fail again. Fail better.' },
  { name: 'Simone Weil',            slot: 15, content: 'Attention is the rarest and purest form of generosity.' },
  { name: 'Gabriel García Márquez', slot: 16, content: 'A person does not die when they should, but when they can.' },
  { name: 'Sylvia Plath',           slot: 17, content: 'I took a deep breath and listened to the old brag of my heart: I am, I am, I am.' },
  { name: 'Langston Hughes',        slot: 18, content: 'Life is for the living. Death is for the dead. Let life be like music. And death a note unsaid.' },
  { name: 'Roland Barthes',         slot: 19, content: 'What I claim is to live to the full the contradiction of my time.' },
  { name: 'Susan Sontag',           slot: 20, content: 'Do stuff. Be clenched, curious. Not waiting for inspiration\'s shove or society\'s kiss on your forehead.' },
  { name: 'Albert Einstein',        slot: 21, content: 'Imagination is more important than knowledge.' },
  { name: 'Pablo Picasso',          slot: 22, content: 'The meaning of life is to find your gift. The purpose of life is to give it away.' },
  { name: 'Anaïs Nin',              slot: 23, content: 'Life shrinks or expands in proportion to one\'s courage.' },
  { name: 'James Dean',             slot: 24, content: 'Dream as if you\'ll live forever. Live as if you\'ll die today.' },
  { name: 'Edith Piaf',             slot: 25, content: 'Non, je ne regrette rien.' },
  { name: 'Nikola Tesla',           slot: 26, content: 'The present is theirs; the future, for which I really worked, is mine.' },
  { name: 'Khalil Gibran',          slot: 27, content: 'The most beautiful thing is to see a person you love smiling. And even more beautiful is knowing that you are the reason behind it.' },
  { name: 'Ernest Hemingway',       slot: 28, content: 'There is nothing noble in being superior to your fellow man. True nobility is being superior to your former self.' },
  { name: 'Maya Angelou',           slot: 29, content: 'You will face many defeats in life, but never let yourself be defeated.' },
  { name: 'Leonardo da Vinci',      slot: 30, content: 'Simplicity is the ultimate sophistication.' },
]

export async function POST(req: Request) {
  const secret = req.headers.get('x-seed-secret')
  if (secret !== SEED_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const db = getAdminDb()
    const existing = await db.collection('messages').limit(1).get()
    if (!existing.empty) {
      return NextResponse.json({ message: 'Already seeded', count: 0 })
    }

    const now   = Date.now()
    const batch = db.batch()

    for (const q of QUOTES) {
      const userId  = `seed_${q.name.toLowerCase().replace(/[\s']/g, '_').replace(/[^a-z_]/g, '')}`
      const profileRef = db.collection('profiles').doc(userId)
      batch.set(profileRef, {
        displayName:  q.name,
        messageCount: q.slot,
        verified:     true,
        createdAt:    Timestamp.fromMillis(now - (31 - q.slot) * 86400000 * 30),
      }, { merge: true })

      const msgRef = db.collection('messages').doc()
      batch.set(msgRef, {
        userId,
        displayName: q.name,
        content:     q.content,
        slotNumber:  q.slot,
        verified:    true,
        createdAt:   Timestamp.fromMillis(now - (31 - q.slot) * 86400000 * 2),
      })
    }

    await batch.commit()
    return NextResponse.json({ message: 'Seeded', count: QUOTES.length })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

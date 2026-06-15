# HPAX

> You have 100 things to say.

Application web Next.js 14 + Supabase. Chaque utilisateur dispose de 100 messages à vie. Les messages sont permanents, immuables, et numérotés.

---

## Stack

- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Fonts** : Playfair Display + Space Mono (Google Fonts)
- **Déploiement** : Vercel

---

## Démarrage rapide

### 1. Créer un projet Supabase

1. Va sur [supabase.com](https://supabase.com) → New Project
2. Note l'**URL** et la **clé anon** depuis Settings > API

### 2. Lancer la migration SQL

Dans Supabase, ouvre **SQL Editor** et colle le contenu de `supabase/migrations/001_init.sql`.

Ce fichier crée :
- La table `profiles` (1 par utilisateur, nom permanent, flag `verified` pour la future vérification d'identité)
- La table `messages` (immuable — aucun UPDATE ni DELETE possible même côté admin)
- La fonction `post_message()` (SECURITY DEFINER — seul chemin autorisé pour poster, atomique, anti-race condition)
- Les politiques RLS (lecture publique, écriture uniquement via la fonction)

### 3. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Edite `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Configurer l'auth Supabase

Dans Supabase → Authentication → URL Configuration :
- **Site URL** : `http://localhost:3000` (local) ou ton domaine en prod
- **Redirect URLs** : ajoute `http://localhost:3000/auth/callback` et `https://ton-domaine.com/auth/callback`

### 5. Lancer l'app

```bash
npm install
npm run dev
```

---

## Déploiement Vercel

```bash
npm i -g vercel
vercel
```

Ou connecte le repo GitHub à Vercel et ajoute les 3 variables d'env dans les settings du projet.

N'oublie pas de mettre à jour `NEXT_PUBLIC_SITE_URL` avec ton URL Vercel.

---

## Architecture de sécurité

### Pourquoi les données ne peuvent pas être perdues

- **Règles PostgreSQL** : `_no_delete_messages` et `_no_update_messages` bloquent toute suppression ou modification, y compris par un superuser via un ORM. C'est une règle au niveau moteur SQL, pas une simple politique.
- **Contraintes DB** : `UNIQUE(user_id, slot_number)` et `CHECK(slot_number BETWEEN 1 AND 100)` garantissent l'intégrité même si quelqu'un bypassait le code.
- **RLS** : lecture publique, aucun INSERT/UPDATE/DELETE direct depuis le client.

### Pourquoi ça ne peut pas être hacké

- **Limite 100 appliquée côté DB** : la fonction `post_message()` fait un `SELECT ... FOR UPDATE` avant d'insérer. Même si 10 requêtes arrivent simultanément, une seule passera — les autres attendront et verront le compteur à jour.
- **Slot assigné côté serveur** : le client ne peut pas choisir son slot_number. Il est calculé par la fonction.
- **Pas d'INSERT direct** : le client ne peut appeler que `supabase.rpc('post_message', ...)`. Toute tentative de `supabase.from('messages').insert()` est bloquée par RLS (aucune politique INSERT).
- **SECURITY DEFINER** : la fonction s'exécute avec les droits du propriétaire (postgres), pas de l'appelant. Aucun moyen de contourner la logique via les droits utilisateur.
- **Contenu validé** : 100 mots max, côté client ET côté DB (double validation).

### Scalabilité

La clé de verrouillage `FOR UPDATE` est par utilisateur (sur ses propres messages), donc deux utilisateurs différents ne se bloquent jamais l'un l'autre.

---

## Futures fonctionnalités

### Profils vérifiés (prêt dans le schéma)

Le champ `profiles.verified` existe déjà. Pour activer la vérification :
1. Intégrer un service de vérification d'identité (Persona, Stripe Identity, Onfido...)
2. Créer une route admin pour passer `verified = true` via le service role Supabase
3. Afficher le ✓ dans l'UI (déjà implémenté dans `FeedEntry.tsx`)

### Partage social automatique (OAuth)

Actuellement, le partage est via Web Intents (popup). Pour poster automatiquement :
- **Twitter/X** : Twitter API v2 OAuth 2.0 PKCE
- **Facebook** : Facebook Graph API (nécessite app review)
- **Instagram** : Instagram Graph API (nécessite compte Creator/Business)
- **LinkedIn** : LinkedIn Share API

Ces intégrations nécessitent des credentials d'app chez chaque plateforme.

### App native

L'API (Supabase) est identique pour React Native. Le package `@supabase/supabase-js` fonctionne dans Expo.

---

## Structure des fichiers

```
hpax/
├── app/
│   ├── page.tsx                  # Root : landing pub ou app connectée
│   ├── join/page.tsx             # Onboarding : saisie email
│   ├── join/name/page.tsx        # Onboarding : choix du nom
│   └── auth/callback/route.ts   # Handler magic link Supabase
├── components/
│   ├── HpaxMain.tsx              # Écran principal (counter + form + feed)
│   ├── Counter.tsx               # Le grand nombre
│   ├── MessageForm.tsx           # Input + validation + partage
│   ├── ShareModal.tsx            # Modal partage social post-publication
│   ├── FeedEntry.tsx             # Une entrée du feed
│   └── FeedOverlay.tsx          # Feed plein écran
├── lib/
│   ├── supabase/client.ts        # Client navigateur
│   ├── supabase/server.ts        # Client serveur (Server Components)
│   └── types.ts                  # Types TypeScript
├── middleware.ts                  # Auth middleware Next.js
└── supabase/migrations/
    └── 001_init.sql              # Schéma complet
```

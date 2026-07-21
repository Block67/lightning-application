# Lightning App

App Bitcoin/Lightning — UTXO Visualizer, Blog et Jeu d'équipe, connectés via Lightning (LNURL-auth + WebLN).

> Nouveau sur les LApps (LNURL-auth, WebLN, signatures Lightning) ? Voir [LAPP-GUIDE.md](LAPP-GUIDE.md) — cours détaillé, débutant → intermédiaire, basé sur le code de ce projet.

---

## Lancer le projet

```bash
npm install
cd server && npm install && cd ..
npm run dev
```

Cela démarre simultanément :
- **Frontend** Vite sur `http://localhost:5173`
- **Serveur** Express sur `http://localhost:3000`

Pour tester la connexion Lightning depuis un vrai wallet mobile, il faut exposer le serveur via ngrok :

```bash
ngrok http 3000
# Copier l'URL https://xxx.ngrok-free.app dans server/.env → SERVER_URL
```

---

## Architecture générale

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Vue 3 + Vite)                                  │
│                                                          │
│  Landing  →  UTXOs  →  Blog  →  Jeu d'équipe             │
│                                                          │
│  Pinia stores : auth | utxo | fees (interne) | game | posts │
│  IndexedDB (Dexie) : xpub sauvegardé par utilisateur      │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch /auth/*, /api/*, /game/*, /posts
                           │ (proxy Vite → localhost:3000)
┌──────────────────────────▼──────────────────────────────┐
│  Serveur Express (Node.js)                               │
│                                                          │
│  /auth/challenge  →  génère k1 + LNURL QR               │
│  /auth/callback   ←  wallet Lightning signe et rappelle  │
│  /auth/webln-callback ← signature WebLN (login 1 clic)   │
│  /auth/status     →  frontend poll, reçoit le JWT        │
│  /api/utxos/:xpub →  dérive adresses + agrège UTXOs      │
│  /game/*          →  jeu d'équipe (score, leaderboard)    │
│  /posts           →  blog (CRUD REST)                     │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch
┌──────────────────────────▼──────────────────────────────┐
│  mempool.space API (données blockchain publiques)        │
│                                                          │
│  /api/v1/fees/recommended   →  frais actuels             │
│  /api/v1/mining/blocks/…    →  historique 7 jours        │
│  /api/address/{addr}/utxo   →  UTXOs par adresse         │
│  /api/v1/prices             →  prix BTC en EUR           │
└─────────────────────────────────────────────────────────┘
```

---

## Authentification LNURL-auth

**Accessible à tous :** consultation du Blog, consultation du Jeu d'équipe  
**Connexion requise :** UTXO Visualizer, publier sur le Blog, marquer un point dans le Jeu

### Comment ça fonctionne

LNURL-auth est un protocole qui permet de se connecter à un site avec son wallet Lightning, sans email ni mot de passe. Le wallet prouve qu'il contrôle une clé privée Bitcoin.

**Étape par étape :**

```
1. Frontend  →  GET /auth/challenge
               ← { k1, lnurl (QR code) }

   k1 = 32 octets aléatoires (le "défi")
   lnurl = version encodée de l'URL de callback

2. L'utilisateur scanne le QR avec son wallet Lightning
   Le wallet décode le LNURL et obtient l'URL de callback

3. Wallet    →  GET /auth/callback?k1=...&sig=...&key=...
               sig = signature ECDSA du k1 avec la clé privée Lightning
               key = clé publique Lightning (identifiant unique de l'utilisateur)
               ← { status: "OK" }

4. Frontend  →  GET /auth/status?k1=...  (polling toutes les 2s)
               ← { status: "ok", token: "eyJ..." }

   Le JWT contient : { pubkey: "02abc...", exp: +30j }
   Stocké dans localStorage("sb_token")

5. Toutes les requêtes suivantes incluent :
   Authorization: Bearer eyJ...
```

**Wallets compatibles :** Phoenix, Zeus, Breez, Alby, Blink

**Sécurité :** Le serveur ne stocke jamais de mot de passe. La vérification se fait par `verifyAuthorizationSignature(sig, k1, key)` — si la signature est valide, l'utilisateur prouve qu'il possède la clé privée correspondant à `key` sans jamais l'exposer.

**Identification multi-sessions :** Chaque utilisateur est identifié par sa `pubkey` Lightning (ex: `02f3d...`). Ses données (achats DCA, xpub) sont stockées localement dans IndexedDB, indexées par cette pubkey. Deux appareils différents avec le même wallet retrouvent les mêmes données si elles ont été saisies sur l'appareil.

---

## Feature 1 — UTXO Visualizer

**Accès :** connexion Lightning requise  
**Page :** `/utxos`  
**Store :** `src/stores/utxo.js`  
**Endpoint serveur :** `GET /api/utxos/:xpub`

### Ce qu'est un UTXO

Un **UTXO** (Unspent Transaction Output) est un "billet Bitcoin" non dépensé dans ton wallet. Ton solde total = somme de tous tes UTXOs. Par exemple, si tu as reçu 0.001 BTC une fois et 0.0005 BTC une autre fois, tu as 2 UTXOs.

### Pourquoi visualiser ses UTXOs

- Trop d'UTXOs de petite taille → frais élevés à la prochaine transaction (chaque UTXO coûte ~68 vBytes en entrée)
- **Consolidation** : regrouper ses UTXOs en un seul quand les frais sont bas permet d'économiser sur le long terme

### Ce que tu dois fournir : le xpub / zpub

Le **xpub** (extended public key) est la clé publique maître de ton wallet Bitcoin. Elle permet de :
- Dériver toutes tes adresses (sans jamais toucher à ta clé privée)
- Voir ton solde et tes UTXOs
- **Ne permet PAS de dépenser** — c'est une clé de lecture seule

| Format | Type de wallet | Adresses générées |
|--------|---------------|-------------------|
| `xpub...` | Legacy (P2PKH) | `1...` |
| `ypub...` | Wrapped SegWit (P2SH-P2WPKH) | `3...` |
| `zpub...` | Native SegWit (P2WPKH) | `bc1q...` |

**Où trouver le xpub/zpub selon ton wallet :**
- **BlueWallet** → Détails du wallet → Exporter / montrer le XPUB
- **Sparrow** → Wallet → Settings → Descriptor
- **Ledger** → Via Sparrow ou Ledger Live → Compte → Avancé
- ⚠️ Wallet of Satoshi et Blink sont **custodials** → ils ne donnent pas accès au xpub

### Comment le serveur dérive les adresses

Comme `mempool.space` ne supporte pas les requêtes xpub directement en API publique, le serveur dérive les adresses manuellement :

```
zpub (ex: zpub6rYcJH...) 
  ↓ normalisation des version bytes → xpub
  ↓ HDKey.fromExtendedKey(xpub)     (@scure/bip32)
  ↓ dérivation BIP32 :
     m/0/0  m/0/1  m/0/2  ... → adresses de réception
     m/1/0  m/1/1  m/1/2  ... → adresses de change

Pour chaque adresse :
  GET mempool.space/api/address/{addr}       → nb de transactions
  Si 0 transaction → gap++
  Si gap >= 20 → stop (BIP44 gap limit)
  Sinon :
  GET mempool.space/api/address/{addr}/utxo  → liste des UTXOs
```

**Gap limit de 20** : standard BIP44 — si 20 adresses consécutives n'ont jamais été utilisées, on considère que le scan est complet.

### Données retournées

```json
{
  "utxos": [
    {
      "txid": "abc123...",
      "vout": 0,
      "value": 150000,          // satoshis
      "status": { "confirmed": true, "block_height": 840000 },
      "address": "bc1q...",
      "chain": 0,               // 0 = réception, 1 = change
      "index": 3                // position dans la dérivation
    }
  ],
  "stats": {
    "funded_txo_count": 12,     // total de transactions reçues
    "spent_txo_count": 8,       // total de transactions dépensées
    "funded_txo_sum": 5000000   // satoshis totaux reçus
  }
}
```

### Conseil de consolidation

Calculé localement dans le store :
```
taille consolidation = 10 + (nb_utxos × 68) + 31 vB
frais = taille × taux_heure

worthIt = true  si frais_heure <= 5 sat/vB
                (frais bas = bon moment pour consolider)
```

> Le taux de frais utilisé ici vient de `src/stores/fees.js` — ce store n'a plus de page dédiée, il sert uniquement en interne à ce calcul de consolidation (`GET mempool.space/api/v1/fees/recommended`).

---

## Feature 2 — Blog (mur de publication)

**Accès :** lecture publique · publication réservée aux connectés  
**Page :** `/blog`  
**Store :** `src/stores/posts.js`  
**Endpoints serveur :** `GET/POST /posts`, `GET/DELETE /posts/:id`

Il faut se connecter (LNURL-auth ou WebLN) pour publier un message ; tout le monde voit le fil en direct (poll toutes les 2s). Chaque post affiche la pubkey (tronquée) de l'auteur — pseudonyme, pas anonyme, voir [LAPP-GUIDE.md § 4.7](LAPP-GUIDE.md#47-pseudonymat-pas-anonymat). CRUD REST classique (`GET`/`POST`/`DELETE`, codes 200/201/204/403/404) — voir détail des routes dans `server/src/posts.js`. Chaque auteur peut supprimer ses propres posts.

---

## Feature 3 — Jeu d'équipe

**Accès :** lecture publique · marquer un point réservé aux connectés  
**Page :** `/game`  
**Store :** `src/stores/game.js`  
**Endpoints serveur :** `GET /game/leaderboard`, `POST /game/score`, `POST /game/reset`

Pensé pour un exercice de classe/atelier : on choisit une équipe (Phoenix 🐦 vs Zeus ⚡), on se connecte via Lightning, et on marque **un point par pubkey** pour son équipe (pas un compteur de clics — l'objectif est de pratiquer une vraie connexion LNURL-auth/WebLN). Leaderboard en direct (poll 2s). Scores en mémoire côté serveur ; `POST /game/reset` (protégé par `GAME_RESET_KEY` dans `server/.env`) permet de remettre à zéro entre deux sessions.

---

## Feature 4 — Tip Jar (WebLN)

**Accès :** public, sans connexion
**Composant :** `src/components/TipButton.vue`
**Composable :** `src/composables/useWebln.js`

### Ce que ça fait

Bouton "⚡ Tip" dans la nav (desktop + mobile) permettant à n'importe quel visiteur d'envoyer un don Lightning, sans backend dédié.

### Comment ça fonctionne

```
1. Clic sur le bouton
2. Si window.webln existe (extension type Alby installée) :
   → webln.enable()
   → webln.lnurl(VITE_TIP_LIGHTNING_ADDRESS)
   Le montant est demandé directement dans l'UI de l'extension —
   l'app ne gère ni le montant ni la confirmation.

3. Sinon (pas d'extension détectée) :
   → Fallback : lien "lightning:<adresse>" + bouton copier l'adresse
```

**Important — ce que ce flow NE fait PAS :** le paiement part directement du wallet du visiteur vers l'adresse configurée (gérée par Alby), sans jamais passer par le serveur Express. L'app n'a donc **aucune confirmation** qu'un paiement a eu lieu. Suffisant pour un don libre, insuffisant pour vendre un service payant (voir note ci-dessous).

### Vendre un service payant (non implémenté)

Pour débloquer un contenu/service après paiement, il faudrait inverser le flow : le **serveur** génère l'invoice (via un node/provider qu'il contrôle — LNbits, Alby API, BTCPay Server...), stocke l'état `{ paymentHash, status }` (en mémoire comme les challenges LNURL-auth, ou en base si persistance nécessaire), puis vérifie le règlement par webhook ou polling avant de délivrer l'accès.

---

## Feature 5 — Menu Profil

**Composant :** `src/components/ProfileMenu.vue`

Une fois connecté, le badge pubkey dans la nav (desktop) devient un menu déroulant : pubkey complète (copiable), sélecteur de langue, déconnexion. Remplace l'ancien groupe de boutons à plat une fois authentifié. Sur mobile, ces actions restent affichées directement dans le menu hamburger (pas de dropdown imbriqué).

---

## Stockage des données

| Donnée | Où | Persistance |
|--------|-----|-------------|
| Token JWT | `localStorage("sb_token")` | 30 jours |
| Langue choisie | `localStorage("sb_lang")` | Permanent |
| xpub / zpub | IndexedDB table `settings` | Permanent |
| Frais / prix | Mémoire (Pinia) | Session uniquement |
| UTXOs | Mémoire (Pinia) | Session uniquement |
| Posts du blog | Mémoire (serveur) | Jusqu'au redémarrage serveur |
| Scores du jeu | Mémoire (serveur) | Jusqu'au redémarrage serveur / `POST /game/reset` |

---

## Endpoints serveur

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/auth/challenge` | — | Génère k1 + QR LNURL |
| `GET` | `/auth/callback` | — | Reçoit signature wallet |
| `POST` | `/auth/webln-callback` | — | Reçoit signature WebLN (login 1 clic) |
| `GET` | `/auth/status` | — | Poll → retourne JWT |
| `GET` | `/auth/me` | JWT | Vérifie token |
| `GET` | `/api/utxos/:xpub` | JWT | Dérive adresses + UTXOs |
| `GET` | `/posts` | — | Liste les posts du blog |
| `GET` | `/posts/:id` | — | Détail d'un post |
| `POST` | `/posts` | JWT | Publie un post |
| `DELETE` | `/posts/:id` | JWT | Supprime son propre post |
| `GET` | `/game/leaderboard` | — | Scores par équipe |
| `POST` | `/game/score` | JWT | Marque un point (1/pubkey) |
| `POST` | `/game/reset` | `x-reset-key` | Remet le jeu à zéro |
| `GET` | `/health` | — | Vérification serveur |

---

## Stack technique

| Couche | Tech |
|--------|------|
| Framework | Vue 3 (Composition API) |
| State | Pinia |
| Routing | Vue Router |
| i18n | vue-i18n v9 (FR / EN) |
| DB locale | Dexie.js (IndexedDB) |
| PWA | vite-plugin-pwa + Workbox |
| Dérivation xpub | @scure/bip32 (BIP32 pur JS) |
| Hachage Bitcoin | @noble/hashes (sha256 + ripemd160) |
| Encodage adresses | @scure/base (bech32 + base58check) |
| Auth Lightning | lnurl (LNURL-auth) + jsonwebtoken |
| Paiement Lightning | WebLN (`window.webln`, ex: extension Alby) |
| Serveur | Express.js |
| Dev | Vite + concurrently |

---

## Variables d'environnement

### `.env` (racine, frontend)

```env
VITE_SERVER_URL=http://localhost:3000
VITE_TIP_LIGHTNING_ADDRESS=toi@getalby.com   # adresse de réception des tips
```

### `server/.env`

```env
PORT=3000
SERVER_URL=https://xxx.ngrok-free.app   # URL publique (ngrok en dev)
FRONTEND_URL=http://localhost:5173
JWT_SECRET=changez-ce-secret-en-production
```

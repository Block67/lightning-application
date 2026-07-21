# Lightning App

Dashboard Bitcoin personnel — Fee Estimator, UTXO Visualizer et DCA Tracker, connecté via Lightning (LNURL-auth).

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
│  Landing  →  Fees  →  UTXOs  →  Stack  →  Dashboard     │
│                                                          │
│  Pinia stores : fees | utxo | stack | auth               │
│  IndexedDB (Dexie) : achats DCA + xpub par utilisateur   │
└──────────────────────────┬──────────────────────────────┘
                           │ fetch /auth/* et /api/*
                           │ (proxy Vite → localhost:3000)
┌──────────────────────────▼──────────────────────────────┐
│  Serveur Express (Node.js)                               │
│                                                          │
│  /auth/challenge  →  génère k1 + LNURL QR               │
│  /auth/callback   ←  wallet Lightning signe et rappelle  │
│  /auth/status     →  frontend poll, reçoit le JWT        │
│  /api/utxos/:xpub →  dérive adresses + agrège UTXOs      │
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

**Accessible à tous :** Fee Estimator  
**Connexion requise :** UTXO Visualizer + Sat Stacker + Dashboard

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

## Feature 1 — Fee Estimator

**Accès :** public, sans connexion  
**Page :** `/fees`  
**Store :** `src/stores/fees.js`

### Ce que ça fait

Affiche en temps réel les frais de transaction Bitcoin recommandés par le mempool. Se met à jour toutes les **30 secondes** via un polling automatique (démarre à `onMounted`, s'arrête à `onBeforeUnmount`).

### Les données

Appel : `GET https://mempool.space/api/v1/fees/recommended`

Réponse :
```json
{
  "fastestFee": 12,    // sat/vB — confirmation en ~10 min
  "halfHourFee": 8,    // sat/vB — confirmation en ~30 min
  "hourFee": 5,        // sat/vB — confirmation en ~1h
  "economyFee": 2,     // sat/vB — confirmation en 1h+
  "minimumFee": 1      // sat/vB — minimum accepté par les nœuds
}
```

### Calcul du niveau de congestion

```js
fastestFee <= 5  → "low"    (frais bas, vert)
fastestFee <= 25 → "medium" (modérés, orange)
fastestFee > 25  → "high"   (élevés, rouge)
```

### Calculateur de transaction

Formule de taille pour une transaction P2WPKH SegWit :
```
taille (vBytes) = 10 + (nb_inputs × 68) + (nb_outputs × 31)
frais = taille × taux_sat_vB
```

Exemple : 1 entrée + 2 sorties = 10 + 68 + 62 = **140 vB**  
À 10 sat/vB → **1 400 sats** de frais

### Historique 7 jours

Appel : `GET https://mempool.space/api/v1/mining/blocks/fee-rates/1w`

Retourne un tableau de blocs avec le taux médian de frais. Affiché sous forme de courbe SVG (composant `FeeHistory.vue`).

---

## Feature 2 — UTXO Visualizer

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

---

## Feature 3 — Sat Stacker (DCA Tracker)

**Accès :** connexion Lightning requise  
**Page :** `/stack`  
**Store :** `src/stores/stack.js`  
**Stockage :** IndexedDB (Dexie), clé = pubkey Lightning

### Ce qu'est le DCA

Le **DCA** (Dollar Cost Averaging) consiste à acheter du Bitcoin régulièrement (ex: 50€ par semaine) au lieu de tout acheter d'un coup. Cela lisse le prix d'achat moyen et réduit l'impact de la volatilité.

### Ce que le tracker enregistre

Chaque achat contient :
```js
{
  id: 1,                  // auto-incrément
  pubkey: "02f3d...",     // identifiant Lightning de l'utilisateur
  date: "2024-03-15",     // date de l'achat
  sats: 250000,           // montant en satoshis achetés
  eurSpent: 120,          // euros dépensés
  priceAtBuy: 48000       // prix du Bitcoin ce jour-là (EUR)
}
```

### Calculs P&L

```
Total sats accumulés  = Σ sats de chaque achat
Total euros dépensés  = Σ eurSpent de chaque achat

Prix moyen d'achat    = totalEurSpent / (totalSats / 1e8)
Valeur actuelle       = (totalSats / 1e8) × prixActuelBTC

P&L (€)   = valeurActuelle − totalEurSpent
P&L (%)   = (P&L / totalEurSpent) × 100
```

Le prix actuel BTC est récupéré depuis `mempool.space/api/v1/prices` (retourne EUR, USD, GBP...).

**Exemple :**
```
Acheté 3 fois : 100k sats à 30k€/BTC, 150k sats à 35k€/BTC, 200k sats à 40k€/BTC
Total : 450k sats | 48€ + 52.5€ + 80€ = 180.5€ dépensés
Prix moyen : 180.5 / (450000/1e8) = 40 111 €/BTC
Si BTC vaut 45k€ → Valeur = 45k × 0.0045 = 202.5€
P&L = +22€ (+12.2%)
```

### Courbe d'accumulation

Le graphe SVG trace les sats accumulés dans le temps :
```js
// Tri par date, puis accumulation progressive
[100k, 250k, 450k] sats aux dates des achats
```

### Stockage local (IndexedDB)

Les données ne quittent **jamais** le navigateur. Dexie.js gère deux tables :

```
Table "purchases" :
  ++id (auto), pubkey (index), date
  → tous les achats DCA de l'utilisateur

Table "settings" :
  pubkey (clé primaire)
  → xpub sauvegardé pour ne pas le re-saisir à chaque fois
```

Chaque utilisateur est isolé par sa `pubkey` Lightning. Si tu te connectes avec un autre wallet, tu verras des données vides.

---

## Feature 4 — Dashboard

**Accès :** connexion Lightning requise  
**Page :** `/dashboard`

Vue d'ensemble qui agrège les 3 features :

| Bloc | Source |
|------|--------|
| Frais actuels (sat/vB) | `feesStore.fees.fastestFee` |
| Mon stack (sats + BTC) | `stackStore.totalSats` |
| Valeur actuelle (€) | `stackStore.currentValue` |
| P&L (€ et %) | `stackStore.pnl` + `stackStore.pnlPct` |
| Jauge des frais | `FeeGauge.vue` |
| UTXOs + consolidation | `utxoStore.utxoCount` |

---

## Feature 5 — Tip Jar (WebLN)

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

## Stockage des données

| Donnée | Où | Persistance |
|--------|-----|-------------|
| Token JWT | `localStorage("sb_token")` | 30 jours |
| Langue choisie | `localStorage("sb_lang")` | Permanent |
| Achats DCA | IndexedDB table `purchases` | Permanent |
| xpub / zpub | IndexedDB table `settings` | Permanent |
| Frais / prix | Mémoire (Pinia) | Session uniquement |
| UTXOs | Mémoire (Pinia) | Session uniquement |

---

## Endpoints serveur

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `GET` | `/auth/challenge` | — | Génère k1 + QR LNURL |
| `GET` | `/auth/callback` | — | Reçoit signature wallet |
| `GET` | `/auth/status` | — | Poll → retourne JWT |
| `GET` | `/auth/me` | JWT | Vérifie token |
| `GET` | `/api/utxos/:xpub` | JWT | Dérive adresses + UTXOs |
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

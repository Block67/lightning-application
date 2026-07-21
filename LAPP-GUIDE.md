# Construire une LApp — Cours complet (débutant → intermédiaire)

Ce guide explique, à partir du code réel de **Lightning App** (ce projet), comment fonctionne une **LApp** (Lightning Application) : une application web qui utilise le réseau Lightning Network pour l'authentification et/ou le paiement, sans compte, sans mot de passe, sans base de données serveur.

Chaque section renvoie vers les vrais fichiers du projet pour que tu puisses lire le code en même temps que la théorie.

---

## Table des matières

1. [C'est quoi une LApp ?](#1--cest-quoi-une-lapp-)
2. [Les briques cryptographiques de base](#2--les-briques-cryptographiques-de-base)
3. [LNURL — la famille de protocoles](#3--lnurl--la-famille-de-protocoles)
4. [Deep dive : LNURL-auth](#4--deep-dive--lnurl-auth)
5. [Deep dive : WebLN](#5--deep-dive--webln)
6. [Deep dive : la signature de message façon LND (zbase32)](#6--deep-dive--la-signature-de-message-façon-lnd-zbase32)
7. [Vue d'ensemble du code de ce projet](#7--vue-densemble-du-code-de-ce-projet)
8. [Sécurité — pourquoi c'est safe (et où sont les limites)](#8--sécurité--pourquoi-cest-safe-et-où-sont-les-limites)
9. [Glossaire](#9--glossaire)
10. [Pour aller plus loin](#10--pour-aller-plus-loin)

---

## 1 · C'est quoi une LApp ?

Une **LApp** (contraction de *Lightning App*) est une application qui branche le réseau **Lightning Network** — le réseau de paiement Bitcoin en micro-transactions instantanées — directement dans son UX. Concrètement, ça remplace des briques classiques du web :

| Problème classique | Solution web classique | Solution LApp |
|---|---|---|
| "Comment un utilisateur prouve son identité ?" | Email + mot de passe (+ souvent 2FA) | Le wallet Lightning **signe un défi cryptographique** |
| "Comment recevoir un paiement/don ?" | Stripe, PayPal, IBAN... (KYC, frais 2-3%, délais) | Une **adresse Lightning** ou une **invoice**, réglée en quelques secondes, frais quasi nuls |
| "Où stocker les données utilisateur ?" | Base de données serveur (mot de passe hashé, PII...) | Souvent **rien côté serveur** — les données restent dans le navigateur (IndexedDB) |

Dans ce projet, il y a deux LApp-features concrètes :

- **LNURL-auth** ([server/src/auth.js](server/src/auth.js)) → se connecter sans mot de passe
- **WebLN** ([src/composables/useWebln.js](src/composables/useWebln.js)) → payer/se connecter en un clic depuis une extension navigateur

L'idée commune aux deux : **une clé privée Lightning remplace le mot de passe**. Le serveur ne connaît jamais cette clé — il vérifie juste une signature mathématique.

---

## 2 · Les briques cryptographiques de base

Avant d'attaquer les protocoles, il faut comprendre 3 concepts. Si tu les connais déjà, saute à la [section 3](#3--lnurl--la-famille-de-protocoles).

### 2.1 Clé privée / clé publique (ECDSA sur secp256k1)

Bitcoin et Lightning utilisent la courbe elliptique **secp256k1**. Le principe :

```
clé privée (32 octets aléatoires, secrète)
        │
        │  multiplication sur la courbe (sens unique, non réversible)
        ▼
clé publique (peut être partagée sans risque)
```

Avec la clé privée, tu peux **signer** n'importe quel message. N'importe qui possédant ta clé publique peut **vérifier** que la signature correspond bien à ce message et à cette clé — sans jamais voir la clé privée.

C'est exactement ce qui remplace le mot de passe : au lieu de "je connais un secret partagé avec le serveur", c'est "je peux produire une signature que seule ma clé privée peut produire".

### 2.2 Hash (SHA-256)

Une fonction de hash transforme n'importe quelle donnée en une empreinte fixe de 32 octets, de façon déterministe et à sens unique. On ne signe jamais un message brut directement — on signe (le hash du message). Tu verras `sha256(sha256(...))` (double hash) plusieurs fois dans ce projet — c'est une convention héritée de Bitcoin (évite certaines attaques théoriques sur SHA-256 seul).

### 2.3 Signature récupérable (recoverable signature)

Une signature ECDSA "classique" (r, s) prouve qu'une clé publique *donnée* a signé un message. Une signature **récupérable** ajoute un petit indice (`recovery id`, 0 à 3) qui permet de **retrouver la clé publique directement à partir de la signature**, sans qu'elle soit fournie séparément — comme pour "récupérer" l'expéditeur d'un chèque juste à partir de sa signature.

C'est exactement le mécanisme utilisé par la fonction `signMessage()` des wallets Lightning (voir [section 6](#6--deep-dive--la-signature-de-message-façon-lnd-zbase32)), et implémenté ici avec le package `secp256k1` :

```js
// server/src/auth.js
const recovered = secp256k1.ecdsaRecover(signature, recid, digest, true)
// recovered = la clé publique, retrouvée mathématiquement depuis la signature
```

---

## 3 · LNURL — la famille de protocoles

**LNURL** est un ensemble de spécifications qui permettent à une app web de "parler" à un wallet Lightning via un simple QR code (ou un lien), sans API centralisée. Le principe général :

```
1. Le serveur génère une URL spéciale, encodée en Bech32, préfixée "LNURL..."
2. Cette URL est affichée en QR code
3. Le wallet scanne le QR, décode l'URL, et fait directement une requête HTTP dessus
4. Le serveur répond selon le "tag" de l'URL (login, payRequest, withdrawRequest...)
```

Plusieurs variantes existent, identifiées par un `tag` :

| Variante | Tag | Usage | Utilisé ici ? |
|---|---|---|---|
| **LNURL-auth** | `login` | S'authentifier sans mot de passe | ✅ [auth.js](server/src/auth.js) |
| **LNURL-pay** | `payRequest` | Recevoir un paiement (tip jar, don) | ✅ via WebLN `lnurl()` dans [TipButton.vue](src/components/TipButton.vue) |
| **LNURL-withdraw** | `withdrawRequest` | Le serveur *envoie* des sats à un wallet qui scanne | ❌ pas implémenté |
| **LNURL-channel** | `channelRequest` | Demander l'ouverture d'un canal Lightning | ❌ pas implémenté |

---

## 4 · Deep dive : LNURL-auth

C'est le cœur du système de connexion de ce projet. Fichier : [server/src/auth.js](server/src/auth.js), composant [LnAuthModal.vue](src/components/auth/LnAuthModal.vue).

### 4.1 Le principe en une phrase

> Le serveur génère un défi aléatoire (`k1`). Le wallet le signe avec une clé dérivée spécialement pour ce domaine. Le serveur vérifie la signature. S'il valide, l'utilisateur est identifié par sa clé publique — pour toujours, sans jamais avoir donné d'email.

### 4.2 Le flow, étape par étape

```
┌──────────┐                              ┌──────────┐                         ┌────────┐
│ Frontend │                              │ Serveur  │                         │ Wallet │
└────┬─────┘                              └────┬─────┘                         └───┬────┘
     │  GET /auth/challenge                    │                                   │
     │─────────────────────────────────────────▶                                  │
     │         { k1, lnurl (QR) }               │                                   │
     │◀─────────────────────────────────────────│                                   │
     │                                           │                                   │
     │  affiche le QR code                       │                                   │
     │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ scan ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─▶      │
     │                                           │                                   │
     │                                           │  GET /auth/callback?k1&sig&key   │
     │                                           │◀──────────────────────────────────│
     │                                           │  vérifie sig avec verifyAuthorizationSignature
     │                                           │  marque le challenge "résolu"     │
     │                                           │─────────────────────────────────▶│
     │                                           │           { status: OK }          │
     │  GET /auth/status?k1  (poll toutes les 2s)│                                   │
     │─────────────────────────────────────────▶│                                   │
     │         { status: ok, token: "eyJ..." }   │                                   │
     │◀─────────────────────────────────────────│                                   │
     │  stocke le JWT dans localStorage          │                                   │
```

### 4.3 Pourquoi `k1` ?

`k1` est **32 octets aléatoires**, générés une seule fois par tentative de connexion :

```js
// server/src/auth.js
const k1 = crypto.randomBytes(32).toString('hex')
challenges.set(k1, { resolved: false, pubkey: null, createdAt: Date.now() })
```

C'est le "défi" (*challenge*) : le wallet doit prouver qu'il peut le signer. Comme `k1` est aléatoire et à usage unique, un attaquant qui intercepterait une signature passée ne pourrait pas la réutiliser pour une connexion future (protection contre le *replay attack*).

### 4.4 La "linking key" — pourquoi ce n'est pas juste ta clé de wallet

Point important que beaucoup de débutants ratent : LNURL-auth **ne signe pas avec la clé privée de ton solde Bitcoin**. Le wallet dérive une clé spécifique, différente pour chaque domaine, à partir de ta seed :

```
seed maîtresse (ton wallet)
   │
   │  dérivation BIP32 spécifique au domaine (ex: hash du nom de domaine → chemin de dérivation)
   ▼
linkingKey pour "flashnotif.app"   (différente de la linkingKey pour "getalby.com")
```

**Pourquoi c'est malin :**
- Même seed, mais **une identité différente par site** → impossible de croiser tes comptes entre deux sites juste en comparant les clés publiques (contrairement à "Login with Google" où le même compte Google est visible partout)
- Aucun risque financier : cette clé ne peut **jamais** dépenser tes sats, elle sert uniquement à signer des messages d'authentification

### 4.5 Le callback et la vérification

Quand le wallet scanne le QR, il extrait l'URL de callback encodée dedans, et l'appelle directement :

```js
// server/src/auth.js
app.get('/auth/callback', (req, res) => {
  const { k1, sig, key } = req.query
  // sig = signature ECDSA de k1 par la linkingKey
  // key = la clé publique correspondante (= l'identité de l'utilisateur)

  if (!verifyAuthorizationSignature(sig, k1, key)) {
    return res.status(400).json({ status: 'ERROR', reason: 'Signature invalide' })
  }
  challenges.set(k1, { resolved: true, pubkey: key, createdAt: challenge.createdAt })
  return res.json({ status: 'OK' })
})
```

`verifyAuthorizationSignature` (fournie par le package `lnurl`) fait exactement l'étape 2.1 vue plus haut : vérifier qu'une signature `sig` correspond bien au message `k1` et à la clé publique `key`, sans jamais voir de clé privée.

### 4.6 Le token de session (JWT)

Une fois la signature validée, le serveur émet un **JWT** (JSON Web Token) — un jeton signé qui contient juste la pubkey :

```js
const token = jwt.sign({ pubkey: challenge.pubkey }, process.env.JWT_SECRET, { expiresIn: '30d' })
```

Le frontend le stocke dans `localStorage` et le renvoie dans le header `Authorization: Bearer ...` sur chaque requête protégée (voir `requireAuth` dans [server/src/index.js](server/src/index.js)). Le serveur n'a **rien à stocker** pour vérifier une session — c'est le principe même du JWT : la signature du token prouve qu'il a bien été émis par ton serveur, avec `JWT_SECRET` comme secret.

> **Pour les débutants :** le JWT n'est PAS chiffré, juste signé — n'importe qui peut lire son contenu (essaie de coller ton token sur [jwt.io](https://jwt.io)). Ne jamais y mettre d'info sensible, seulement un identifiant.

---

## 5 · Deep dive : WebLN

**WebLN** est un standard (indépendant de LNURL) qui définit une API JavaScript, injectée par les extensions de navigateur Lightning (Alby étant la plus connue), accessible via `window.webln`. Documentation officielle : [webln.guide](https://webln.guide).

### 5.1 Le principe

Contrairement à LNURL (qui passe par un QR code + requête HTTP faite par le wallet), WebLN permet au **JavaScript de la page** de dialoguer **directement** avec le wallet de l'utilisateur, dans le même navigateur — comme MetaMask pour Ethereum.

```js
if (window.webln) {
  await window.webln.enable()          // demande la permission à l'utilisateur
  const info = await window.webln.getInfo()   // infos sur le wallet connecté
}
```

### 5.2 Les méthodes qu'on utilise dans ce projet

| Méthode WebLN | Utilisée dans | Rôle |
|---|---|---|
| `enable()` | [useWebln.js](src/composables/useWebln.js) | Demande la permission de connexion (popup de l'extension) |
| `lnurl(address)` | `tip()` | Résout un flow LNURL-pay complet vers une Lightning Address — le montant est demandé dans l'UI de l'extension elle-même |
| `signMessage(message)` | `login()` | Signe un message arbitraire avec la clé d'identité du wallet |

### 5.2bis Pourquoi `getInfo()` n'est PAS utilisé pour le login — self-hosted vs custodial

Première version de ce login, on appelait `getInfo()` pour récupérer `info.node.pubkey`. Résultat en le testant avec un vrai compte Alby : **`Wallet incompatible (pubkey non exposée)`**. Comprendre pourquoi demande de comprendre une distinction essentielle dans l'écosystème Lightning.

**Un "vrai" node Lightning**, c'est un logiciel (LND, Core Lightning, Eclair...) que quelqu'un fait tourner quelque part — un serveur perso, un VPS, un Raspberry Pi. Ce node a sa propre paire de clés, ouvre ses propres canaux, et existe en tant qu'entité visible sur le graphe public du réseau Lightning. Faire tourner ça, c'est du **self-hosting** : ça coûte de l'infra, ça demande de la maintenance (liquidité des canaux, sauvegardes, uptime...), et ça demande des connaissances techniques. La grande majorité des utilisateurs Lightning n'a ni l'envie ni le besoin de faire ça.

**Les wallets "hébergés" (custodial)** — Alby (en mode compte hébergé, pas connecté à ton propre node), Wallet of Satoshi, Blink, Speed... — résolvent exactement ce problème : **un seul prestataire fait tourner un (ou quelques) vrai(s) node(s)**, et donne à chaque utilisateur un simple **solde dans sa propre base de données interne**, pas un node distinct sur le réseau. Vu du réseau Lightning, il n'existe qu'**un** node — celui du prestataire. Ton "wallet" n'est qu'une ligne comptable chez lui.

**Conséquence directe :** quand on appelle `getInfo()` sur un compte hébergé, il n'y a tout simplement **pas de pubkey de node personnelle à renvoyer** — parce que tu n'as pas de node. Selon l'implémentation, `getInfo()` renvoie alors soit rien, soit la pubkey *du prestataire* (partagée par tous ses utilisateurs — donc totalement inutilisable pour distinguer les utilisateurs entre eux, voire dangereuse si on s'en servait comme identité !).

| | Node self-hosted | Wallet custodial/hébergé (ex: Alby hosted) |
|---|---|---|
| Qui fait tourner le node ? | Toi | Le prestataire |
| `getInfo().node.pubkey` | Ta pubkey réelle, unique | Absente, ou pubkey partagée du prestataire |
| Coût / maintenance | Élevé (infra à gérer) | Nul (juste une app) |
| Popularité réelle | Minoritaire (power users) | Majoritaire (grand public) |

**En théorie, `signMessage()` devrait marcher quand même sur un compte custodial** : signer un message ne demande *aucune* information sur la topologie du node — juste une paire de clés valide, que le prestataire pourrait très bien gérer en interne pour ton compte. C'est pour ça qu'on a d'abord dérivé l'identité depuis la signature (recovery, voir section 6) plutôt que de dépendre de `getInfo()` : ça déplace l'exigence de "le wallet doit exposer un vrai node" vers "le wallet doit juste savoir signer un message" — nettement plus faible comme contrainte.

**En pratique, ce n'est toujours pas garanti.** En testant ce projet avec un vrai compte Alby hébergé, l'extension a carrément refusé d'exécuter `signMessage()` :

```
Erreur: SignMessage is not supported by Alby accounts.
Generate a Master Key to use LNURL auth.
```

Le message est éloquent : Alby indique explicitement que pour ce type de compte, il faut passer par... LNURL-auth (le flow QR classique de la section 4). Autrement dit, Alby n'implémente `signMessage()` que pour les comptes adossés à un vrai node — pour les comptes hébergés, seul le mécanisme LNURL-auth "linking key" (dérivation BIP32 spécifique au domaine, section 4.4) est disponible, pas la signature de message générique.

**Conclusion honnête :** le login WebLN en un clic est une **amélioration d'expérience pour les utilisateurs équipés** (node self-hosted, ou wallet dont le backend supporte `signMessage()`), pas un remplacement universel. Le flow QR LNURL-auth reste **la seule méthode garantie de fonctionner avec n'importe quel wallet Lightning**, custodial ou non — c'est pour ça qu'il reste affiché par défaut, avec WebLN en simple raccourci optionnel au-dessus (voir [LnAuthModal.vue](src/components/auth/LnAuthModal.vue)). Un message d'erreur clair invite à utiliser le QR quand WebLN échoue, plutôt que de laisser l'utilisateur bloqué.

### 5.3 Ce qu'on a construit avec ça : le Tip Jar

Le bouton "⚡ Tip" ([TipButton.vue](src/components/TipButton.vue)) fait quelque chose de très simple : il appelle `webln.lnurl(adresse)` sur une **Lightning Address** (`toi@getalby.com`). L'extension se charge de tout le protocole LNURL-pay en interne (demande du montant, récupération de l'invoice, paiement). Zéro backend nécessaire pour ça — c'est la puissance de combiner WebLN + Lightning Address.

### 5.4 Ce qu'on a construit avec ça : la connexion en un clic

C'est plus subtil, et ça mérite une section à part → [section 6](#6--deep-dive--la-signature-de-message-façon-lnd-zbase32).

### 5.5 Limite fondamentale de WebLN

WebLN **ne fonctionne que si l'utilisateur a une extension compatible installée** (Alby, etc.) — impossible sur mobile sans navigateur spécial. C'est pour ça qu'on l'a codé comme **option en plus** du QR LNURL-auth, jamais en remplacement : le QR reste la méthode universelle (n'importe quel wallet mobile), WebLN est juste un raccourci desktop.

---

## 6 · Deep dive : la signature de message façon LND (zbase32)

C'est la partie la plus "avancée" de ce projet, ajoutée pour permettre la **connexion WebLN en un clic** ([server/src/auth.js](server/src/auth.js), fonction `verifyWeblnSignature`). Comprendre pourquoi c'est nécessaire demande de bien saisir une distinction subtile.

### 6.1 Le problème : deux standards de signature différents

- **LNURL-auth** (section 4) attend une signature ECDSA "brute" (format DER) sur `k1`, produite par une `linkingKey` dérivée spécifiquement pour le domaine
- **WebLN `signMessage()`** (section 5) utilise en général le mécanisme de signature de message **de LND** (le logiciel de node Lightning le plus répandu, aussi utilisé en interne par beaucoup de wallets/extensions comme Alby)

Ce sont **deux protocoles différents**, avec des formats de signature différents. On ne peut pas réutiliser `verifyAuthorizationSignature` (fait pour LNURL-auth) pour vérifier une signature `webln.signMessage()`. Il a fallu implémenter la vérification "façon LND" nous-mêmes.

### 6.2 Comment LND signe un message

```
1. Préfixer le message :  "Lightning Signed Message:" + message
2. Double SHA-256 du résultat  →  digest (32 octets)
3. Signature ECDSA récupérable de ce digest avec la clé d'identité du node
   → 65 octets : [1 octet header][32 octets r][32 octets s]
4. Encodage du tout en zbase32 (voir 6.3) → chaîne de caractères lisible
```

Le "header" (premier octet) encode le `recovery id` (0 à 3) + un flag "clé compressée". C'est ce qui permet, à la vérification, de **retrouver la clé publique du signataire directement depuis la signature** (voir section 2.3) :

```js
// server/src/auth.js
const header = sigBytes[0]
const recid = header - 31          // on soustrait l'offset "compressé"
const signature = sigBytes.subarray(1)   // les 64 octets r||s

const digest = crypto.createHash('sha256')
  .update(crypto.createHash('sha256')
    .update(Buffer.concat([LN_SIGNED_MSG_PREFIX, Buffer.from(message)]))
    .digest())
  .digest()

const recovered = secp256k1.ecdsaRecover(signature, recid, digest, true)
// `recovered` EST l'identité de l'utilisateur — pas besoin que le client
// la fournisse séparément, ni de la comparer à quoi que ce soit.
```

**Pourquoi c'est suffisant de faire confiance au `recover`, sans comparer à une pubkey "annoncée" ?** Parce que seule la personne possédant la clé privée correspondante peut avoir produit une signature qui, une fois passée dans `ecdsaRecover`, redonne exactement cette clé publique. Il n'y a rien à falsifier : soit la signature recover vers une clé cohérente avec `digest`, soit `ecdsaRecover` renvoie une clé totalement différente/invalide. C'est exactement le même principe que le paramètre `key` de LNURL-auth (section 4.5) — sauf qu'ici on n'a même pas besoin que le client nous dise quelle est sa pubkey, on la déduit purement de la signature.

### 6.3 zbase32, c'est quoi ?

Le **Base32** classique encode des octets en caractères lisibles (comme le Base64, mais avec un alphabet réduit pour éviter les confusions genre `0`/`O` ou `1`/`l`). **zbase32** (inventé par Zooko Wilcox, d'où le nom) est une variante orientée "lisible et dictable à l'oral", utilisant l'alphabet :

```
ybndrfg8ejkmcpqxot1uwisza345h769
```

On l'a implémenté nous-mêmes dans [server/src/zbase32.js](server/src/zbase32.js) (une trentaine de lignes, aucune dépendance) car c'est un algorithme simple : chaque caractère encode 5 bits, on les concatène en un flux binaire, puis on regroupe par paquets de 8 bits (= 1 octet) :

```js
for (const char of str.toLowerCase()) {
  const idx = lookup[char]        // 0 à 31 (5 bits)
  value = (value << 5) | idx
  bits += 5
  if (bits >= 8) {
    bits -= 8
    bytes.push((value >> bits) & 0xff)   // on extrait un octet complet
  }
}
```

### 6.4 Le flow complet, de bout en bout

```
┌──────────┐                                          ┌──────────┐
│ Frontend │                                          │ Serveur  │
└────┬─────┘                                          └────┬─────┘
     │  GET /auth/challenge → { k1 }                        │
     │──────────────────────────────────────────────────────▶
     │◀─────────────────────────────────────────────────────│
     │                                                       │
     │  webln.enable()                                       │
     │  webln.signMessage(k1) → signature (zbase32)          │
     │                                                       │
     │  POST /auth/webln-callback { k1, signature }          │
     │──────────────────────────────────────────────────────▶
     │                     recoverWeblnPubkey(k1, signature) │
     │                     marque le challenge "résolu"       │
     │         { status: OK }                                │
     │◀─────────────────────────────────────────────────────│
     │                                                       │
     │  GET /auth/status?k1 → { status: ok, token }          │
     │──────────────────────────────────────────────────────▶
     │◀─────────────────────────────────────────────────────│
```

Astuce d'implémentation : on **réutilise exactement le même `challenges` Map et le même `k1`** que le flow QR classique (voir [LnAuthModal.vue](src/components/auth/LnAuthModal.vue), fonction `loginWithWebln`). Résultat : zéro duplication de la logique JWT/session, le WebLN callback se contente de résoudre le même challenge par un chemin différent (POST direct du navigateur, plutôt que GET du wallet).

---

## 7 · Vue d'ensemble du code de ce projet

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Vue 3)                                                  │
│                                                                    │
│  LnAuthModal.vue ──┬── QR LNURL-auth (scan wallet mobile)          │
│                     └── bouton WebLN (extension desktop)           │
│  TipButton.vue ──────── webln.lnurl(adresse) → don                 │
│                                                                    │
│  useWebln.js  : wrapper autour de window.webln                     │
│  stores/auth.js : startAuth() / pollStatus() / weblnCallback()      │
└──────────────────────────┬─────────────────────────────────────┘
                           │ fetch
┌──────────────────────────▼─────────────────────────────────────┐
│  Serveur Express                                                  │
│                                                                    │
│  auth.js : /auth/challenge, /auth/callback (LNURL classique),      │
│            /auth/webln-callback (nouveau, vérif zbase32/LND),      │
│            /auth/status (poll → JWT)                               │
│  zbase32.js : décodage des signatures WebLN                        │
└───────────────────────────────────────────────────────────────────┘
```

**À retenir** : les deux méthodes de connexion (QR et WebLN) convergent vers **le même `challenges` Map** et **le même JWT final** — seule la façon d'obtenir la signature diffère.

---

## 8 · Sécurité — pourquoi c'est safe (et où sont les limites)

### Ce qui est solide

- **Aucun mot de passe stocké** → aucun risque de fuite de mot de passe/hash
- **`k1` à usage unique** → une signature interceptée ne peut pas être rejouée
- **Les challenges expirent** (purge après 10 min, expiration UI à 5 min) → fenêtre d'attaque limitée
- **La clé privée ne quitte jamais le wallet**, ni pour LNURL-auth ni pour WebLN — seule une signature transite

### Les limites à connaître

- **Le Tip Jar (WebLN `lnurl()`) ne donne aucune confirmation serveur** — vu en détail dans la conversation qui a précédé ce guide : pour vendre un vrai service, il faut que le *serveur* génère l'invoice et vérifie le règlement, pas juste rediriger vers une adresse
- **`JWT_SECRET` doit être une vraie valeur aléatoire en production** — le `.env.example` contient un placeholder (`changez-ce-secret-en-production`), à ne jamais utiliser tel quel
- **Le décodage zbase32 fait confiance au format "LND"** — si un wallet WebLN utilise un format de signature différent (rare mais possible), la connexion WebLN échouera silencieusement ; c'est pour ça que le QR reste toujours disponible en fallback

---

## 9 · Glossaire

| Terme | Explication simple |
|---|---|
| **LApp** | Application qui intègre Lightning Network (auth et/ou paiement) |
| **Lightning Network** | Réseau de "canaux de paiement" au-dessus de Bitcoin, pour des transactions instantanées et quasi gratuites |
| **Wallet Lightning** | App qui gère tes clés privées Lightning (ex: Phoenix, Zeus, Alby) |
| **Clé privée / publique** | Paire cryptographique : la privée signe, la publique vérifie. Jamais la privée ne doit être partagée |
| **Signature ECDSA** | Preuve mathématique qu'un message a été "approuvé" par une clé privée, vérifiable avec la clé publique seule |
| **k1** | Le "défi" aléatoire généré par le serveur dans LNURL-auth, que le wallet doit signer |
| **linkingKey** | Clé dérivée spécifiquement pour un domaine, utilisée par LNURL-auth (différente de ta clé de wallet principale) |
| **JWT** | Jeton signé (JSON Web Token) utilisé comme "ticket de session" après connexion |
| **LNURL** | Famille de protocoles encodant une action Lightning (login, paiement...) dans une URL scannable en QR |
| **WebLN** | API JavaScript (`window.webln`) injectée par les extensions wallet, pour dialoguer directement avec le navigateur |
| **Lightning Address** | Adresse au format email (`toi@wallet.com`) qui résout automatiquement vers du LNURL-pay |
| **zbase32** | Variante de Base32 lisible, utilisée par LND pour encoder les signatures de message |
| **Signature récupérable** | Signature qui permet de retrouver la clé publique du signataire directement, sans qu'elle soit fournie à part |
| **BOLT11 / Invoice** | Une "facture" Lightning, à usage unique, contenant montant + destination + expiration |

---

## 10 · Pour aller plus loin

- [webln.guide](https://webln.guide) — spec WebLN complète (méthodes, exemples)
- [github.com/lnurl/luds](https://github.com/lnurl/luds) — toutes les spécifications LNURL (LUDs = LNURL Documents)
- [github.com/lightningnetwork/lnd](https://github.com/lightningnetwork/lnd) — implémentation de référence, utile pour comprendre `SignMessage`/`VerifyMessage`
- [Basics of Lightning Technology (BOLT specs)](https://github.com/lightning/bolts) — les specs bas niveau du protocole Lightning
- [jwt.io](https://jwt.io) — inspecter/comprendre un JWT

Ce guide se concentre sur ce qui est réellement implémenté dans ce repo. Pour la doc "produit" (comment lancer le projet, features, endpoints), voir [README.md](README.md).

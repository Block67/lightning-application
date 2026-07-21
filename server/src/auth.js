const crypto = require('crypto')
const lnurl = require('lnurl')
const qrcode = require('qrcode')
const jwt = require('jsonwebtoken')
const secp256k1 = require('secp256k1')
const { verifyAuthorizationSignature } = require('lnurl/lib')
const zbase32 = require('./zbase32')

// k1 -> { resolved, pubkey, createdAt }
const challenges = new Map()

// Vérifie une signature WebLN signMessage() au format LND
// (préfixe "Lightning Signed Message:", sig compacte 65 octets en zbase32).
const LN_SIGNED_MSG_PREFIX = Buffer.from('Lightning Signed Message:')

function verifyWeblnSignature(message, zbase32Sig, expectedPubkey) {
  const sigBytes = zbase32.decode(zbase32Sig)
  if (sigBytes.length !== 65) throw new Error('Signature WebLN invalide')

  const header = sigBytes[0]
  if (header < 31) throw new Error('Format de signature non supporté')
  const recid = header - 31
  const signature = sigBytes.subarray(1)

  const digest = crypto.createHash('sha256')
    .update(crypto.createHash('sha256')
      .update(Buffer.concat([LN_SIGNED_MSG_PREFIX, Buffer.from(message)]))
      .digest())
    .digest()

  const recovered = secp256k1.ecdsaRecover(signature, recid, digest, true)
  return Buffer.from(recovered).toString('hex') === expectedPubkey
}

// Purge les challenges de plus de 10 minutes
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [k1, data] of challenges) {
    if (data.createdAt < cutoff) challenges.delete(k1)
  }
}, 5 * 60 * 1000)

function setupAuth(app) {
  // 1. Frontend demande un challenge
  app.get('/auth/challenge', async (req, res) => {
    const k1 = crypto.randomBytes(32).toString('hex')
    challenges.set(k1, { resolved: false, pubkey: null, createdAt: Date.now() })

    const params = new URLSearchParams({ k1, tag: 'login' })
    const callbackUrl = `${process.env.SERVER_URL}/auth/callback?${params}`
    const encoded = lnurl.encode(callbackUrl).toUpperCase()
    const qrCode = await qrcode.toDataURL(encoded)

    res.json({ k1, lnurl: encoded, qrCode })
  })

  // 2. Le wallet Lightning appelle ce callback après avoir signé
  app.get('/auth/callback', (req, res) => {
    const { k1, sig, key } = req.query

    if (!k1 || !sig || !key) {
      return res.status(400).json({ status: 'ERROR', reason: 'Paramètres manquants' })
    }

    const challenge = challenges.get(k1)
    if (!challenge) {
      return res.status(400).json({ status: 'ERROR', reason: 'Challenge inconnu ou expiré' })
    }

    try {
      if (!verifyAuthorizationSignature(sig, k1, key)) {
        return res.status(400).json({ status: 'ERROR', reason: 'Signature invalide' })
      }
      challenges.set(k1, { resolved: true, pubkey: key, createdAt: challenge.createdAt })
      return res.json({ status: 'OK' })
    } catch (e) {
      return res.status(500).json({ status: 'ERROR', reason: e.message })
    }
  })

  // 2bis. Alternative sans QR : le navigateur signe k1 lui-même via
  // WebLN (extension type Alby) et poste directement la signature.
  app.post('/auth/webln-callback', (req, res) => {
    const { k1, signature, pubkey } = req.body

    if (!k1 || !signature || !pubkey) {
      return res.status(400).json({ status: 'ERROR', reason: 'Paramètres manquants' })
    }

    const challenge = challenges.get(k1)
    if (!challenge) {
      return res.status(400).json({ status: 'ERROR', reason: 'Challenge inconnu ou expiré' })
    }

    try {
      if (!verifyWeblnSignature(k1, signature, pubkey)) {
        return res.status(400).json({ status: 'ERROR', reason: 'Signature invalide' })
      }
      challenges.set(k1, { resolved: true, pubkey, createdAt: challenge.createdAt })
      return res.json({ status: 'OK' })
    } catch (e) {
      return res.status(400).json({ status: 'ERROR', reason: e.message })
    }
  })

  // 3. Frontend poll ce endpoint pour savoir si l'auth est complète
  app.get('/auth/status', (req, res) => {
    const { k1 } = req.query
    const challenge = challenges.get(k1)

    if (!challenge || !challenge.resolved) {
      return res.json({ status: 'pending' })
    }

    const token = jwt.sign(
      { pubkey: challenge.pubkey },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    )
    challenges.delete(k1)
    res.json({ status: 'ok', token })
  })

  // 4. Vérifier son propre token
  app.get('/auth/me', (req, res) => {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Non autorisé' })
    }
    try {
      const payload = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
      res.json({ pubkey: payload.pubkey })
    } catch {
      res.status(401).json({ error: 'Token invalide' })
    }
  })
}

module.exports = { setupAuth }

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { setupAuth } = require('./auth')
const { getXpubUtxos } = require('./utxo')

const app = express()

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé' })
  try {
    jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

setupAuth(app)

// UTXO — dérivation xpub/ypub/zpub + agrégation via mempool.space par adresse
app.get('/api/utxos/:xpub', requireAuth, async (req, res) => {
  try {
    const result = await getXpubUtxos(req.params.xpub)
    res.json(result)
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

app.get('/health', (_, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`\n⚡ Lightning App Auth Server`)
  console.log(`🔗 http://localhost:${PORT}`)
  console.log(`\n⚠️  Pour tester LNURL-auth en local:`)
  console.log(`   ngrok http ${PORT}`)
  console.log(`   Puis set SERVER_URL dans server/.env\n`)
})

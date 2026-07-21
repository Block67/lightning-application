// Mini-jeu pour classe/atelier : chaque personne se connecte via LNURL-auth
// (ou WebLN) puis marque 1 point pour son équipe. Un point par pubkey —
// pas un compteur de clics, l'objectif est de pratiquer la connexion Lightning.
const TEAMS = ['phoenix', 'zeus']

// pubkey -> team
const scores = new Map()

function setupGame(app, requireAuth) {
  app.get('/game/leaderboard', (req, res) => {
    const tally = { phoenix: 0, zeus: 0 }
    for (const team of scores.values()) tally[team]++
    res.json({ teams: tally, total: scores.size })
  })

  app.post('/game/score', requireAuth, (req, res) => {
    const { team } = req.body
    if (!TEAMS.includes(team)) {
      return res.status(400).json({ error: 'Équipe invalide' })
    }

    const pubkey = req.auth.pubkey
    if (scores.has(pubkey)) {
      return res.json({ ok: true, alreadyScored: true, team: scores.get(pubkey) })
    }

    scores.set(pubkey, team)
    res.json({ ok: true, alreadyScored: false, team })
  })

  // Remise à zéro entre deux sessions de classe — protégé par une clé
  // dédiée (GAME_RESET_KEY dans server/.env), désactivé si absente.
  app.post('/game/reset', (req, res) => {
    const key = req.headers['x-reset-key']
    if (!process.env.GAME_RESET_KEY || key !== process.env.GAME_RESET_KEY) {
      return res.status(401).json({ error: 'Non autorisé' })
    }
    scores.clear()
    res.json({ ok: true })
  })
}

module.exports = { setupGame }

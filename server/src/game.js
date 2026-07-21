// Mini-jeu pour classe/atelier : chaque personne se connecte via LNURL-auth
// (ou WebLN) puis marque 1 point pour son équipe. Un point par pubkey —
// pas un compteur de clics, l'objectif est de pratiquer la connexion Lightning.
// Persisté en SQLite (même fichier que le blog) — survit aux redémarrages,
// utile pour garder un classement entre plusieurs séances de classe.
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const TEAMS = ['phoenix', 'zeus']

const db = new DatabaseSync(path.join(__dirname, '../data.sqlite'))

db.exec(`
  CREATE TABLE IF NOT EXISTS game_scores (
    pubkey TEXT PRIMARY KEY,
    team TEXT NOT NULL,
    excluded INTEGER NOT NULL DEFAULT 0
  )
`)

const tallyStmt = db.prepare('SELECT team, COUNT(*) AS n FROM game_scores WHERE excluded = 0 GROUP BY team')
const getStmt = db.prepare('SELECT team, excluded FROM game_scores WHERE pubkey = ?')
const insertStmt = db.prepare('INSERT INTO game_scores (pubkey, team, excluded) VALUES (?, ?, 0)')
const excludeStmt = db.prepare('UPDATE game_scores SET excluded = 1 WHERE pubkey = ?')
const clearStmt = db.prepare('DELETE FROM game_scores')

function setupGame(app, requireAuth) {
  app.get('/game/leaderboard', (req, res) => {
    const tally = { phoenix: 0, zeus: 0 }
    for (const row of tallyStmt.all()) tally[row.team] = row.n
    const total = tally.phoenix + tally.zeus
    res.json({ teams: tally, total })
  })

  app.post('/game/score', requireAuth, (req, res) => {
    const { team } = req.body
    if (!TEAMS.includes(team)) {
      return res.status(400).json({ error: 'Équipe invalide' })
    }

    const pubkey = req.auth.pubkey
    const existing = getStmt.get(pubkey)

    if (!existing) {
      insertStmt.run(pubkey, team)
      return res.json({ ok: true, alreadyScored: false, team })
    }

    if (existing.excluded) {
      return res.status(403).json({ error: 'Tu as été exclu du jeu pour avoir tenté de marquer un point en double.' })
    }

    // Deuxième tentative pour la même pubkey = tentative de triche :
    // le point déjà marqué est retiré et la pubkey est exclue définitivement.
    excludeStmt.run(pubkey)
    return res.status(403).json({ error: 'Tentative de triche détectée — ton point a été retiré et tu es exclu du jeu.' })
  })

  // Remise à zéro entre deux sessions de classe — protégé par une clé
  // dédiée (GAME_RESET_KEY dans server/.env), désactivé si absente.
  app.post('/game/reset', (req, res) => {
    const key = req.headers['x-reset-key']
    if (!process.env.GAME_RESET_KEY || key !== process.env.GAME_RESET_KEY) {
      return res.status(401).json({ error: 'Non autorisé' })
    }
    clearStmt.run()
    res.json({ ok: true })
  })
}

module.exports = { setupGame }

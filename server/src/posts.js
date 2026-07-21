// Mur de publication : il faut être connecté (LNURL-auth/WebLN, même JWT
// que le reste de l'app) pour publier, tout le monde voit le fil en direct.
// CRUD REST classique, persisté dans SQLite (survit aux redémarrages du
// serveur — contrairement aux challenges LNURL-auth ou aux scores du jeu,
// volontairement éphémères en mémoire).
const path = require('path')
const { DatabaseSync } = require('node:sqlite')

const db = new DatabaseSync(path.join(__dirname, '../data.sqlite'))

db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pubkey TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`)

const listStmt = db.prepare('SELECT id, pubkey, message, created_at AS createdAt FROM posts ORDER BY id DESC')
const getStmt = db.prepare('SELECT id, pubkey, message, created_at AS createdAt FROM posts WHERE id = ?')
const insertStmt = db.prepare('INSERT INTO posts (pubkey, message, created_at) VALUES (?, ?, ?)')
const deleteStmt = db.prepare('DELETE FROM posts WHERE id = ?')
const pubkeyOfStmt = db.prepare('SELECT pubkey FROM posts WHERE id = ?')

function setupPosts(app, requireAuth) {
  // GET /posts — liste (200)
  app.get('/posts', (req, res) => {
    res.json({ posts: listStmt.all() })
  })

  // GET /posts/:id — ressource unique (200 / 404)
  app.get('/posts/:id', (req, res) => {
    const post = getStmt.get(Number(req.params.id))
    if (!post) return res.status(404).json({ error: 'Post introuvable' })
    res.json({ post })
  })

  // POST /posts — création (201 + Location)
  app.post('/posts', requireAuth, (req, res) => {
    const { message } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message vide' })
    }
    if (message.length > 280) {
      return res.status(400).json({ error: 'Message trop long (280 caractères max)' })
    }

    const trimmed = message.trim()
    const createdAt = Date.now()
    const { lastInsertRowid } = insertStmt.run(req.auth.pubkey, trimmed, createdAt)

    const post = { id: Number(lastInsertRowid), pubkey: req.auth.pubkey, message: trimmed, createdAt }
    res.status(201).location(`/posts/${post.id}`).json({ post })
  })

  // DELETE /posts/:id — suppression (204 / 404 / 403)
  // Pour l'instant, seul l'auteur peut supprimer son propre post.
  app.delete('/posts/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id)
    const existing = pubkeyOfStmt.get(id)
    if (!existing) return res.status(404).json({ error: 'Post introuvable' })

    if (existing.pubkey !== req.auth.pubkey) {
      return res.status(403).json({ error: 'Tu ne peux supprimer que tes propres posts' })
    }

    deleteStmt.run(id)
    res.status(204).end()
  })
}

module.exports = { setupPosts }

// Mur de publication simple : il faut être connecté (LNURL-auth/WebLN,
// même JWT que le reste de l'app) pour publier, tout le monde voit le fil
// en direct. CRUD REST classique — DELETE sert de base pour la mécanique
// de jeu (snipe payant) ajoutée plus tard.
const posts = []
let nextId = 1

function setupPosts(app, requireAuth) {
  // GET /posts — liste (200)
  app.get('/posts', (req, res) => {
    res.json({ posts: [...posts].reverse() })
  })

  // GET /posts/:id — ressource unique (200 / 404)
  app.get('/posts/:id', (req, res) => {
    const post = posts.find(p => p.id === Number(req.params.id))
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

    const post = {
      id: nextId++,
      pubkey: req.auth.pubkey,
      message: message.trim(),
      createdAt: Date.now()
    }
    posts.push(post)
    res.status(201).location(`/posts/${post.id}`).json({ post })
  })

  // DELETE /posts/:id — suppression (204 / 404 / 403)
  // Pour l'instant, seul l'auteur peut supprimer son propre post.
  app.delete('/posts/:id', requireAuth, (req, res) => {
    const index = posts.findIndex(p => p.id === Number(req.params.id))
    if (index === -1) return res.status(404).json({ error: 'Post introuvable' })

    if (posts[index].pubkey !== req.auth.pubkey) {
      return res.status(403).json({ error: 'Tu ne peux supprimer que tes propres posts' })
    }

    posts.splice(index, 1)
    res.status(204).end()
  })
}

module.exports = { setupPosts }

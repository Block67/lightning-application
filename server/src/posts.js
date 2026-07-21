// Mur de publication simple : il faut être connecté (LNURL-auth/WebLN,
// même JWT que le reste de l'app) pour publier, tout le monde voit le fil
// en direct. Base pour la mécanique de jeu (snipe/delete) ajoutée plus tard.
const posts = []
let nextId = 1

function setupPosts(app, requireAuth) {
  app.get('/posts', (req, res) => {
    res.json({ posts: [...posts].reverse() })
  })

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
    res.json({ post })
  })
}

module.exports = { setupPosts }

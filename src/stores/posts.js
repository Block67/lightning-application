import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

export const usePostsStore = defineStore('posts', () => {
  const posts = ref([])
  let timer = null

  async function fetchPosts() {
    const res = await fetch(`${SERVER}/posts`)
    const data = await res.json()
    posts.value = data.posts
  }

  async function publish(message) {
    const auth = useAuthStore()
    const res = await fetch(`${SERVER}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ message })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur serveur')
    await fetchPosts()
    return data.post
  }

  async function deletePost(id) {
    const auth = useAuthStore()
    const res = await fetch(`${SERVER}/posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auth.token}` }
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Erreur serveur')
    }
    await fetchPosts()
  }

  function startPolling() {
    fetchPosts()
    timer = setInterval(fetchPosts, 2000)
  }

  function stopPolling() {
    clearInterval(timer)
  }

  return { posts, fetchPosts, publish, deletePost, startPolling, stopPolling }
})

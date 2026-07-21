import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('sb_token'))
  const pubkey = ref(null)

  // Decode pubkey from stored JWT on init
  if (token.value) {
    try {
      const payload = JSON.parse(atob(token.value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        token.value = null
        localStorage.removeItem('sb_token')
      } else {
        pubkey.value = payload.pubkey
      }
    } catch {
      token.value = null
      localStorage.removeItem('sb_token')
    }
  }

  const isAuthenticated = computed(() => !!token.value)
  const shortPubkey = computed(() =>
    pubkey.value ? pubkey.value.slice(0, 8) + '…' + pubkey.value.slice(-6) : null
  )

  async function startAuth() {
    const res = await fetch(`${SERVER}/auth/challenge`)
    if (!res.ok) throw new Error('Serveur inaccessible')
    return res.json() // { k1, lnurl, qrCode }
  }

  async function pollStatus(k1) {
    const res = await fetch(`${SERVER}/auth/status?k1=${k1}`)
    const data = await res.json()
    if (data.status === 'ok') {
      token.value = data.token
      localStorage.setItem('sb_token', data.token)
      const payload = JSON.parse(atob(data.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      pubkey.value = payload.pubkey
    }
    return data.status
  }

  async function weblnCallback(k1, signature, pubkey) {
    const res = await fetch(`${SERVER}/auth/webln-callback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ k1, signature, pubkey })
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.reason || 'Signature refusée par le serveur')
    }
  }

  function logout() {
    token.value = null
    pubkey.value = null
    localStorage.removeItem('sb_token')
  }

  return { token, pubkey, isAuthenticated, shortPubkey, startAuth, pollStatus, weblnCallback, logout }
})

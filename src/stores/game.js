import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth'

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

export const TEAMS = [
  { id: 'phoenix', name: 'Team Phoenix', emoji: '🐦', color: '#f7931a' },
  { id: 'zeus',    name: 'Team Zeus',    emoji: '⚡', color: '#7c3aed' },
]

export const useGameStore = defineStore('game', () => {
  const scores = ref({ phoenix: 0, zeus: 0 })
  const total = ref(0)
  const myTeam = ref(null)
  let timer = null

  async function fetchLeaderboard() {
    const res = await fetch(`${SERVER}/game/leaderboard`)
    const data = await res.json()
    scores.value = data.teams
    total.value = data.total
  }

  async function scoreForTeam(team) {
    const auth = useAuthStore()
    const res = await fetch(`${SERVER}/game/score`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ team })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erreur serveur')
    myTeam.value = data.team
    await fetchLeaderboard()
    return data
  }

  function startPolling() {
    fetchLeaderboard()
    timer = setInterval(fetchLeaderboard, 2000)
  }

  function stopPolling() {
    clearInterval(timer)
  }

  return { scores, total, myTeam, fetchLeaderboard, scoreForTeam, startPolling, stopPolling }
})

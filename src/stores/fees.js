import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useFeesStore = defineStore('fees', () => {
  const fees = ref(null)      // { fastestFee, halfHourFee, hourFee, economyFee, minimumFee }
  const history = ref([])     // weekly fee rate blocks
  const loading = ref(false)
  const lastUpdated = ref(null)
  let _timer = null

  const level = computed(() => {
    if (!fees.value) return null
    const f = fees.value.fastestFee
    if (f <= 5)  return 'low'
    if (f <= 25) return 'medium'
    return 'high'
  })

  const levelColor = computed(() => {
    const map = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--red)' }
    return level.value ? map[level.value] : 'var(--muted)'
  })

  async function fetchFees() {
    loading.value = true
    try {
      const res = await fetch('https://mempool.space/api/v1/fees/recommended')
      fees.value = await res.json()
      lastUpdated.value = new Date()
    } finally {
      loading.value = false
    }
  }

  async function fetchHistory() {
    try {
      const res = await fetch('https://mempool.space/api/v1/mining/blocks/fee-rates/1w')
      history.value = await res.json()
    } catch {}
  }

  function startPolling() {
    fetchFees()
    fetchHistory()
    _timer = setInterval(fetchFees, 30_000)
  }

  function stopPolling() {
    clearInterval(_timer)
  }

  return { fees, history, loading, lastUpdated, level, levelColor, fetchFees, fetchHistory, startPolling, stopPolling }
})

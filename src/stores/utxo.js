import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDb } from '@/composables/useDb'
import { useFeesStore } from './fees'

export const useUtxoStore = defineStore('utxo', () => {
  const utxos    = ref([])
  const stats    = ref(null)
  const loading  = ref(false)
  const error    = ref(null)

  const totalSats  = computed(() => utxos.value.reduce((s, u) => s + u.value, 0))
  const utxoCount  = computed(() => utxos.value.length)
  const sortedDesc = computed(() => [...utxos.value].sort((a, b) => b.value - a.value))

  const consolidation = computed(() => {
    const feesStore = useFeesStore()
    if (!feesStore.fees || utxos.value.length < 2) return null
    const n = utxos.value.length
    const vsize = 10 + n * 68 + 31
    const feeRate = feesStore.fees.hourFee
    const cost = vsize * feeRate
    const saving = vsize * (feeRate - feesStore.fees.minimumFee)
    return { cost, feeRate, vsize, saving, worthIt: feeRate <= 5 }
  })

  async function fetchUtxos(xpub, pubkey) {
    loading.value = true
    error.value   = null
    try {
      const token = localStorage.getItem('sb_token')
      const res = await fetch(`/api/utxos/${encodeURIComponent(xpub)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur serveur')

      utxos.value = data.utxos
      stats.value = data.stats

      const { saveSettings } = useDb()
      await saveSettings(pubkey, { xpub })
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  function clear() {
    utxos.value = []
    stats.value = null
    error.value = null
  }

  return { utxos, stats, loading, error, totalSats, utxoCount, sortedDesc, consolidation, fetchUtxos, clear }
})

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDb } from '@/composables/useDb'

export const useStackStore = defineStore('stack', () => {
  const purchases    = ref([])   // { id, date, sats, eurSpent, priceAtBuy }
  const currentPrice = ref(null) // EUR
  const loading      = ref(false)

  const totalSats     = computed(() => purchases.value.reduce((s, p) => s + p.sats, 0))
  const totalEurSpent = computed(() => purchases.value.reduce((s, p) => s + p.eurSpent, 0))

  const avgBuyPrice = computed(() => {
    const btc = totalSats.value / 1e8
    return btc > 0 ? totalEurSpent.value / btc : 0
  })

  const currentValue = computed(() =>
    currentPrice.value ? (totalSats.value / 1e8) * currentPrice.value : null
  )

  const pnl = computed(() =>
    currentValue.value !== null ? currentValue.value - totalEurSpent.value : null
  )

  const pnlPct = computed(() =>
    pnl.value !== null && totalEurSpent.value > 0 ? (pnl.value / totalEurSpent.value) * 100 : null
  )

  // Courbe d'accumulation pour le graphe SVG
  const curve = computed(() => {
    let acc = 0
    return purchases.value
      .slice()
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(p => { acc += p.sats; return { date: p.date, sats: acc } })
  })

  async function load(pubkey) {
    loading.value = true
    const { getPurchases } = useDb()
    purchases.value = await getPurchases(pubkey)
    loading.value = false
  }

  async function add(pubkey, purchase) {
    const { addPurchase, getPurchases } = useDb()
    await addPurchase(pubkey, purchase)
    purchases.value = await getPurchases(pubkey)
  }

  async function remove(id, pubkey) {
    const { deletePurchase, getPurchases } = useDb()
    await deletePurchase(id)
    purchases.value = await getPurchases(pubkey)
  }

  async function fetchPrice() {
    try {
      const res = await fetch('https://mempool.space/api/v1/prices')
      const data = await res.json()
      currentPrice.value = data.EUR
    } catch {}
  }

  return {
    purchases, currentPrice, loading,
    totalSats, totalEurSpent, avgBuyPrice, currentValue, pnl, pnlPct, curve,
    load, add, remove, fetchPrice
  }
})

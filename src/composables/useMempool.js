const BASE = 'https://mempool.space/api'

export function formatSats(sats) {
  if (sats >= 1_000_000) return (sats / 1_000_000).toFixed(2) + 'M'
  if (sats >= 1_000)     return (sats / 1_000).toFixed(1) + 'k'
  return sats.toString()
}

export function formatBtc(sats) {
  return (sats / 1e8).toFixed(8).replace(/\.?0+$/, '') + ' BTC'
}

export function formatEur(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount)
}

export async function getRecommendedFees() {
  const res = await fetch(`${BASE}/v1/fees/recommended`)
  return res.json()
}

export async function getFeeHistory() {
  const res = await fetch(`${BASE}/v1/mining/blocks/fee-rates/1w`)
  return res.json()
}

export async function getXpubUtxos(xpub) {
  const res = await fetch(`${BASE}/xpub/${xpub}/utxo`)
  if (!res.ok) throw new Error('xpub invalide')
  return res.json()
}

export async function getXpubStats(xpub) {
  const res = await fetch(`${BASE}/xpub/${xpub}`)
  if (!res.ok) throw new Error('xpub invalide')
  return res.json()
}

export async function getCurrentPrice() {
  const res = await fetch(`${BASE}/v1/prices`)
  return res.json() // { USD, EUR, GBP, ... }
}

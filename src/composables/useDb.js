import Dexie from 'dexie'

const db = new Dexie('SatsBoard')

db.version(1).stores({
  purchases: '++id, pubkey, date',   // achats DCA indexés par utilisateur
  settings:  'pubkey'                // xpub et préférences par utilisateur
})

export function useDb() {
  async function addPurchase(pubkey, { date, sats, eurSpent, priceAtBuy }) {
    return db.purchases.add({ pubkey, date, sats, eurSpent, priceAtBuy })
  }

  async function getPurchases(pubkey) {
    return db.purchases.where('pubkey').equals(pubkey).sortBy('date')
  }

  async function deletePurchase(id) {
    return db.purchases.delete(id)
  }

  async function saveSettings(pubkey, data) {
    const existing = await db.settings.get(pubkey)
    return db.settings.put({ ...(existing || {}), pubkey, ...data })
  }

  async function getSettings(pubkey) {
    return db.settings.get(pubkey)
  }

  return { addPurchase, getPurchases, deletePurchase, saveSettings, getSettings }
}

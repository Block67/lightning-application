import Dexie from 'dexie'

const db = new Dexie('SatsBoard')

db.version(1).stores({
  purchases: '++id, pubkey, date',   // achats DCA indexés par utilisateur
  settings:  'pubkey'                // xpub et préférences par utilisateur
})

// Feature DCA/Stack retirée — on supprime proprement la table côté client.
db.version(2).stores({
  purchases: null,
  settings:  'pubkey'
})

export function useDb() {
  async function saveSettings(pubkey, data) {
    const existing = await db.settings.get(pubkey)
    return db.settings.put({ ...(existing || {}), pubkey, ...data })
  }

  async function getSettings(pubkey) {
    return db.settings.get(pubkey)
  }

  return { saveSettings, getSettings }
}

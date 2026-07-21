import { ref } from 'vue'

// WebLN (window.webln) est injecté par les extensions de wallet Lightning
// comme Alby. Spec : https://www.webln.guide/
export function useWebln() {
  const sending = ref(false)
  const error = ref(null)

  function isAvailable() {
    return typeof window !== 'undefined' && !!window.webln
  }

  async function tip(lightningAddress) {
    error.value = null

    if (!isAvailable()) {
      error.value = 'no-extension'
      return false
    }

    sending.value = true
    try {
      await window.webln.enable()
      // lnurl() résout le flow LNURL-pay complet (montant demandé
      // dans l'UI du wallet) à partir d'une Lightning Address.
      await window.webln.lnurl(lightningAddress)
      return true
    } catch (e) {
      // L'utilisateur a annulé dans son wallet, ou le provider ne
      // supporte pas lnurl() — pas une vraie erreur applicative.
      error.value = e.message || 'cancelled'
      return false
    } finally {
      sending.value = false
    }
  }

  // Connexion en un clic : le wallet signe le challenge k1 lui-même,
  // pas besoin de scanner un QR (alternative à LNURL-auth).
  async function login(k1) {
    error.value = null

    if (!isAvailable()) {
      error.value = 'no-extension'
      return null
    }

    try {
      await window.webln.enable()
      // La pubkey n'est pas demandée via getInfo() (indisponible sur les
      // comptes hébergés type Alby custodial) — elle est retrouvée par
      // le serveur directement depuis la signature récupérable.
      const { signature } = await window.webln.signMessage(k1)
      return { signature }
    } catch (e) {
      error.value = e.message || 'cancelled'
      return null
    }
  }

  return { sending, error, isAvailable, tip, login }
}

<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal">
        <button class="modal-close" @click="$emit('close')">✕</button>

        <div class="modal-header">
          <span class="ln-icon">⚡</span>
          <h2>Connexion Lightning</h2>
          <p>Scanne le QR avec ton wallet Lightning</p>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="loading-center" style="padding:40px">
          <div class="spinner"></div>
        </div>

        <!-- Erreur serveur -->
        <div v-else-if="serverError" class="error-state">
          <p>{{ serverError }}</p>
          <p class="hint">Le serveur auth est-il démarré ?<br><code>npm run dev:server</code></p>
          <button class="btn btn-ghost" style="margin-top:4px" @click="init">Réessayer</button>
        </div>

        <!-- Expiré -->
        <div v-else-if="expired" class="error-state">
          <p>QR code expiré (5 min)</p>
          <button class="btn btn-primary" @click="init">Nouveau QR</button>
        </div>

        <!-- QR Code prêt -->
        <div v-else-if="challenge" class="qr-section">
          <template v-if="webln.isAvailable()">
            <button class="btn btn-primary" style="width:100%" @click="loginWithWebln" :disabled="weblnLoading">
              ⚡ {{ weblnLoading ? 'Connexion…' : "Connecter avec l'extension" }}
            </button>
            <p v-if="weblnError" class="hint" style="color:#dc2626">{{ weblnError }}</p>
            <div class="or-divider">ou scanne le QR</div>
          </template>

          <img :src="challenge.qrCode" alt="LNURL QR Code" class="qr-img" />

          <button class="lnurl-copy" @click="copyLnurl" :title="copied ? 'Copié !' : 'Copier LNURL'">
            <span class="lnurl-text">{{ shortLnurl }}</span>
            <span>{{ copied ? '✓' : '📋' }}</span>
          </button>

          <div class="polling-status">
            <div class="dot pulse"></div>
            <span>En attente de signature wallet…</span>
          </div>
        </div>

        <div class="wallets-hint">
          Compatible : Phoenix · Breez · Zeus · Alby · Blink
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebln } from '@/composables/useWebln'

const emit = defineEmits(['close', 'success'])

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const webln = useWebln()

const loading = ref(true)
const expired = ref(false)
const serverError = ref(null)
const copied = ref(false)
const challenge = ref(null)
const weblnLoading = ref(false)
const weblnError = ref(null)

let pollInterval = null
let expiryTimer = null

const shortLnurl = computed(() =>
  challenge.value ? challenge.value.lnurl.slice(0, 28) + '…' : ''
)

async function init() {
  loading.value = true
  expired.value = false
  serverError.value = null
  clearInterval(pollInterval)
  clearTimeout(expiryTimer)

  try {
    challenge.value = await auth.startAuth()
    loading.value = false

    pollInterval = setInterval(async () => {
      const status = await auth.pollStatus(challenge.value.k1)
      if (status === 'ok') {
        clearInterval(pollInterval)
        emit('success')
        emit('close')
        const redirect = route.query.redirect || '/dashboard'
        router.push(redirect)
      }
    }, 2000)

    expiryTimer = setTimeout(() => {
      clearInterval(pollInterval)
      expired.value = true
    }, 5 * 60 * 1000)

  } catch (e) {
    serverError.value = e.message
    loading.value = false
  }
}

function friendlyWeblnError(message) {
  if (!message) return 'Connexion annulée ou refusée par le wallet.'
  if (/signmessage.*not supported/i.test(message)) {
    return 'Ce compte ne supporte pas la connexion en un clic (compte Alby hébergé). Utilise le QR code ci-dessous.'
  }
  if (/rejected|denied|cancelled/i.test(message)) {
    return 'Connexion refusée dans le wallet.'
  }
  return message
}

async function loginWithWebln() {
  if (!challenge.value) return
  weblnError.value = null
  weblnLoading.value = true

  try {
    const result = await webln.login(challenge.value.k1)
    if (!result) {
      if (webln.error.value !== 'no-extension') {
        weblnError.value = friendlyWeblnError(webln.error.value)
      }
      return
    }

    await auth.weblnCallback(challenge.value.k1, result.signature)
    const status = await auth.pollStatus(challenge.value.k1)

    if (status === 'ok') {
      clearInterval(pollInterval)
      clearTimeout(expiryTimer)
      emit('success')
      emit('close')
      const redirect = route.query.redirect || '/dashboard'
      router.push(redirect)
    }
  } catch (e) {
    weblnError.value = e.message
  } finally {
    weblnLoading.value = false
  }
}

async function copyLnurl() {
  if (!challenge.value) return
  await navigator.clipboard.writeText(challenge.value.lnurl)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

onMounted(init)
onBeforeUnmount(() => {
  clearInterval(pollInterval)
  clearTimeout(expiryTimer)
})
</script>

<style scoped>
.modal-header {
  text-align: center;
  margin-bottom: 24px;
}

.ln-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 8px;
}

.modal-header h2 {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.modal-header p {
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
}

.qr-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-img {
  width: 220px;
  height: 220px;
  border: 3px solid var(--border);
  box-shadow: var(--shadow);
  display: block;
}

.lnurl-copy {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 8px 14px;
  font-size: 13px;
  font-family: var(--font);
  font-weight: 700;
  color: var(--muted);
  cursor: pointer;
  width: 100%;
  justify-content: space-between;
  transition: all 0.08s;
}

.lnurl-copy:hover {
  color: var(--black);
  box-shadow: var(--shadow-sm);
  transform: translate(-1px, -1px);
}

.lnurl-text {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.polling-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  font-weight: 600;
}

.dot {
  width: 8px;
  height: 8px;
  background: var(--orange);
  border-radius: 50%;
}

.error-state {
  text-align: center;
  padding: 24px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.error-state p { color: var(--muted); font-size: 14px; font-weight: 600; }
.hint { font-size: 12px !important; }

.or-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
}
.or-divider::before,
.or-divider::after {
  content: '';
  flex: 1;
  height: 2px;
  background: var(--border);
}

.wallets-hint {
  margin-top: 20px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--muted);
  padding-top: 16px;
  border-top: 2px solid #e5e7eb;
}
</style>

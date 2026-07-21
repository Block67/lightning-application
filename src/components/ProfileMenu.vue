<template>
  <div class="profile-wrap">
    <button class="profile-trigger" @click="open = !open">
      ⚡ {{ auth.shortPubkey }}
    </button>

    <div v-if="open" class="profile-panel">
      <div class="profile-pubkey-row">
        <span class="profile-pubkey">{{ auth.pubkey }}</span>
        <button class="btn btn-ghost btn-sm" :title="copied ? 'Copié !' : 'Copier'" @click="copyPubkey">
          {{ copied ? '✓' : '📋' }}
        </button>
      </div>

      <button class="profile-item" @click="toggleLang">
        {{ locale === 'fr' ? '🇫🇷 Français' : '🇬🇧 English' }}
      </button>

      <button class="profile-item profile-logout" @click="logout">
        🚪 {{ t('nav.disconnect') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const open = ref(false)
const copied = ref(false)

function toggleLang() {
  locale.value = locale.value === 'fr' ? 'en' : 'fr'
  localStorage.setItem('sb_lang', locale.value)
}

async function copyPubkey() {
  await navigator.clipboard.writeText(auth.pubkey)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

function logout() {
  auth.logout()
  open.value = false
  router.push('/')
}
</script>

<style scoped>
.profile-wrap { position: relative; }

.profile-trigger {
  font-family: var(--font);
  font-size: 12px;
  font-weight: 700;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.08s;
  white-space: nowrap;
}
.profile-trigger:hover { background: var(--white); box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }

.profile-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  background: var(--white);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  width: 260px;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 6px;
}

.profile-pubkey-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 8px 10px;
  margin-bottom: 4px;
}

.profile-pubkey {
  flex: 1;
  font-family: monospace;
  font-size: 11px;
  word-break: break-all;
}

.profile-item {
  font-family: var(--font);
  font-size: 13px;
  font-weight: 700;
  text-align: left;
  background: var(--white);
  border: 2px solid var(--border);
  padding: 9px 12px;
  cursor: pointer;
  transition: all 0.08s;
}
.profile-item:hover { background: var(--alt); }

.profile-logout { color: #dc2626; }
</style>

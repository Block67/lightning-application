<template>
  <div class="app-shell">

    <header class="topnav">
      <RouterLink to="/" class="brand">
        <span class="brand-mark">₿</span>
        Lightning App
      </RouterLink>

      <nav class="nav-links">
        <RouterLink to="/fees">⚡ {{ t('nav.fees') }}</RouterLink>
        <RouterLink to="/utxos"     v-if="auth.isAuthenticated">🔗 {{ t('nav.utxos') }}</RouterLink>
        <RouterLink to="/stack"     v-if="auth.isAuthenticated">📈 {{ t('nav.stack') }}</RouterLink>
        <RouterLink to="/dashboard" v-if="auth.isAuthenticated">🏠 {{ t('nav.dashboard') }}</RouterLink>
      </nav>

      <div class="nav-right">
        <TipButton />
        <button class="lang-toggle" @click="toggleLang" :title="locale === 'fr' ? 'Switch to English' : 'Passer en Français'">
          {{ locale === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN' }}
        </button>
        <template v-if="auth.isAuthenticated">
          <span class="pubkey-tag">⚡ {{ auth.shortPubkey }}</span>
          <button class="btn btn-ghost btn-sm" @click="handleLogout">{{ t('nav.disconnect') }}</button>
        </template>
        <template v-else>
          <button class="btn btn-primary btn-sm" @click="showAuth = true">
            ⚡ {{ t('nav.connect') }}
          </button>
        </template>
      </div>

      <button class="hamburger" @click="mobileOpen = !mobileOpen" aria-label="Menu">
        <svg v-if="!mobileOpen" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </header>

    <!-- Mobile nav -->
    <div class="mobile-nav" :class="{ open: mobileOpen }">
      <RouterLink to="/fees"      @click="mobileOpen = false">⚡ {{ t('nav.fees') }}</RouterLink>
      <RouterLink to="/utxos"     @click="mobileOpen = false" v-if="auth.isAuthenticated">🔗 {{ t('nav.utxos') }}</RouterLink>
      <RouterLink to="/stack"     @click="mobileOpen = false" v-if="auth.isAuthenticated">📈 {{ t('nav.stack') }}</RouterLink>
      <RouterLink to="/dashboard" @click="mobileOpen = false" v-if="auth.isAuthenticated">🏠 {{ t('nav.dashboard') }}</RouterLink>
      <div class="mobile-actions">
        <TipButton />
        <button class="lang-toggle" @click="toggleLang" style="width:100%; justify-content:center">
          {{ locale === 'fr' ? '🇫🇷 Français' : '🇬🇧 English' }}
        </button>
        <template v-if="auth.isAuthenticated">
          <span class="pubkey-tag" style="font-size:11px">⚡ {{ auth.shortPubkey }}</span>
          <button class="btn btn-ghost btn-sm" @click="handleLogout">{{ t('nav.disconnect') }}</button>
        </template>
        <template v-else>
          <button class="btn btn-primary" style="width:100%" @click="showAuth = true; mobileOpen = false">
            ⚡ {{ t('nav.connect') }}
          </button>
        </template>
      </div>
    </div>

    <main class="main-content">
      <slot />
    </main>

    <LnAuthModal v-if="showAuth" @close="showAuth = false" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LnAuthModal from '@/components/auth/LnAuthModal.vue'
import TipButton from '@/components/TipButton.vue'

const { t, locale } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const showAuth = ref(false)
const mobileOpen = ref(false)

function toggleLang() {
  locale.value = locale.value === 'fr' ? 'en' : 'fr'
  localStorage.setItem('sb_lang', locale.value)
}

function handleLogout() {
  auth.logout()
  router.push('/')
  mobileOpen.value = false
}
</script>

<style scoped>
.app-shell { display: flex; flex-direction: column; min-height: 100vh; }

/* ── Topnav ── */
.topnav {
  background: var(--white);
  border-bottom: 3px solid var(--border);
  height: 60px;
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.brand {
  font-size: 16px;
  font-weight: 900;
  letter-spacing: -0.02em;
  color: var(--black);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.brand-mark {
  width: 28px; height: 28px;
  background: var(--orange);
  border: 2px solid var(--border);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 900; color: var(--black);
  flex-shrink: 0;
}

/* ── Nav links ── */
.nav-links { display: flex; align-items: center; gap: 2px; flex: 1; }

.nav-links a {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  padding: 7px 12px;
  border: 2px solid transparent;
  transition: all 0.08s;
  white-space: nowrap;
}

.nav-links a:hover { color: var(--black); background: var(--alt); border-color: var(--border); }

.nav-links a.router-link-active {
  color: var(--black);
  background: #eef1ff;
  border-color: var(--orange);
  box-shadow: 2px 2px 0 var(--orange);
}

/* ── Nav right ── */
.nav-right { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-shrink: 0; }

.lang-toggle {
  font-size: 12px;
  font-family: var(--font);
  font-weight: 700;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 5px 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.08s;
  white-space: nowrap;
}
.lang-toggle:hover { background: var(--white); box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }

.pubkey-tag {
  font-size: 11px;
  font-family: monospace;
  font-weight: 700;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 4px 10px;
  color: var(--black);
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Hamburger ── */
.hamburger {
  display: none;
  align-items: center; justify-content: center;
  width: 38px; height: 38px;
  background: var(--white);
  border: 2px solid var(--border);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.08s;
  margin-left: auto;
  flex-shrink: 0;
}
.hamburger:hover { transform: translate(1px,1px); box-shadow: 0 0 0 #000; }

/* ── Mobile nav ── */
.mobile-nav {
  display: none;
  flex-direction: column;
  background: var(--white);
  border-bottom: 3px solid var(--border);
  position: sticky;
  top: 60px;
  z-index: 40;
}

.mobile-nav.open { display: flex; }

.mobile-nav a {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--black);
  padding: 16px 20px;
  border-bottom: 1.5px solid #f0f0f0;
  transition: background 0.08s;
}

.mobile-nav a:hover { background: var(--alt); }
.mobile-nav a.router-link-active { background: #eef1ff; border-left: 3px solid var(--orange); }

.mobile-actions {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 2px solid var(--border);
}

.main-content { flex: 1; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .topnav { padding: 0 16px; gap: 12px; }
  .nav-links { display: none; }
  .nav-right { display: none; }
  .hamburger { display: inline-flex; }
}
</style>

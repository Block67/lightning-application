<template>
  <div class="tip-wrap">
    <button class="btn btn-ghost btn-sm tip-btn" @click="onClick" :disabled="webln.sending.value">
      ⚡ {{ webln.sending.value ? t('tip.sending') : t('tip.cta') }}
    </button>

    <div v-if="fallback" class="tip-fallback">
      <p>{{ t('tip.no_extension') }}</p>
      <a class="lnurl-copy" :href="`lightning:${address}`">
        <span class="lnurl-text">{{ address }}</span>
      </a>
      <button class="btn btn-ghost btn-sm" @click="copyAddress">
        {{ copied ? t('tip.copied') : t('tip.copy') }}
      </button>
    </div>

    <p v-if="success" class="tip-success">{{ t('tip.success') }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWebln } from '@/composables/useWebln'

const { t } = useI18n()
const webln = useWebln()

const address = import.meta.env.VITE_TIP_LIGHTNING_ADDRESS
const fallback = ref(false)
const success = ref(false)
const copied = ref(false)

async function onClick() {
  fallback.value = false
  success.value = false

  if (!address) return

  if (!webln.isAvailable()) {
    fallback.value = true
    return
  }

  const ok = await webln.tip(address)
  if (ok) {
    success.value = true
    setTimeout(() => { success.value = false }, 4000)
  } else if (webln.error.value === 'no-extension') {
    fallback.value = true
  }
}

async function copyAddress() {
  await navigator.clipboard.writeText(address)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.tip-wrap { position: relative; display: inline-flex; flex-direction: column; align-items: flex-start; }

.tip-fallback {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 60;
  background: var(--white);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  padding: 12px;
  width: 220px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip-fallback p { font-size: 12px; font-weight: 600; color: var(--muted); }

.lnurl-copy {
  display: block;
  background: var(--alt);
  border: 2px solid var(--border);
  padding: 8px 10px;
  font-size: 12px;
}

.lnurl-text {
  font-family: monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.tip-success {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--orange);
}
</style>

<template>
  <div class="xpub-form">
    <div class="form-group" style="margin-bottom:8px">
      <label>Xpub / Zpub / Ypub</label>
      <div class="input-row">
        <input
          v-model="xpubInput"
          type="text"
          placeholder="xpub6… ou zpub1…"
          :disabled="loading"
          @keyup.enter="submit"
          style="font-family:monospace; font-size:13px"
        />
        <button class="btn btn-primary" :disabled="!xpubInput.trim() || loading" @click="submit">
          <span v-if="loading" class="spinner-sm"></span>
          <span v-else>Analyser</span>
        </button>
      </div>
    </div>
    <p v-if="error" class="form-error">⚠ {{ error }}</p>
    <p class="form-hint">Ton xpub n'est jamais envoyé à notre serveur — la requête va directement vers mempool.space.</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUtxoStore } from '@/stores/utxo'
import { useAuthStore } from '@/stores/auth'
import { useDb } from '@/composables/useDb'

const utxo = useUtxoStore()
const auth = useAuthStore()
const xpubInput = ref('')

const loading = computed(() => utxo.loading)
const error = computed(() => utxo.error)

async function submit() {
  const val = xpubInput.value.trim()
  if (!val) return
  await utxo.fetchUtxos(val, auth.pubkey)
}

onMounted(async () => {
  const { getSettings } = useDb()
  const settings = await getSettings(auth.pubkey)
  if (settings?.xpub) xpubInput.value = settings.xpub
})
</script>

<style scoped>
.xpub-form { display: flex; flex-direction: column; gap: 4px; }

.input-row { display: flex; gap: 8px; }
.input-row input { flex: 1; }

.spinner-sm {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>

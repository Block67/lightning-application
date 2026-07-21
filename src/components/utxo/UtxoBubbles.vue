<template>
  <div class="bubbles-container">
    <div v-if="!utxos.length" class="empty-state">
      <div class="icon">🔗</div>
      <p>Aucun UTXO à afficher</p>
    </div>
    <div v-else class="bubbles-grid">
      <div
        v-for="u in sorted"
        :key="u.txid + u.vout"
        class="bubble"
        :style="bubbleStyle(u)"
        :title="`${u.value.toLocaleString()} sats\nTxid: ${u.txid.slice(0,16)}…\nConfirmations: ${u.status?.block_height ? 'confirmé' : 'non confirmé'}`"
      >
        <span class="bubble-label">{{ formatSats(u.value) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUtxoStore } from '@/stores/utxo'
import { formatSats } from '@/composables/useMempool'

const utxo = useUtxoStore()
const sorted = computed(() => utxo.sortedDesc)

const maxVal = computed(() => sorted.value[0]?.value || 1)
const minVal = computed(() => sorted.value[sorted.value.length - 1]?.value || 1)

function bubbleSize(value) {
  const ratio = Math.sqrt(value / maxVal.value)
  return Math.round(40 + ratio * 100) // 40px à 140px
}

function bubbleStyle(u) {
  const size = bubbleSize(u.value)
  const ratio = (u.value - minVal.value) / (maxVal.value - minVal.value || 1)
  // Plus grand = plus orange, plus petit = plus gris
  const lightness = Math.round(30 + ratio * 25)
  const saturation = Math.round(40 + ratio * 60)
  const confirmed = u.status?.confirmed

  return {
    width:  size + 'px',
    height: size + 'px',
    background: `hsl(33, ${saturation}%, ${lightness}%)`,
    fontSize: Math.max(9, Math.round(size / 6)) + 'px',
    opacity: confirmed === false ? 0.5 : 1,
    border: confirmed === false ? '2px dashed #d97706' : 'none',
  }
}
</script>

<style scoped>
.bubbles-container { width: 100%; }

.bubbles-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  padding: 8px 0;
}

.bubble {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: transform .15s;
  flex-shrink: 0;
}

.bubble:hover { transform: scale(1.08); }

.bubble-label {
  color: rgba(0,0,0,.8);
  font-weight: 700;
  text-align: center;
  line-height: 1.2;
}
</style>

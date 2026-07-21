<template>
  <div v-if="consolidation" class="tip-card" :class="consolidation.worthIt ? 'tip-green' : 'tip-yellow'">
    <div class="tip-icon">{{ consolidation.worthIt ? '✅' : '⏳' }}</div>
    <div class="tip-body">
      <p class="tip-title">
        {{ consolidation.worthIt
          ? 'Bon moment pour consolider'
          : 'Attendre des frais plus bas'
        }}
      </p>
      <p class="tip-detail">
        Consolider {{ utxoCount }} UTXOs coûterait
        <strong>{{ consolidation.cost.toLocaleString() }} sats</strong>
        à {{ consolidation.feeRate }} sat/vB
        (tx ~{{ consolidation.vsize }} vB).
      </p>
      <p v-if="!consolidation.worthIt" class="tip-detail">
        Attends que les frais passent sous <strong>5 sat/vB</strong> pour économiser
        ≈ {{ Math.round(consolidation.saving).toLocaleString() }} sats.
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUtxoStore } from '@/stores/utxo'

const utxo = useUtxoStore()
const consolidation = computed(() => utxo.consolidation)
const utxoCount = computed(() => utxo.utxoCount)
</script>

<style scoped>
.tip-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border: 2px solid var(--border);
}

.tip-green  { background: #f0fdf4; box-shadow: 3px 3px 0 #16a34a; border-color: #16a34a; }
.tip-yellow { background: #fffbeb; box-shadow: 3px 3px 0 #d97706; border-color: #d97706; }

.tip-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }

.tip-title { font-weight: 800; font-size: 14px; margin-bottom: 4px; }
.tip-detail { font-size: 13px; color: var(--muted); line-height: 1.5; margin-top: 2px; }
</style>

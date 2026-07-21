<template>
  <div class="pnl-stats">

    <!-- Total sats -->
    <div class="pnl-block">
      <div class="pnl-block-icon">₿</div>
      <div class="pnl-block-label">Total sats</div>
      <div class="pnl-block-val accent">{{ totalSats.toLocaleString() }}</div>
      <div class="pnl-block-sub">{{ formatBtc(totalSats) }}</div>
    </div>

    <!-- EUR investi -->
    <div class="pnl-block">
      <div class="pnl-block-icon">💶</div>
      <div class="pnl-block-label">EUR investi</div>
      <div class="pnl-block-val">{{ formatEur(totalEurSpent) }}</div>
      <div class="pnl-block-sub">Ø {{ formatEur(avgBuyPrice) }}/BTC</div>
    </div>

    <!-- Valeur actuelle -->
    <div class="pnl-block">
      <div class="pnl-block-icon">📊</div>
      <div class="pnl-block-label">Valeur actuelle</div>
      <div class="pnl-block-val">{{ currentValue !== null ? formatEur(currentValue) : '—' }}</div>
      <div class="pnl-block-sub">
        {{ currentPrice ? '@ ' + formatEur(currentPrice) + '/BTC' : 'chargement…' }}
      </div>
    </div>

    <!-- P&L -->
    <div class="pnl-block pnl-block-result" :class="pnlClass">
      <div class="pnl-block-icon">{{ pnl === null ? '⏳' : pnl >= 0 ? '📈' : '📉' }}</div>
      <div class="pnl-block-label">P&amp;L</div>
      <div class="pnl-block-val pnl-val">
        {{ pnl !== null ? (pnl >= 0 ? '+' : '') + formatEur(pnl) : '—' }}
      </div>
      <div class="pnl-block-sub pnl-pct" v-if="pnl !== null">
        {{ pnl >= 0 ? '▲' : '▼' }} {{ Math.abs(pnlPct).toFixed(1) }}%
      </div>
      <div class="pnl-block-sub" v-else>en attente de données</div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStackStore } from '@/stores/stack'
import { formatBtc, formatEur } from '@/composables/useMempool'

const stack = useStackStore()
const totalSats     = computed(() => stack.totalSats)
const totalEurSpent = computed(() => stack.totalEurSpent)
const avgBuyPrice   = computed(() => stack.avgBuyPrice)
const currentValue  = computed(() => stack.currentValue)
const currentPrice  = computed(() => stack.currentPrice)
const pnl           = computed(() => stack.pnl)
const pnlPct        = computed(() => stack.pnlPct)

const pnlClass = computed(() => {
  if (pnl.value === null) return ''
  return pnl.value >= 0 ? 'pnl-green' : 'pnl-red'
})
</script>

<style scoped>
/* ── Conteneur ── */
.pnl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  background: var(--white);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

/* ── Bloc individuel ── */
.pnl-block {
  padding: 22px 20px;
  border-right: 2px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: background 0.08s;
}

.pnl-block:last-child { border-right: none; }
.pnl-block:hover { background: #fafafa; }

/* ── Icône ── */
.pnl-block-icon {
  font-size: 18px;
  margin-bottom: 6px;
  line-height: 1;
}

/* ── Label ── */
.pnl-block-label {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--muted);
}

/* ── Valeur principale ── */
.pnl-block-val {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1.1;
  color: var(--black);
  margin-top: 2px;
}

.pnl-block-val.accent { color: var(--orange); }

/* ── Sous-label ── */
.pnl-block-sub {
  font-size: 12px;
  color: var(--muted);
  font-weight: 600;
  margin-top: 2px;
}

/* ── Bloc P&L vert ── */
.pnl-green {
  background: #f0fdf4;
  border-left: 4px solid #22c55e;
  padding-left: 16px;
}

.pnl-green .pnl-val { color: #15803d; }
.pnl-green .pnl-pct { color: #16a34a; font-weight: 700; }

/* ── Bloc P&L rouge ── */
.pnl-red {
  background: #fef2f2;
  border-left: 4px solid #ef4444;
  padding-left: 16px;
}

.pnl-red .pnl-val { color: #b91c1c; }
.pnl-red .pnl-pct { color: #dc2626; font-weight: 700; }

/* ── Responsive ── */
@media (max-width: 900px) {
  .pnl-stats { grid-template-columns: 1fr 1fr; }
  .pnl-block:nth-child(2n) { border-right: none; }
  .pnl-block:nth-child(1),
  .pnl-block:nth-child(2) { border-bottom: 2px solid var(--border); }
}

@media (max-width: 480px) {
  .pnl-stats { grid-template-columns: 1fr 1fr; }
  .pnl-block { padding: 16px 14px; }
  .pnl-block-val { font-size: 20px; }
}
</style>

<template>
  <div class="page">
    <!-- Welcome banner -->
    <div class="welcome-banner">
      <div>
        <div class="welcome-title">Lightning App</div>
        <div class="welcome-sub">⚡ {{ auth.shortPubkey }}</div>
      </div>
      <div class="welcome-actions">
        <RouterLink to="/utxos" class="btn btn-ghost btn-sm">🔗 Mes UTXOs</RouterLink>
        <RouterLink to="/stack" class="btn btn-primary btn-sm">📈 Mon Stack</RouterLink>
      </div>
    </div>

    <!-- KPIs skeleton ou données -->
    <div class="stats-grid">
      <template v-if="!feesStore.fees">
        <div class="stat-block" v-for="i in 4" :key="i">
          <Sk height="10px" width="80px" style="margin-bottom:10px" />
          <Sk height="36px" width="110px" style="margin-bottom:8px" />
          <Sk height="10px" width="60px" />
        </div>
      </template>
      <template v-else>
        <div class="stat-block">
          <div class="stat-block-label">Frais actuels</div>
          <div class="stat-block-val stat-val-orange">{{ feesStore.fees?.fastestFee ?? '…' }}</div>
          <div class="stat-block-sub">sat/vB express</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label">Mon stack</div>
          <div class="stat-block-val">{{ stack.totalSats.toLocaleString() }}</div>
          <div class="stat-block-sub">sats · {{ formatBtc(stack.totalSats) }}</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label">Valeur actuelle</div>
          <div class="stat-block-val" :class="stack.currentValue ? '' : 'text-muted'">
            {{ stack.currentValue ? formatEur(stack.currentValue) : '—' }}
          </div>
          <div class="stat-block-sub">
            {{ stack.currentPrice ? formatEur(stack.currentPrice) + '/BTC' : 'chargement…' }}
          </div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label">P&L</div>
          <div class="stat-block-val" :class="pnlClass">
            {{ stack.pnl !== null ? (stack.pnl >= 0 ? '+' : '') + formatEur(stack.pnl) : '—' }}
          </div>
          <div class="stat-block-sub" :class="pnlClass">
            {{ stack.pnlPct !== null ? (stack.pnlPct >= 0 ? '▲' : '▼') + ' ' + Math.abs(stack.pnlPct).toFixed(1) + '%' : '' }}
          </div>
        </div>
      </template>
    </div>

    <div class="grid-2" style="align-items:start">
      <!-- Frais card -->
      <div class="card" style="margin-bottom:0">
        <div class="card-header">
          <span style="font-weight:900">Frais mempool</span>
          <span v-if="!feesStore.loading" class="badge" :class="levelBadge">{{ levelLabel }}</span>
          <Sk v-else height="22px" width="70px" />
        </div>
        <div class="card-body">
          <template v-if="!feesStore.fees">
            <div class="sk-gauge">
              <Sk width="200px" height="110px" rounded style="margin:0 auto 16px" />
              <div style="display:flex; justify-content:center; gap:16px">
                <Sk v-for="i in 4" :key="i" width="40px" height="32px" />
              </div>
            </div>
          </template>
          <template v-else>
            <FeeGauge :value="feesStore.fees?.fastestFee" :fees="feesStore.fees" />
            <div style="text-align:center; margin-top:12px">
              <RouterLink to="/fees" class="btn btn-ghost btn-sm">Détail complet →</RouterLink>
            </div>
          </template>
        </div>
      </div>

      <!-- UTXOs + consolidation -->
      <div class="card" style="margin-bottom:0">
        <div class="card-header">
          <span style="font-weight:900">UTXOs</span>
          <RouterLink to="/utxos" class="btn btn-ghost btn-sm">Visualiser →</RouterLink>
        </div>
        <div class="card-body">
          <template v-if="utxoStore.utxoCount">
            <div style="display:flex; gap:24px; margin-bottom:16px">
              <div>
                <div class="stat-block-label" style="margin-bottom:4px">Nombre</div>
                <div style="font-size:32px; font-weight:900">{{ utxoStore.utxoCount }}</div>
              </div>
              <div>
                <div class="stat-block-label" style="margin-bottom:4px">Total</div>
                <div style="font-size:32px; font-weight:900; color:var(--orange)">{{ formatBtc(utxoStore.totalSats) }}</div>
              </div>
            </div>
            <ConsolidationTip />
          </template>
          <div v-else class="empty-state" style="padding:32px 0">
            <div class="icon">🔗</div>
            <p style="font-size:14px">Entre ton xpub pour visualiser tes UTXOs</p>
            <RouterLink to="/utxos" class="btn btn-ghost btn-sm" style="margin-top:12px">Configurer →</RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeesStore } from '@/stores/fees'
import { useUtxoStore } from '@/stores/utxo'
import { useStackStore } from '@/stores/stack'
import { formatBtc, formatEur } from '@/composables/useMempool'
import FeeGauge from '@/components/fees/FeeGauge.vue'
import ConsolidationTip from '@/components/utxo/ConsolidationTip.vue'
import Sk from '@/components/ui/Sk.vue'

const auth = useAuthStore()
const feesStore = useFeesStore()
const utxoStore = useUtxoStore()
const stack = useStackStore()

const levelBadge = computed(() => {
  const m = { low: 'badge-green', medium: 'badge-yellow', high: 'badge-red' }
  return m[feesStore.level] || 'badge-blue'
})
const levelLabel = computed(() => {
  const m = { low: 'Frais bas', medium: 'Modérés', high: 'Élevés' }
  return m[feesStore.level] || '…'
})
const pnlClass = computed(() => {
  if (stack.pnl === null) return 'text-muted'
  return stack.pnl >= 0 ? 'pnl-green' : 'pnl-red'
})

onMounted(async () => {
  feesStore.startPolling()
  await stack.load(auth.pubkey)
  await stack.fetchPrice()
})
</script>

<style scoped>
.welcome-banner {
  background: var(--black);
  color: var(--white);
  padding: 20px 24px;
  margin-bottom: 24px;
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.welcome-title { font-size: 18px; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 4px; }
.welcome-sub   { font-size: 12px; color: #9ca3af; font-family: monospace; font-weight: 600; }
.welcome-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.text-muted { color: var(--muted) !important; }
.pnl-green  { color: #166534; }
.pnl-red    { color: #991b1b; }

.sk-gauge { display: flex; flex-direction: column; align-items: center; padding: 8px 0; }
</style>

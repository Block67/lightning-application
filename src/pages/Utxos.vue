<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('utxos.title') }}</h1>
      <p>{{ t('utxos.sub') }}</p>
    </div>

    <!-- Xpub input -->
    <div class="card">
      <div class="card-header">
        <span style="font-size:15px; font-weight:900">
          <TermTip term="xpub">{{ t('utxos.xpub_label') }}</TermTip>
        </span>
        <span class="badge badge-green">{{ t('utxos.privacy_badge') }}</span>
      </div>
      <div class="card-body">
        <XpubInput />
      </div>
    </div>

    <!-- Skeleton pendant le chargement -->
    <template v-if="utxo.loading">
      <!-- Stats skeleton -->
      <div class="stats-grid">
        <div class="stat-block" v-for="i in 4" :key="i">
          <Sk height="10px" width="80px" style="margin-bottom:10px" />
          <Sk height="36px" width="100px" style="margin-bottom:8px" />
          <Sk height="10px" width="55px" />
        </div>
      </div>

      <!-- Bubbles skeleton -->
      <div class="card">
        <div class="card-header">
          <Sk height="18px" width="200px" />
        </div>
        <div class="card-body">
          <div class="sk-bubbles">
            <Sk v-for="(s, i) in bubbleSizes" :key="i"
              :width="s" :height="s" rounded />
          </div>
        </div>
      </div>

      <!-- Table skeleton -->
      <div class="card">
        <div class="card-header">
          <Sk height="18px" width="140px" />
          <Sk height="14px" width="60px" />
        </div>
        <div class="card-body" style="padding:0">
          <div class="sk-table-row" v-for="i in 6" :key="i">
            <Sk height="13px" width="20px" />
            <Sk height="13px" style="flex:2" />
            <Sk height="13px" style="flex:3" />
            <Sk height="20px" width="70px" />
          </div>
        </div>
      </div>
    </template>

    <!-- Données chargées -->
    <template v-else-if="utxo.utxos.length">
      <ConsolidationTip style="margin-bottom:24px" />

      <div class="stats-grid">
        <div class="stat-block">
          <div class="stat-block-label">{{ t('utxos.total_sats') }}</div>
          <div class="stat-block-val stat-val-orange">{{ utxo.totalSats.toLocaleString() }}</div>
          <div class="stat-block-sub">{{ formatBtc(utxo.totalSats) }}</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label"><TermTip term="utxo">{{ t('utxos.count') }}</TermTip></div>
          <div class="stat-block-val">{{ utxo.utxoCount }}</div>
          <div class="stat-block-sub">{{ utxo.stats?.funded_txo_count ?? 0 }} reçues · {{ utxo.stats?.spent_txo_count ?? 0 }} dépensées</div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label">{{ t('utxos.avg') }}</div>
          <div class="stat-block-val">{{ Math.round(utxo.totalSats / utxo.utxoCount).toLocaleString() }}</div>
          <div class="stat-block-sub">sats / <TermTip term="utxo">UTXO</TermTip></div>
        </div>
        <div class="stat-block">
          <div class="stat-block-label">{{ t('utxos.largest') }}</div>
          <div class="stat-block-val">{{ utxo.sortedDesc[0]?.value.toLocaleString() ?? '—' }}</div>
          <div class="stat-block-sub">sats</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('utxos.bubbles_title') }}</span>
          <span style="font-size:12px; color:var(--muted); font-weight:600">Survole pour le détail</span>
        </div>
        <div class="card-body">
          <UtxoBubbles />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('utxos.detail_title') }}</span>
          <span style="font-size:12px; color:var(--muted); font-weight:600">{{ utxo.utxoCount }} <TermTip term="utxo">UTXOs</TermTip></span>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Valeur (sats)</th>
                <th>Txid</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(u, i) in utxo.sortedDesc" :key="u.txid + u.vout">
                <td style="color:var(--muted); font-weight:700">{{ i + 1 }}</td>
                <td><strong>{{ u.value.toLocaleString() }}</strong><span style="color:var(--muted); font-size:12px"> sats</span></td>
                <td class="txid-cell">{{ u.txid.slice(0, 16) }}…:{{ u.vout }}</td>
                <td>
                  <span :class="u.status?.confirmed ? 'badge badge-green' : 'badge badge-yellow'">
                    {{ u.status?.confirmed ? '✓ Confirmé' : '⏳ Mempool' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="empty-state">
      <div class="icon">🔗</div>
      <p class="empty-title">Aucun UTXO chargé</p>
      <p>Entre ton <TermTip term="xpub">xpub</TermTip> ci-dessus pour visualiser tes <TermTip term="utxo">UTXOs</TermTip></p>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUtxoStore } from '@/stores/utxo'
import { useFeesStore } from '@/stores/fees'
import { useAuthStore } from '@/stores/auth'
import { useDb } from '@/composables/useDb'
import { formatBtc } from '@/composables/useMempool'
import XpubInput from '@/components/utxo/XpubInput.vue'
import UtxoBubbles from '@/components/utxo/UtxoBubbles.vue'
import ConsolidationTip from '@/components/utxo/ConsolidationTip.vue'
import TermTip from '@/components/ui/TermTip.vue'
import Sk from '@/components/ui/Sk.vue'

const { t } = useI18n()
const utxo = useUtxoStore()
const feesStore = useFeesStore()
const auth = useAuthStore()

const bubbleSizes = ['48px', '36px', '60px', '28px', '52px', '40px', '24px', '44px', '32px']

onMounted(async () => {
  feesStore.fetchFees()
  const { getSettings } = useDb()
  const settings = await getSettings(auth.pubkey)
  if (settings?.xpub && !utxo.utxos.length) {
    await utxo.fetchUtxos(settings.xpub, auth.pubkey)
  }
})
</script>

<style scoped>
.txid-cell {
  font-family: monospace;
  font-size: 12px;
  color: var(--muted);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sk-bubbles {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  padding: 8px 0;
}

.sk-table-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1.5px solid #e5e7eb;
}

.sk-table-row:last-child { border-bottom: none; }

@media (max-width: 640px) {
  .txid-cell { display: none; }
}
</style>

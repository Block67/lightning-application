<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('stack.title') }}</h1>
      <p>{{ t('stack.sub') }}</p>
    </div>

    <!-- Skeleton initial -->
    <template v-if="stack.loading">
      <!-- PnL skeleton -->
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card" v-for="i in 4" :key="i" style="margin-bottom:0">
          <div class="card-body">
            <Sk height="10px" width="80px" style="margin-bottom:12px" />
            <Sk height="34px" width="120px" style="margin-bottom:8px" />
            <Sk height="12px" width="70px" />
          </div>
        </div>
      </div>

      <!-- Chart skeleton -->
      <div class="card">
        <div class="card-header">
          <Sk height="18px" width="180px" />
          <Sk height="14px" width="60px" />
        </div>
        <div class="card-body">
          <Sk width="100%" height="180px" />
        </div>
      </div>

      <!-- Split skeleton -->
      <div class="split-layout">
        <div class="card" style="margin-bottom:0">
          <div class="card-header"><Sk height="18px" width="140px" /></div>
          <div class="card-body" style="display:flex; flex-direction:column; gap:16px">
            <div v-for="i in 4" :key="i">
              <Sk height="10px" width="100px" style="margin-bottom:8px" />
              <Sk height="40px" width="100%" />
            </div>
            <Sk height="42px" width="140px" />
          </div>
        </div>
        <div class="card" style="margin-bottom:0">
          <div class="card-header"><Sk height="18px" width="160px" /></div>
          <div class="card-body" style="padding:0">
            <div class="sk-table-row sk-header">
              <Sk v-for="i in 4" :key="i" height="12px" style="flex:1" />
            </div>
            <div class="sk-table-row" v-for="i in 5" :key="i">
              <Sk height="13px" width="70px" />
              <Sk height="13px" style="flex:1" />
              <Sk height="13px" width="55px" />
              <Sk height="13px" width="65px" />
              <Sk height="26px" width="28px" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Données chargées -->
    <template v-else>
      <PnLCard style="margin-bottom:24px" />

      <div class="card">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('stack.chart_title') }}</span>
          <span style="font-size:12px; color:var(--muted); font-weight:600">
            <TermTip term="dca">DCA</TermTip> · {{ stack.purchases.length }} achats
          </span>
        </div>
        <div class="card-body">
          <StackChart />
        </div>
      </div>

      <div class="split-layout">
        <div class="card" style="margin-bottom:0">
          <div class="card-header">
            <span style="font-size:15px; font-weight:900">{{ t('stack.add_title') }}</span>
          </div>
          <div class="card-body">
            <AddPurchase />
          </div>
        </div>

        <div class="card" style="margin-bottom:0">
          <div class="card-header">
            <span style="font-size:15px; font-weight:900">{{ t('stack.history_title') }}</span>
            <span style="font-size:12px; color:var(--muted); font-weight:600">{{ stack.purchases.length }} entrées</span>
          </div>

          <div v-if="!stack.purchases.length" class="empty-state" style="padding:40px 20px">
            <div class="icon">📊</div>
            <p>{{ t('stack.empty') }}</p>
          </div>

          <div v-else style="overflow-x:auto">
            <table class="stack-table">
              <thead>
                <tr>
                  <th>{{ t('stack.date') }}</th>
                  <th>{{ t('stack.sats') }}</th>
                  <th>{{ t('stack.eur') }}</th>
                  <th class="hide-mobile">{{ t('stack.price') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="p in sortedPurchases" :key="p.id">
                  <td class="date-cell">{{ formatDate(p.date) }}</td>
                  <td><strong>{{ p.sats.toLocaleString() }}</strong><span style="color:var(--muted); font-size:11px"> sats</span></td>
                  <td style="font-weight:700">{{ formatEur(p.eurSpent) }}</td>
                  <td class="price-cell hide-mobile">{{ formatEur(p.priceAtBuy) }}</td>
                  <td>
                    <button class="btn btn-danger btn-sm" @click="remove(p.id)">✕</button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="total-row">
                  <td>{{ t('stack.total') }}</td>
                  <td><strong>{{ stack.totalSats.toLocaleString() }}</strong></td>
                  <td><strong>{{ formatEur(stack.totalEurSpent) }}</strong></td>
                  <td class="hide-mobile">Ø <TermTip term="pnl">{{ formatEur(stack.avgBuyPrice) }}</TermTip></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStackStore } from '@/stores/stack'
import { useAuthStore } from '@/stores/auth'
import { formatEur } from '@/composables/useMempool'
import PnLCard from '@/components/stacker/PnLCard.vue'
import StackChart from '@/components/stacker/StackChart.vue'
import AddPurchase from '@/components/stacker/AddPurchase.vue'
import TermTip from '@/components/ui/TermTip.vue'
import Sk from '@/components/ui/Sk.vue'

const { t } = useI18n()
const stack = useStackStore()
const auth = useAuthStore()

const sortedPurchases = computed(() =>
  [...stack.purchases].sort((a, b) => new Date(b.date) - new Date(a.date))
)

function formatDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function remove(id) {
  if (confirm('Supprimer cet achat ?')) {
    await stack.remove(id, auth.pubkey)
  }
}

onMounted(async () => {
  await stack.load(auth.pubkey)
  await stack.fetchPrice()
})
</script>

<style scoped>
.split-layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) { .split-layout { grid-template-columns: 1fr; } }

.stack-table { width: 100%; border-collapse: collapse; font-size: 14px; }

.stack-table th {
  text-align: left;
  font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;
  background: var(--black); color: var(--white);
  padding: 10px 14px; white-space: nowrap;
}

.stack-table td { padding: 10px 14px; border-bottom: 1.5px solid #e5e7eb; vertical-align: middle; }
.stack-table tbody tr:last-child td { border-bottom: none; }
.stack-table tbody tr:hover td { background: #f5f5ff; }

.total-row td {
  font-weight: 800;
  border-top: 2px solid var(--border);
  color: var(--black);
  padding-top: 12px;
  background: var(--alt);
}

.date-cell { color: var(--muted); font-weight: 700; font-size: 13px; white-space: nowrap; }
.price-cell { color: var(--muted); font-size: 13px; }

.sk-table-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-bottom: 1.5px solid #e5e7eb;
}
.sk-table-row:last-child { border-bottom: none; }
.sk-header { background: #f4f4f4; padding: 10px 16px; }

@media (max-width: 640px) {
  .hide-mobile { display: none; }
}
</style>

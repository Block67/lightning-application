<template>
  <div class="page">
    <div class="page-header">
      <h1>{{ t('fees.title') }}</h1>
      <p>{{ t('fees.sub') }}</p>
    </div>

    <!-- Skeleton initial -->
    <template v-if="!feesStore.fees">
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <Sk height="18px" width="160px" />
          <Sk height="14px" width="90px" />
        </div>
        <div class="card-body">
          <div class="sk-gauge-layout">
            <div style="display:flex; flex-direction:column; align-items:center; gap:12px">
              <Sk width="200px" height="110px" rounded />
              <Sk width="140px" height="28px" />
              <div style="display:flex; gap:12px">
                <Sk v-for="i in 4" :key="i" width="36px" height="36px" />
              </div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; gap:10px">
              <div v-for="i in 4" :key="i" class="fee-tier-sk">
                <Sk width="20px" height="20px" rounded />
                <Sk style="flex:1" height="14px" />
                <Sk width="70px" height="18px" />
                <Sk width="55px" height="20px" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <Sk height="18px" width="200px" />
        </div>
        <div class="card-body">
          <div style="display:flex; gap:20px; flex-wrap:wrap">
            <Sk v-for="i in 2" :key="i" width="130px" height="44px" />
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <Sk height="18px" width="220px" />
        </div>
        <div class="card-body">
          <Sk width="100%" height="160px" />
        </div>
      </div>
    </template>

    <!-- Données chargées -->
    <template v-else>
      <!-- Jauge + recommandations -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('fees.recommended') }}</span>
          <span v-if="feesStore.lastUpdated" style="font-size:12px; color:var(--muted); font-weight:600">
            {{ t('fees.updated') }} {{ feesStore.lastUpdated.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' }) }}
          </span>
        </div>
        <div class="card-body">
          <div class="gauge-layout">
            <FeeGauge :value="feesStore.fees?.fastestFee" :fees="feesStore.fees" />
            <div class="fee-tiers">
              <div v-for="tier in feeTiers" :key="tier.label" class="fee-tier">
                <span class="tier-emoji">{{ tier.emoji }}</span>
                <span class="tier-label">{{ tier.label }}</span>
                <span class="tier-val">
                  <TermTip term="satVb">{{ tier.val ?? '…' }} sat/vB</TermTip>
                </span>
                <span class="badge" :class="tier.badge">{{ tier.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calculateur -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('fees.calculator') }}</span>
          <span style="font-size:12px; color:var(--muted); font-weight:600">
            <TermTip term="vbyte">P2WPKH SegWit</TermTip>
          </span>
        </div>
        <div class="card-body">
          <div class="calc-layout">
            <div class="calc-inputs">
              <div class="form-group" style="margin-bottom:0">
                <label><TermTip term="utxo">{{ t('fees.inputs') }}</TermTip></label>
                <input type="number" v-model.number="calcInputs" min="1" max="100" style="max-width:120px" />
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label>{{ t('fees.outputs') }}</label>
                <input type="number" v-model.number="calcOutputs" min="1" max="50" style="max-width:120px" />
              </div>
            </div>
            <div class="calc-results">
              <div class="calc-row">
                <span>Taille estimée (<TermTip term="vbyte">vByte</TermTip>)</span>
                <strong>{{ txSize }} vB</strong>
              </div>
              <div class="calc-row">
                <span>Express — <TermTip term="satVb">{{ feesStore.fees.fastestFee }} sat/vB</TermTip></span>
                <strong class="accent">{{ (txSize * feesStore.fees.fastestFee).toLocaleString() }} sats</strong>
              </div>
              <div class="calc-row">
                <span>1h — {{ feesStore.fees.hourFee }} sat/vB</span>
                <strong>{{ (txSize * feesStore.fees.hourFee).toLocaleString() }} sats</strong>
              </div>
              <div class="calc-row">
                <span>Éco — {{ feesStore.fees.economyFee }} sat/vB</span>
                <strong>{{ (txSize * feesStore.fees.economyFee).toLocaleString() }} sats</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Historique 7 jours -->
      <div class="card">
        <div class="card-header">
          <span style="font-size:15px; font-weight:900">{{ t('fees.history') }}</span>
          <span style="font-size:12px; color:var(--muted); font-weight:600">
            <TermTip term="mempool">Mempool</TermTip> · mempool.space
          </span>
        </div>
        <div class="card-body" style="padding-bottom:12px">
          <div v-if="!feesStore.history.length" style="padding:8px 0">
            <Sk width="100%" height="160px" />
          </div>
          <FeeHistory v-else :data="feesStore.history" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFeesStore } from '@/stores/fees'
import FeeGauge from '@/components/fees/FeeGauge.vue'
import FeeHistory from '@/components/fees/FeeHistory.vue'
import TermTip from '@/components/ui/TermTip.vue'
import Sk from '@/components/ui/Sk.vue'

const { t } = useI18n()
const feesStore = useFeesStore()
const calcInputs = ref(1)
const calcOutputs = ref(2)

const txSize = computed(() => 10 + calcInputs.value * 68 + calcOutputs.value * 31)

const feeTiers = computed(() => [
  { emoji: '🐢', label: 'Économique', val: feesStore.fees?.economyFee,  time: '~1h+',   badge: 'badge-green' },
  { emoji: '⏳', label: '1 heure',   val: feesStore.fees?.hourFee,     time: '~60 min', badge: 'badge-yellow' },
  { emoji: '🚀', label: 'Rapide',    val: feesStore.fees?.halfHourFee, time: '~30 min', badge: 'badge-blue' },
  { emoji: '⚡', label: 'Express',   val: feesStore.fees?.fastestFee,  time: '~10 min', badge: 'badge-red' },
])

onMounted(() => feesStore.startPolling())
onBeforeUnmount(() => feesStore.stopPolling())
</script>

<style scoped>
.sk-gauge-layout {
  display: flex;
  gap: 48px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.fee-tier-sk {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--alt);
  border: 2px solid #e5e7eb;
}

.gauge-layout {
  display: flex;
  gap: 48px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.fee-tiers { flex: 1; min-width: 260px; display: flex; flex-direction: column; gap: 10px; }

.fee-tier {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid var(--border);
  background: var(--alt);
  box-shadow: var(--shadow-sm);
}

.tier-emoji { font-size: 18px; width: 24px; text-align: center; }
.tier-label { flex: 1; font-size: 14px; font-weight: 700; }
.tier-val { font-weight: 900; font-size: 15px; font-variant-numeric: tabular-nums; }

.calc-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.calc-inputs { display: flex; gap: 20px; flex-wrap: wrap; }

.calc-results {
  flex: 1;
  min-width: 260px;
  border: 2px solid var(--border);
  background: var(--alt);
  box-shadow: var(--shadow-sm);
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 14px;
  border-bottom: 1.5px solid #e5e7eb;
  gap: 12px;
}

.calc-row:last-child { border-bottom: none; }
.calc-row span { color: var(--muted); font-weight: 600; flex: 1; }
.calc-row strong { font-weight: 900; white-space: nowrap; }
.accent { color: var(--orange); }

@media (max-width: 640px) {
  .gauge-layout, .sk-gauge-layout { flex-direction: column; gap: 24px; }
  .calc-inputs { flex-direction: column; }
  .calc-results { min-width: unset; width: 100%; }
}
</style>

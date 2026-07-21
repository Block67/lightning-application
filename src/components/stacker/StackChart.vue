<template>
  <div class="chart-wrap">
    <svg v-if="curve.length" :viewBox="`0 0 ${W} ${H}`" class="chart-svg">
      <!-- Grille Y -->
      <line v-for="y in gridYs" :key="y" :x1="PAD" :y1="y" :x2="W - 10" :y2="y"
        stroke="#e5e7eb" stroke-width="1"/>
      <text v-for="(t, i) in yTicks" :key="i"
        :x="PAD - 6" :y="scaleY(t) + 4"
        text-anchor="end" font-size="10" fill="var(--muted)">{{ formatSats(t) }}</text>

      <!-- Aire -->
      <path :d="areaPath" fill="rgba(247,147,26,.15)"/>

      <!-- Ligne -->
      <path :d="linePath" fill="none" stroke="var(--orange)" stroke-width="2.5" stroke-linejoin="round"/>

      <!-- Points -->
      <circle v-for="(pt, i) in chartPoints" :key="i"
        :cx="pt.x" :cy="pt.y" r="3"
        fill="var(--orange)" opacity="0.6"/>

      <!-- Labels X -->
      <text v-for="(l, i) in xLabels" :key="i"
        :x="l.x" :y="H - 4"
        text-anchor="middle" font-size="10" fill="var(--muted)">{{ l.text }}</text>
    </svg>

    <div v-else class="empty-state">
      <div class="icon">📈</div>
      <p>Ajoute des achats pour voir la courbe d'accumulation</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStackStore } from '@/stores/stack'
import { formatSats } from '@/composables/useMempool'

const stack = useStackStore()
const curve = computed(() => stack.curve)

const W = 560
const H = 180
const PAD = 44

const maxSats = computed(() => Math.max(...curve.value.map(p => p.sats), 1))

function scaleX(i) {
  const n = curve.value.length - 1 || 1
  return PAD + (i / n) * (W - PAD - 10)
}

function scaleY(sats) {
  return H - 20 - (sats / maxSats.value) * (H - 44)
}

const chartPoints = computed(() =>
  curve.value.map((p, i) => ({ x: scaleX(i), y: scaleY(p.sats) }))
)

const linePath = computed(() =>
  chartPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
)

const areaPath = computed(() => {
  if (!chartPoints.value.length) return ''
  const bottom = H - 20
  const line = chartPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const last = chartPoints.value.length - 1
  return `${line} L ${scaleX(last)} ${bottom} L ${scaleX(0)} ${bottom} Z`
})

const yTicks = computed(() => {
  const max = maxSats.value
  return [0, Math.round(max / 4), Math.round(max / 2), Math.round(max * 3 / 4), max]
})

const gridYs = computed(() => yTicks.value.map(t => scaleY(t)))

const xLabels = computed(() => {
  if (curve.value.length < 2) return []
  const indices = [0, Math.floor((curve.value.length - 1) / 2), curve.value.length - 1]
  return indices.map(i => ({
    x: scaleX(i),
    text: new Date(curve.value[i].date).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
  }))
})
</script>

<style scoped>
.chart-wrap { width: 100%; }
.chart-svg { width: 100%; height: auto; display: block; }
</style>

<template>
  <div class="chart-wrap">
    <svg :viewBox="`0 0 ${W} ${H}`" class="chart-svg">
      <!-- Lignes de grille -->
      <line v-for="y in gridYs" :key="y" :x1="PAD" :y1="y" :x2="W - PAD/2" :y2="y"
        stroke="#e5e7eb" stroke-width="1" />

      <!-- Étiquettes Y -->
      <text v-for="(tick, i) in yTicks" :key="i"
        :x="PAD - 6" :y="scaleY(tick) + 4"
        text-anchor="end" font-size="10" fill="var(--muted)">{{ tick }}</text>

      <!-- Aire sous la courbe -->
      <path :d="areaPath" fill="rgba(247,147,26,.15)" />

      <!-- Ligne principale -->
      <path :d="linePath" fill="none" stroke="var(--orange)" stroke-width="2" stroke-linejoin="round"/>

      <!-- Étiquettes X (dates) -->
      <text v-for="(label, i) in xLabels" :key="i"
        :x="label.x" :y="H - 4"
        text-anchor="middle" font-size="10" fill="var(--muted)">{{ label.text }}</text>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] }
})

const W = 560
const H = 160
const PAD = 40

const points = computed(() => {
  if (!props.data.length) return []
  const step = Math.max(1, Math.floor(props.data.length / 50))
  return props.data.filter((_, i) => i % step === 0)
})

const maxFee = computed(() => Math.max(...points.value.map(p => p.avgFee_50 || 0), 1))

function scaleX(i) {
  const n = points.value.length - 1 || 1
  return PAD + (i / n) * (W - PAD * 1.5)
}

function scaleY(fee) {
  return H - 20 - (fee / maxFee.value) * (H - 40)
}

const yTicks = computed(() => {
  const max = maxFee.value
  return [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max]
})

const gridYs = computed(() => yTicks.value.map(t => scaleY(t)))

const linePath = computed(() => {
  if (!points.value.length) return ''
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.avgFee_50 || 0)}`)
    .join(' ')
})

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const bottom = H - 20
  const line = points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(p.avgFee_50 || 0)}`)
    .join(' ')
  const last = points.value.length - 1
  return `${line} L ${scaleX(last)} ${bottom} L ${scaleX(0)} ${bottom} Z`
})

const xLabels = computed(() => {
  if (!points.value.length) return []
  const indices = [0, Math.floor(points.value.length / 4), Math.floor(points.value.length / 2),
                   Math.floor(points.value.length * 3 / 4), points.value.length - 1]
  return indices.map(i => ({
    x: scaleX(i),
    text: new Date(points.value[i].timestamp * 1000).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })
  }))
})
</script>

<style scoped>
.chart-wrap { width: 100%; overflow: hidden; }
.chart-svg { width: 100%; height: auto; display: block; }
</style>

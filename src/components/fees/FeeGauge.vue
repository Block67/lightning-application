<template>
  <div class="gauge-wrap">
    <!-- Arc SVG -->
    <svg viewBox="0 0 200 110" class="gauge-svg">
      <!-- Track -->
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" stroke-width="14" stroke-linecap="round"/>
      <!-- Fill arc -->
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        :stroke="color"
        stroke-width="14"
        stroke-linecap="round"
        stroke-dasharray="251"
        :stroke-dashoffset="dashOffset"
        style="transition: stroke-dashoffset .6s ease, stroke .4s ease"
      />
      <!-- Needle -->
      <line
        :x1="100" :y1="100"
        :x2="needleX" :y2="needleY"
        :stroke="color"
        stroke-width="2.5"
        stroke-linecap="round"
        style="transition: all .6s ease"
      />
      <circle cx="100" cy="100" r="5" :fill="color" style="transition: fill .4s ease"/>
    </svg>

    <!-- Valeur centrale -->
    <div class="gauge-value">
      <span class="big-num" :style="{ color }">{{ props.value ?? '—' }}</span>
      <span class="unit">sat/vB</span>
    </div>

    <!-- Tiers -->
    <div class="fee-tiers">
      <div class="tier">
        <span class="tier-label">Eco</span>
        <span class="tier-val">{{ fees?.economyFee ?? '…' }}</span>
      </div>
      <div class="tier">
        <span class="tier-label">1h</span>
        <span class="tier-val">{{ fees?.hourFee ?? '…' }}</span>
      </div>
      <div class="tier">
        <span class="tier-label">30 min</span>
        <span class="tier-val">{{ fees?.halfHourFee ?? '…' }}</span>
      </div>
      <div class="tier">
        <span class="tier-label">Rapide</span>
        <span class="tier-val">{{ fees?.fastestFee ?? '…' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: Number,
  fees: Object
})

// Normalise 0-200 sat/vB en 0-1
const ratio = computed(() => {
  if (!props.value) return 0
  return Math.min(props.value / 200, 1)
})

// Arc = 251px de périmètre total (demi-cercle r=80)
const dashOffset = computed(() => 251 - ratio.value * 251)

// Position de l'aiguille (angle 180° → 0°)
const needleX = computed(() => 100 + 65 * Math.cos(Math.PI - ratio.value * Math.PI))
const needleY = computed(() => 100 - 65 * Math.sin(ratio.value * Math.PI))

const color = computed(() => {
  const r = ratio.value
  if (r < 0.1) return '#16a34a'
  if (r < 0.2) return '#d97706'
  return '#dc2626'
})
</script>

<style scoped>
.gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.gauge-svg {
  width: 200px;
  height: 110px;
}

.gauge-value {
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: -8px;
}

.big-num {
  font-size: 36px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  transition: color .4s;
}

.unit {
  font-size: 13px;
  color: var(--muted);
}

.fee-tiers {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.tier {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.tier-label {
  font-size: 11px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .06em;
}

.tier-val {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>

<template>
  <span class="term-tip" @mouseenter="open = true" @mouseleave="open = false" @click="open = !open">
    <slot /><span class="tip-icon" aria-label="info">?</span>
    <div v-if="open" class="tip-popup" role="tooltip">
      <div class="tip-label">{{ t(`terms.${term}.label`) }}</div>
      <div class="tip-desc">{{ t(`terms.${term}.desc`) }}</div>
    </div>
  </span>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

defineProps({ term: { type: String, required: true } })
const { t } = useI18n()
const open = ref(false)
</script>

<style scoped>
.term-tip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  cursor: help;
  border-bottom: 2px dashed var(--orange);
  padding-bottom: 1px;
  position: relative;
}

.tip-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px; height: 14px;
  background: var(--orange);
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  border-radius: 50%;
  flex-shrink: 0;
  line-height: 1;
}

.tip-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 500;
  background: var(--black);
  color: var(--white);
  border: 2px solid var(--border);
  box-shadow: 4px 4px 0 var(--orange);
  padding: 10px 14px;
  min-width: 220px;
  max-width: 280px;
  pointer-events: none;
  white-space: normal;
}

.tip-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--orange);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.tip-desc {
  font-size: 12px;
  line-height: 1.55;
  color: #d1d5db;
}

@media (max-width: 480px) {
  .tip-popup { min-width: 180px; max-width: 220px; left: auto; right: 0; }
}
</style>

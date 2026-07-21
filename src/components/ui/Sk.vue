<template>
  <div class="sk" :style="{ width, height, borderRadius: rounded ? '999px' : '0' }"></div>
</template>

<script setup>
defineProps({
  width:   { type: String, default: '100%' },
  height:  { type: String, default: '16px' },
  rounded: { type: Boolean, default: false }
})
</script>

<style>
.sk {
  background: linear-gradient(90deg, #e5e7eb 25%, #f0f1f3 50%, #e5e7eb 75%);
  background-size: 600px 100%;
  animation: sk-shimmer 1.4s infinite linear;
  flex-shrink: 0;
}

@keyframes sk-shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}
</style>

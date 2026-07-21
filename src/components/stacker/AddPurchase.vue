<template>
  <form class="add-form" @submit.prevent="submit">
    <div class="grid-2">
      <div class="form-group">
        <label>Date</label>
        <input type="date" v-model="form.date" required :max="today" />
      </div>
      <div class="form-group">
        <label>Sats achetés</label>
        <input type="number" v-model.number="form.sats" placeholder="100000" min="1" required />
      </div>
      <div class="form-group">
        <label>EUR dépensé</label>
        <input type="number" v-model.number="form.eurSpent" placeholder="42.50" step="0.01" min="0.01" required />
      </div>
      <div class="form-group">
        <label>Prix BTC au moment (€)</label>
        <input type="number" v-model.number="form.priceAtBuy" placeholder="65000" min="1" />
      </div>
    </div>
    <button type="submit" class="btn btn-primary" :disabled="!isValid">
      + Ajouter achat
    </button>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useStackStore } from '@/stores/stack'
import { useAuthStore } from '@/stores/auth'

const stack = useStackStore()
const auth = useAuthStore()

const today = new Date().toISOString().slice(0, 10)

const form = ref({
  date: today,
  sats: null,
  eurSpent: null,
  priceAtBuy: null
})

const isValid = computed(() =>
  form.value.date && form.value.sats > 0 && form.value.eurSpent > 0
)

async function submit() {
  await stack.add(auth.pubkey, {
    date: form.value.date,
    sats: form.value.sats,
    eurSpent: form.value.eurSpent,
    priceAtBuy: form.value.priceAtBuy || Math.round((form.value.eurSpent / form.value.sats) * 1e8)
  })
  form.value = { date: today, sats: null, eurSpent: null, priceAtBuy: null }
}
</script>

<style scoped>
.add-form { display: flex; flex-direction: column; gap: 16px; }
</style>

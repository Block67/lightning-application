<template>
  <div class="page">
    <div class="page-header">
      <h1>🎮 {{ t('game.title') }}</h1>
      <p>{{ t('game.sub') }}</p>
    </div>

    <!-- Étape 1 : choisir une équipe -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <span style="font-size:15px; font-weight:900">1. {{ t('game.step1') }}</span>
      </div>
      <div class="card-body team-picker">
        <button
          v-for="team in TEAMS"
          :key="team.id"
          class="team-card"
          :class="{ active: selectedTeam?.id === team.id }"
          :style="{ '--team-color': team.color }"
          :disabled="!!game.myTeam"
          @click="selectedTeam = team"
        >
          <span class="team-emoji">{{ team.emoji }}</span>
          <span class="team-name">{{ team.name }}</span>
          <span class="team-score">{{ game.scores[team.id] ?? 0 }} pts</span>
        </button>
      </div>
    </div>

    <!-- Étape 2 : se connecter + marquer le point -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <span style="font-size:15px; font-weight:900">2. {{ t('game.step2') }}</span>
      </div>
      <div class="card-body" style="display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center">
        <template v-if="game.myTeam">
          <p class="scored-msg">✅ {{ t('game.scored') }} <strong>{{ teamName(game.myTeam) }}</strong> !</p>
        </template>
        <template v-else-if="!auth.isAuthenticated">
          <p style="color:var(--muted); font-weight:600; font-size:13px">{{ t('game.needAuth') }}</p>
          <button class="btn btn-primary" @click="openAuth">⚡ {{ t('nav.connect') }}</button>
        </template>
        <template v-else>
          <p style="color:var(--muted); font-weight:600; font-size:13px">
            ⚡ {{ auth.shortPubkey }}
          </p>
          <button class="btn btn-primary" :disabled="!selectedTeam || scoring" @click="score">
            🎯 {{ scoring ? '…' : t('game.scoreBtn') }}
          </button>
          <p v-if="!selectedTeam" class="hint">{{ t('game.pickFirst') }}</p>
          <p v-if="scoreError" class="hint" style="color:#dc2626">{{ scoreError }}</p>
        </template>
      </div>
    </div>

    <!-- Leaderboard live -->
    <div class="card">
      <div class="card-header">
        <span style="font-size:15px; font-weight:900">🏆 {{ t('game.leaderboard') }}</span>
        <span class="polling-status">
          <span class="dot pulse"></span>
          {{ game.total }} {{ t('game.connected') }}
        </span>
      </div>
      <div class="card-body">
        <div class="bar-row" v-for="team in TEAMS" :key="team.id">
          <div class="bar-label">
            <span>{{ team.emoji }} {{ team.name }}</span>
            <strong>{{ game.scores[team.id] ?? 0 }}</strong>
          </div>
          <div class="bar-track">
            <div
              class="bar-fill"
              :style="{ width: pct(team.id) + '%', background: team.color }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <LnAuthModal v-if="showAuth" @close="showAuth = false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useGameStore, TEAMS } from '@/stores/game'
import LnAuthModal from '@/components/auth/LnAuthModal.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const game = useGameStore()

const selectedTeam = ref(null)
const showAuth = ref(false)
const scoring = ref(false)
const scoreError = ref(null)

function teamName(id) {
  return TEAMS.find(tm => tm.id === id)?.name ?? id
}

function pct(id) {
  if (!game.total) return 50
  return Math.round(((game.scores[id] ?? 0) / game.total) * 100)
}

function openAuth() {
  // Force le redirect LnAuthModal à revenir sur /game après connexion
  router.replace({ path: '/game', query: { redirect: '/game' } })
  showAuth.value = true
}

async function score() {
  if (!selectedTeam.value) return
  scoreError.value = null
  scoring.value = true
  try {
    await game.scoreForTeam(selectedTeam.value.id)
  } catch (e) {
    scoreError.value = e.message
  } finally {
    scoring.value = false
  }
}

onMounted(() => game.startPolling())
onBeforeUnmount(() => game.stopPolling())
</script>

<style scoped>
.team-picker {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.team-card {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px;
  background: var(--white);
  border: 2px solid var(--border);
  cursor: pointer;
  transition: all 0.08s;
  font-family: var(--font);
}

.team-card:hover:not(:disabled) { box-shadow: var(--shadow-sm); transform: translate(-1px, -1px); }
.team-card:disabled { cursor: not-allowed; opacity: 0.5; }

.team-card.active {
  box-shadow: 4px 4px 0 var(--team-color);
  border-color: var(--team-color);
}

.team-emoji { font-size: 32px; }
.team-name { font-weight: 900; font-size: 15px; }
.team-score { font-size: 12px; color: var(--muted); font-weight: 700; }

.scored-msg { font-size: 15px; font-weight: 700; }
.hint { font-size: 12px; color: var(--muted); font-weight: 600; }

.polling-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}

.dot {
  width: 8px; height: 8px;
  background: var(--orange);
  border-radius: 50%;
  display: inline-block;
}

.bar-row { margin-bottom: 16px; }
.bar-row:last-child { margin-bottom: 0; }

.bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 6px;
}

.bar-track {
  height: 22px;
  background: var(--alt);
  border: 2px solid var(--border);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  transition: width 0.4s ease;
}

@media (max-width: 640px) {
  .team-picker { flex-direction: column; }
}
</style>

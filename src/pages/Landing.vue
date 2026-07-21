<template>
  <!-- ── FEATURES ── -->
  <section class="features-section">
    <div class="section-inner">
      <p class="section-label">{{ t('landing.features_label') }}</p>
      <h2 class="section-title">{{ t('landing.features_title') }}</h2>

      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <h3>{{ t('landing.feat1_title') }}</h3>
          <p>{{ t('landing.feat1_desc') }}</p>
          <RouterLink to="/fees" class="feature-link">{{ t('landing.feat1_cta') }}</RouterLink>
        </div>

        <div class="feature-card feature-locked" @click="!auth.isAuthenticated && (showAuth = true)">
          <span v-if="!auth.isAuthenticated" class="lock-tag">{{ t('landing.lock_tag') }}</span>
          <div class="feature-icon">🔗</div>
          <h3>{{ t('landing.feat2_title') }}</h3>
          <p>{{ t('landing.feat2_desc') }}</p>
          <RouterLink v-if="auth.isAuthenticated" to="/utxos" class="feature-link">{{ t('landing.feat2_cta') }}</RouterLink>
        </div>

        <div class="feature-card feature-locked" @click="!auth.isAuthenticated && (showAuth = true)">
          <span v-if="!auth.isAuthenticated" class="lock-tag">{{ t('landing.lock_tag') }}</span>
          <div class="feature-icon">📈</div>
          <h3>{{ t('landing.feat3_title') }}</h3>
          <p>{{ t('landing.feat3_desc') }}</p>
          <RouterLink v-if="auth.isAuthenticated" to="/stack" class="feature-link">{{ t('landing.feat3_cta') }}</RouterLink>
        </div>
      </div>
    </div>
  </section>

  <!-- ── HOW IT WORKS ── -->
  <section class="how-section">
    <div class="section-inner">
      <p class="section-label">{{ t('landing.how_label') }}</p>
      <h2 class="section-title">{{ t('landing.how_title') }}</h2>

      <div class="steps-grid">
        <div class="step-card">
          <div class="step-num">01</div>
          <h3>{{ t('landing.step1_title') }}</h3>
          <p>{{ t('landing.step1_desc') }}</p>
        </div>
        <div class="step-card step-card-accent">
          <div class="step-num step-num-light">02</div>
          <h3>{{ t('landing.step2_title') }}</h3>
          <p>{{ t('landing.step2_desc') }}</p>
        </div>
        <div class="step-card">
          <div class="step-num">03</div>
          <h3>{{ t('landing.step3_title') }}</h3>
          <p>{{ t('landing.step3_desc') }}</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ── CTA ── -->
  <section class="cta-section">
    <div class="section-inner cta-inner">
      <h2 class="cta-title">{{ t('landing.cta_title') }}</h2>
      <p class="cta-sub">{{ t('landing.cta_sub') }}</p>
      <div class="cta-actions">
        <button class="btn btn-primary btn-lg" @click="showAuth = true">
          {{ t('landing.cta_connect2') }}
        </button>
        <RouterLink to="/fees" class="btn btn-lg cta-ghost">
          {{ t('landing.cta_fees2') }}
        </RouterLink>
      </div>
      <p class="cta-wallets">Phoenix · Breez · Zeus · Alby · Blink</p>
    </div>
  </section>

  <LnAuthModal v-if="showAuth" @close="showAuth = false" />
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import LnAuthModal from '@/components/auth/LnAuthModal.vue'

const { t } = useI18n()
const auth = useAuthStore()
const showAuth = ref(false)
</script>

<style scoped>
section { border-bottom: 3px solid var(--border); }

/* ── SECTIONS ── */
.section-inner { max-width: 1100px; margin: 0 auto; padding: 72px 40px; }

.section-label {
  font-size: 11px; font-weight: 800; letter-spacing: 0.18em;
  text-transform: uppercase; color: var(--orange); margin-bottom: 10px;
}

.section-title {
  font-size: clamp(26px, 3vw, 38px); font-weight: 900;
  letter-spacing: -0.04em; line-height: 1.05; margin-bottom: 48px;
}

/* ── FEATURES ── */
.features-section { background: var(--white); }

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
}

.feature-card {
  padding: 32px 26px;
  border-right: 2px solid var(--border);
  position: relative;
  transition: background 0.08s;
  background: var(--white);
}

.feature-card:last-child { border-right: none; }
.feature-card:hover { background: var(--accent-light); }
.feature-locked { cursor: pointer; }

.lock-tag {
  position: absolute; top: 12px; right: 12px;
  font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
  background: var(--accent-light); color: var(--orange); border: 1.5px solid var(--orange);
  padding: 3px 10px;
}

.feature-icon { font-size: 28px; margin-bottom: 14px; display: block; }
.feature-card h3 { font-size: 16px; font-weight: 900; margin-bottom: 10px; }
.feature-card p  { font-size: 14px; color: var(--muted); line-height: 1.65; margin-bottom: 18px; font-weight: 500; }
.feature-link { font-size: 13px; font-weight: 800; color: var(--orange); border-bottom: 2px solid var(--orange); padding-bottom: 1px; }

/* ── HOW IT WORKS ── */
.how-section { background: var(--alt); }

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 2px solid var(--border);
  box-shadow: var(--shadow);
}

.step-card {
  padding: 36px 28px;
  background: var(--white);
  border-right: 2px solid var(--border);
}

.step-card:last-child { border-right: none; }

.step-card-accent { background: var(--orange); }
.step-card-accent h3 { color: var(--white); }
.step-card-accent p  { color: rgba(255,255,255,0.75); }

.step-num {
  font-size: 72px; font-weight: 900; letter-spacing: -0.06em;
  color: #e5e7eb; line-height: 1; margin-bottom: 12px; user-select: none;
}

.step-num-light { color: rgba(255,255,255,0.2); }

.step-card h3 { font-size: 17px; font-weight: 900; margin-bottom: 10px; }
.step-card p  { font-size: 14px; color: var(--muted); line-height: 1.65; font-weight: 500; }
.step-card-accent p { color: rgba(255,255,255,0.75); }

/* ── CTA ── */
.cta-section { background: var(--black); border-bottom: none; }
.cta-inner { text-align: center; }

.cta-title {
  font-size: clamp(26px, 3vw, 44px);
  font-weight: 900; letter-spacing: -0.04em;
  color: var(--white); margin-bottom: 12px;
}

.cta-sub { font-size: 15px; color: #9ca3af; margin-bottom: 32px; font-weight: 500; }
.cta-actions { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; margin-bottom: 24px; }

.cta-ghost {
  background: transparent; color: var(--white);
  border-color: var(--white); box-shadow: 3px 3px 0 rgba(255,255,255,0.3);
}
.cta-ghost:hover { box-shadow: 1px 1px 0 rgba(255,255,255,0.3); }

.cta-wallets { font-size: 12px; color: #6b7280; font-weight: 600; }

/* ── RESPONSIVE ── */
@media (max-width: 640px) {
  .section-inner { padding: 48px 20px; }
  .features-grid { grid-template-columns: 1fr; }
  .feature-card { border-right: none !important; border-bottom: 2px solid var(--border); }
  .feature-card:last-child { border-bottom: none; }
  .steps-grid { grid-template-columns: 1fr; }
  .step-card { border-right: none !important; border-bottom: 2px solid var(--border); }
  .step-card:last-child { border-bottom: none; }
  .cta-actions { flex-direction: column; align-items: stretch; }
}

@media (max-width: 480px) {
  .section-title { font-size: 24px; }
  .step-num { font-size: 52px; }
}
</style>

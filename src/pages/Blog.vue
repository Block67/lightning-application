<template>
  <div class="page">
    <div class="page-header">
      <h1>📝 {{ t('blog.title') }}</h1>
      <p>{{ t('blog.sub') }}</p>
    </div>

    <!-- Publier -->
    <div class="card" style="margin-bottom:24px">
      <div class="card-body" style="display:flex; flex-direction:column; gap:10px">
        <template v-if="auth.isAuthenticated">
          <textarea
            v-model="draft"
            :placeholder="t('blog.placeholder')"
            maxlength="280"
            rows="3"
          ></textarea>
          <div style="display:flex; justify-content:space-between; align-items:center">
            <span class="char-count">{{ draft.length }}/280</span>
            <button class="btn btn-primary" :disabled="!draft.trim() || publishing" @click="publish">
              {{ publishing ? '…' : t('blog.publish') }}
            </button>
          </div>
          <p v-if="publishError" class="hint" style="color:#dc2626">{{ publishError }}</p>
        </template>
        <template v-else>
          <p style="color:var(--muted); font-weight:600; font-size:13px; text-align:center">{{ t('blog.needAuth') }}</p>
          <button class="btn btn-primary" style="align-self:center" @click="openAuth">⚡ {{ t('nav.connect') }}</button>
        </template>
      </div>
    </div>

    <!-- Fil en direct -->
    <div class="card">
      <div class="card-header">
        <span style="font-size:15px; font-weight:900">{{ t('blog.feed') }}</span>
        <span class="polling-status">
          <span class="dot pulse"></span>
          {{ posts.posts.length }}
        </span>
      </div>
      <div class="card-body">
        <p v-if="!posts.posts.length" class="empty">{{ t('blog.empty') }}</p>
        <div v-for="post in posts.posts" :key="post.id" class="post">
          <span class="post-pubkey">⚡ {{ short(post.pubkey) }}</span>
          <p class="post-msg">{{ post.message }}</p>
          <span class="post-time">{{ timeAgo(post.createdAt) }}</span>
          <button
            v-if="auth.pubkey === post.pubkey"
            class="post-delete"
            :title="t('blog.delete')"
            @click="remove(post.id)"
          >🗑️</button>
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
import { usePostsStore } from '@/stores/posts'
import LnAuthModal from '@/components/auth/LnAuthModal.vue'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const posts = usePostsStore()

const draft = ref('')
const showAuth = ref(false)
const publishing = ref(false)
const publishError = ref(null)

function short(pubkey) {
  return pubkey.slice(0, 8) + '…' + pubkey.slice(-6)
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000)
  if (sec < 5) return "à l'instant"
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}min`
  return `${Math.floor(sec / 3600)}h`
}

async function remove(id) {
  try {
    await posts.deletePost(id)
  } catch (e) {
    publishError.value = e.message
  }
}

function openAuth() {
  router.replace({ path: '/blog', query: { redirect: '/blog' } })
  showAuth.value = true
}

async function publish() {
  if (!draft.value.trim()) return
  publishError.value = null
  publishing.value = true
  try {
    await posts.publish(draft.value)
    draft.value = ''
  } catch (e) {
    publishError.value = e.message
  } finally {
    publishing.value = false
  }
}

onMounted(() => posts.startPolling())
onBeforeUnmount(() => posts.stopPolling())
</script>

<style scoped>
textarea {
  width: 100%;
  font-family: var(--font);
  font-size: 14px;
  padding: 12px;
  border: 2px solid var(--border);
  resize: vertical;
  background: var(--white);
}
textarea:focus { outline: none; box-shadow: var(--shadow-sm); }

.char-count { font-size: 11px; color: var(--muted); font-weight: 700; }
.hint { font-size: 12px; font-weight: 600; }

.polling-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--muted);
  font-weight: 700;
}
.dot { width: 8px; height: 8px; background: var(--orange); border-radius: 50%; display: inline-block; }

.empty { color: var(--muted); font-size: 13px; font-weight: 600; text-align: center; padding: 20px 0; }

.post {
  padding: 12px 14px;
  border: 2px solid var(--border);
  background: var(--alt);
  box-shadow: var(--shadow-sm);
  margin-bottom: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px 10px;
}
.post:last-child { margin-bottom: 0; }

.post-pubkey { font-family: monospace; font-size: 11px; font-weight: 700; color: var(--muted); }
.post-msg { flex: 1 1 100%; font-size: 14px; font-weight: 600; word-break: break-word; }
.post-time { font-size: 11px; color: var(--muted); font-weight: 600; margin-left: auto; }

.post-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  opacity: 0.6;
  transition: opacity 0.08s;
}
.post-delete:hover { opacity: 1; }
</style>

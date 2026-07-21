import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/',         component: () => import('@/pages/Landing.vue')   },
  { path: '/game',     component: () => import('@/pages/Game.vue')      },
  { path: '/blog',     component: () => import('@/pages/Blog.vue')      },
  { path: '/utxos',    component: () => import('@/pages/Utxos.vue'),     meta: { requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/', query: { redirect: to.path } }
  }
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/',         component: () => import('@/pages/Landing.vue')   },
  { path: '/fees',     component: () => import('@/pages/Fees.vue')      },
  { path: '/game',     component: () => import('@/pages/Game.vue')      },
  { path: '/dashboard',component: () => import('@/pages/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/utxos',    component: () => import('@/pages/Utxos.vue'),     meta: { requiresAuth: true } },
  { path: '/stack',    component: () => import('@/pages/Stack.vue'),     meta: { requiresAuth: true } },
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

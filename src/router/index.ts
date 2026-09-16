import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      meta: { requiresAuth: true },
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        { path: 'users', name: 'users', component: () => import('@/views/UsersView.vue') },
        {
          path: 'item-categories',
          name: 'item-categories',
          component: () => import('@/views/ItemCategoriesView.vue'),
        },
        { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
        { path: 'rooms', name: 'rooms', component: () => import('@/views/RoomsView.vue') },
        {
          path: 'room-categories',
          name: 'room-categories',
          component: () => import('@/views/RoomCategoriesView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
})
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !useSessionStore().user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
export default router

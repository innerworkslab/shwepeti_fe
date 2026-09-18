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
        {
          path: 'inventory-ledgers',
          name: 'inventory-ledgers',
          component: () => import('@/views/InventoryLedgersView.vue'),
        },
        { path: 'menus', name: 'menus', component: () => import('@/views/MenusView.vue') },
        {
          path: 'menu-categories',
          name: 'menu-categories',
          component: () => import('@/views/MenuCategoriesView.vue'),
        },
        {
          path: 'inventory-adjustments',
          name: 'inventory-adjustments',
          component: () => import('@/views/AdjustmentsView.vue'),
        },
        {
          path: 'inventory-transfers',
          name: 'inventory-transfers',
          component: () => import('@/views/TransfersView.vue'),
        },
        {
          path: 'stock-ins',
          name: 'stock-ins',
          component: () => import('@/views/StockInsView.vue'),
        },
        {
          path: 'warehouses',
          name: 'warehouses',
          component: () => import('@/views/WarehousesView.vue'),
        },
        { path: 'items', name: 'items', component: () => import('@/views/ItemsView.vue') },
        { path: 'units', name: 'units', component: () => import('@/views/UnitsView.vue') },
        {
          path: 'unit-groups',
          name: 'unit-groups',
          component: () => import('@/views/UnitGroupsView.vue'),
        },
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

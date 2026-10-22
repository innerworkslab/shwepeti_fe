import { createRouter, createWebHistory } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import { usePosSessionStore } from '@/stores/pos-session'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/pos',
      meta: { requiresPosAuth: true },
      component: () => import('@/layouts/PosLayout.vue'),
      children: [
        { path: '', name: 'pos', component: () => import('@/views/PosView.vue') },
        {
          path: 'cashbook-closings',
          name: 'pos-cashbook-closings',
          component: () => import('@/views/CashbookClosingsView.vue'),
          props: { pos: true },
        },
        {
          path: 'cashbook-transfers',
          name: 'pos-cashbook-transfers',
          component: () => import('@/views/CashbookTransfersView.vue'),
          props: { pos: true },
        },
        {
          path: 'cashbook-transactions',
          name: 'pos-cashbook-transactions',
          component: () => import('@/views/PosCashbookTransactionsView.vue'),
        },
        {
          path: 'cashbooks',
          name: 'pos-cashbooks',
          component: () => import('@/views/PosCashbooksView.vue'),
        },
        {
          path: 'bookings',
          name: 'pos-bookings',
          component: () => import('@/views/PosBookingsView.vue'),
        },
        {
          path: 'bookings/create',
          name: 'pos-booking-create',
          component: () => import('@/views/PosBookingFormView.vue'),
        },
        {
          path: 'bookings/:id',
          name: 'pos-booking-detail',
          component: () => import('@/views/PosBookingDetailView.vue'),
        },
      ],
    },
    { path: '/pos/login', name: 'pos-login', component: () => import('@/views/PosLoginView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
      path: '/',
      meta: { requiresAuth: true },
      component: () => import('@/layouts/AdminLayout.vue'),
      children: [
        {
          path: 'fixed-assets',
          name: 'fixed-assets',
          component: () => import('@/views/FixedAssetsView.vue'),
        },
        {
          path: 'fixed-assets/create',
          name: 'fixed-asset-create',
          component: () => import('@/views/FixedAssetFormView.vue'),
        },
        {
          path: 'fixed-assets/:id/depreciations',
          name: 'fixed-asset-depreciations',
          component: () => import('@/views/FixedAssetDepreciationsView.vue'),
        },
        {
          path: 'fixed-assets/:id/edit',
          name: 'fixed-asset-edit',
          component: () => import('@/views/FixedAssetFormView.vue'),
        },
        {
          path: 'asset-categories',
          name: 'asset-categories',
          component: () => import('@/views/AssetCategoriesView.vue'),
        },
        {
          path: 'supplier-ap-balances',
          name: 'supplier-ap-balances',
          component: () => import('@/views/SupplierApBalancesView.vue'),
        },
        {
          path: 'supplier-ap-payments/create',
          name: 'supplier-ap-payment-create',
          component: () => import('@/views/SupplierApPaymentFormView.vue'),
        },
        {
          path: 'suppliers/:id/ap-payments',
          name: 'supplier-ap-payments',
          component: () => import('@/views/SupplierApPaymentsView.vue'),
        },
        {
          path: 'suppliers/:id/ap-ledgers',
          name: 'supplier-ap-ledgers',
          component: () => import('@/views/SupplierApLedgersView.vue'),
        },
        {
          path: 'suppliers',
          name: 'suppliers',
          component: () => import('@/views/SuppliersView.vue'),
        },
        {
          path: 'suppliers/create',
          name: 'supplier-create',
          component: () => import('@/views/SupplierFormView.vue'),
        },
        {
          path: 'suppliers/:id/edit',
          name: 'supplier-edit',
          component: () => import('@/views/SupplierFormView.vue'),
        },
        {
          path: 'cashbook-closings',
          name: 'cashbook-closings',
          component: () => import('@/views/CashbookClosingsView.vue'),
        },
        {
          path: 'cashbook-transfers',
          name: 'cashbook-transfers',
          component: () => import('@/views/CashbookTransfersView.vue'),
        },
        {
          path: 'cashbook-transactions',
          name: 'cashbook-transactions',
          component: () => import('@/views/CashbookTransactionsView.vue'),
        },
        {
          path: 'cashbooks',
          name: 'cashbooks',
          component: () => import('@/views/CashbooksView.vue'),
        },
        {
          path: 'inventory-stock-balances',
          name: 'inventory-stock-balances',
          component: () => import('@/views/StockBalancesView.vue'),
        },
        {
          path: 'inventory-ledgers',
          name: 'inventory-ledgers',
          component: () => import('@/views/InventoryLedgersView.vue'),
        },
        {
          path: 'menus',
          name: 'menus',
          component: () => import('@/views/MenusView.vue'),
          children: [
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'menus' },
            },
            {
              path: ':id/edit',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'menus' },
            },
          ],
        },
        {
          path: 'menu-categories',
          name: 'menu-categories',
          component: () => import('@/views/MenuCategoriesView.vue'),
        },
        {
          path: 'inventory-adjustments',
          name: 'inventory-adjustments',
          component: () => import('@/views/AdjustmentsView.vue'),
          children: [
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'inventory-adjustments' },
            },
          ],
        },
        {
          path: 'inventory-transfers',
          name: 'inventory-transfers',
          component: () => import('@/views/TransfersView.vue'),
          children: [
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'inventory-transfers' },
            },
          ],
        },
        {
          path: 'stock-ins',
          name: 'stock-ins',
          component: () => import('@/views/StockInsView.vue'),
          children: [
            {
              path: ':id',
              name: 'stock-in-detail',
              component: () => import('@/views/StockInDetailView.vue'),
            },
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'stock-ins' },
            },
          ],
        },
        {
          path: 'warehouses',
          name: 'warehouses',
          component: () => import('@/views/WarehousesView.vue'),
        },
        {
          path: 'items',
          name: 'items',
          component: () => import('@/views/ItemsView.vue'),
          children: [
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'items' },
            },
            {
              path: ':id/edit',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'items' },
            },
          ],
        },
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
        {
          path: 'rooms',
          name: 'rooms',
          component: () => import('@/views/RoomsView.vue'),
          children: [
            {
              path: 'create',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'rooms' },
            },
            {
              path: ':id/edit',
              component: () => import('@/views/LargeFormView.vue'),
              props: { resource: 'rooms' },
            },
          ],
        },
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
  if (to.meta.requiresPosAuth && !usePosSessionStore().user)
    return { name: 'pos-login', query: { redirect: to.fullPath } }
  if (to.meta.requiresAuth && !useSessionStore().user) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})
export default router

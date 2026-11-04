<script setup lang="ts">
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()

import ExcelImportButton from '@/components/common/ExcelImportButton.vue'
import { useRoute, useRouter } from 'vue-router'
const route = useRoute()
const router = useRouter()

import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import MenuFormModal from '@/components/menus/MenuFormModal.vue'
import { useDataTable } from '@/composables/useDataTable'
import { menuService } from '@/services/menu.service'
import type { DataTableColumn } from '@/types/data-table'
import type { Menu, MenuFilters } from '@/types/menu'

const columns: DataTableColumn<Menu>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'code', label: 'Code', field: 'code' },
  {
    key: 'category',
    label: 'Category',
    format: (menu) => menu.menu_category?.name ?? `Category #${menu.menu_category_id}`,
  },
  { key: 'price', label: 'Price', field: 'price' },
  {
    key: 'availability',
    label: 'Availability',
    format: (row) =>
      row.is_available === undefined ? '—' : row.is_available ? 'Available' : 'Unavailable',
  },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const {
  rows,
  total,
  page,
  perPage,
  search,
  loading,
  error,
  setPage,
  setPerPage,
  setSearch,
  refresh,
  filters,
  setFilters,
} = useDataTable<Menu, MenuFilters>(menuService.list, { initialFilters: { is_active: 1 } })
const modalOpen = ref(false)
const mode = ref<'edit' | 'status' | 'availability'>('edit')
const selected = ref<Menu | null>(null)
const notice = ref('')
function imported(message: string) {
  notice.value = message
  void refresh()
}

function openForm(
  category: Menu | null = null,
  action: 'edit' | 'status' | 'availability' = 'edit',
) {
  if (action === 'edit') {
    void router.push(category ? `/menus/${category.id}/edit` : '/menus/create')
    return
  }
  mode.value = action
  selected.value = category
  notice.value = ''
  modalOpen.value = true
}
function saved() {
  notice.value =
    mode.value === 'availability'
      ? 'Menu availability updated.'
      : mode.value === 'status'
        ? 'Menu status updated.'
        : selected.value
          ? 'Menu updated.'
          : 'Menu created.'
  modalOpen.value = false
  void refresh()
}
function pageSaved() {
  notice.value = 'Saved successfully.'
  void refresh()
}
</script>

<template>
  <section v-show="route.path.replace(/\/+$/, '') === '/menus'">
    <h1>{{ t('Menus') }}</h1>
    <p>{{ t('Manage menus, recipes, pricing, and availability.') }}</p>
    <p v-if="notice" role="status" class="notice">{{ t(notice) }}</p>
    <DataTable
      :rows="rows"
      :columns="
        columns.filter(
          (column) =>
            column.key !== 'actions' ||
            can(['menus.toggle_active', 'menus.toggle_available', 'menus.update']),
        )
      "
      :row-key="(category: Menu) => category.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      :caption="t('Menus')"
      :search-placeholder="t('Search menus…')"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #filters
        ><label class="active-filter">
          {{ t('Status') }}
          <select
            name="is_active_filter"
            :value="filters.is_active ?? ''"
            @change="
              setFilters({
                is_active:
                  ($event.target as HTMLSelectElement).value === ''
                    ? undefined
                    : Number(($event.target as HTMLSelectElement).value),
              })
            "
          >
            <option value="">{{ t('All') }}</option>
            <option value="1">{{ t('Active') }}</option>
            <option value="0">{{ t('Inactive') }}</option>
          </select></label
        ></template
      >
      <template #toolbar
        ><button v-if="can('menus.create')" type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" /> {{ t('Add menu') }}</button
        ><ExcelImportButton v-if="can('menus.import')" resource="menus" @imported="imported"
      /></template>
      <template #cell-status="{ row }">
        <span class="status" :class="{ active: row.is_active === true }">{{
          row.is_active === undefined ? '—' : row.is_active ? t('Active') : t('Inactive')
        }}</span>
      </template>
      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button
            v-if="can('menus.update')"
            type="button"
            :aria-label="t('Edit {0}', [row.name])"
            @click="openForm(row)"
            :title="t('Edit {0}', [row.name])"
          >
            <AppIcon name="pencil" :size="18" /><span class="action-label"> {{ t('Edit') }} </span>
          </button>
          <button
            v-if="can('menus.toggle_active')"
            type="button"
            :aria-label="t('Update status for {0}', [row.name])"
            :title="t('Update status')"
            class="icon-button"
            @click="openForm(row, 'status')"
          >
            <AppIcon name="status" :size="18" />
          </button>
          <button
            v-if="can('menus.toggle_available')"
            type="button"
            :aria-label="t('Update availability for {0}', [row.name])"
            :title="t('Update availability')"
            class="icon-button"
            @click="openForm(row, 'availability')"
          >
            <AppIcon name="availability" :size="18" />
          </button>
        </div>
      </template>
    </DataTable>
    <MenuFormModal
      v-if="modalOpen"
      :menu-id="selected?.id"
      :mode="mode"
      @close="modalOpen = false"
      @saved="saved"
    />
  </section>
  <RouterView @saved="pageSaved" />
</template>

<style scoped>
.row-actions {
  display: flex;
  align-menus: center;
  justify-content: flex-end;
  gap: 0.5rem;
}
.icon-button {
  display: inline-flex;
  align-menus: center;
  justify-content: center;
}
button {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: inherit;
  background: white;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.primary {
  color: white;
  background: #1d4ed8;
  border-color: #1d4ed8;
}
.notice {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  background: #ecfdf5;
  color: #065f46;
}
.status {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 0.875rem;
}
.status.active {
  color: #065f46;
  background: #ecfdf5;
}
.active-filter {
  display: grid;
  gap: 0.375rem;
}
select {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: inherit;
}
select:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

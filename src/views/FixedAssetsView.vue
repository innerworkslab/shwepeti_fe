<script setup lang="ts">
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()

import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import DataTable from '@/components/common/DataTable.vue'
import FixedAssetStatusModal from '@/components/fixed-assets/FixedAssetStatusModal.vue'
import { useAssetLookups } from '@/composables/useAssetLookups'
import { useDataTable } from '@/composables/useDataTable'
import { fixedAssetService } from '@/services/fixed-asset.service'
import type { FixedAsset, FixedAssetFilters } from '@/types/fixed-asset'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute()
const {
  categories,
  cashbooks,
  loading: optionsLoading,
  error: optionsError,
  load: loadOptions,
} = useAssetLookups()
onMounted(() => {
  void loadOptions()
})
const columns: DataTableColumn<FixedAsset>[] = [
  { key: 'asset_code', label: 'Code', field: 'asset_code' },
  { key: 'name', label: 'Name', field: 'name' },
  {
    key: 'category',
    label: 'Asset category',
    format: (row) =>
      row.asset_category?.name ??
      categories.value.find((c) => c.id === row.asset_category_id)?.name ??
      `#${row.asset_category_id}`,
  },
  {
    key: 'cashbook',
    label: 'Cashbook',
    format: (row) =>
      row.cashbook?.name ??
      cashbooks.value.find((c) => c.id === row.cashbook_id)?.name ??
      `#${row.cashbook_id}`,
  },
  { key: 'serial_number', label: 'Serial number', field: 'serial_number' },
  { key: 'purchase_date', label: 'Purchase date', field: 'purchase_date' },
  { key: 'purchase_amount', label: 'Purchase amount', field: 'purchase_amount', align: 'right' },
  { key: 'location', label: 'Location', field: 'location' },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'actions', label: 'Actions', align: 'right' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<FixedAsset, FixedAssetFilters>(({ search: _search, ...params }, signal) =>
    fixedAssetService.list(params, signal),
  )
const filters = reactive({
  asset_category_id: '' as number | '',
  cashbook_id: '' as number | '',
  date_from: '',
  date_to: '',
})
const filterError = ref('')
function applyFilters() {
  filterError.value = ''
  if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
    filterError.value = 'From date must be on or before the to date.'
    return
  }
  setFilters({
    asset_category_id: filters.asset_category_id || undefined,
    cashbook_id: filters.cashbook_id || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  })
}
function clearFilters() {
  Object.assign(filters, { asset_category_id: '', cashbook_id: '', date_from: '', date_to: '' })
  applyFilters()
}
const selected = ref<FixedAsset | null>(null)
const notice = ref('')
function saved() {
  selected.value = null
  notice.value = 'Asset status updated.'
  void refresh()
}
</script>
<template>
  <section>
    <h1>{{ t('Fixed Assets') }}</h1>
    <p>{{ t('Manage assets, purchase details, and supporting documents.') }}</p>
    <p v-if="notice" role="status">{{ t(notice) }}</p>
    <p v-else-if="route.query.saved === 'created' || route.query.saved === 'updated'" role="status">
      {{ t('Asset') }} {{ route.query.saved }}.
    </p>
    <DataTable
      :rows="rows"
      :columns="
        columns.filter(
          (column) =>
            column.key !== 'actions' ||
            can(['fixed_assets.update', 'fixed_assets.update_status', 'fixed_assets.view']),
        )
      "
      :row-key="(row: FixedAsset) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      :caption="t('Fixed assets')"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    >
      <template #toolbar
        ><RouterLink
          v-if="can('fixed_assets.create')"
          class="action primary"
          to="/fixed-assets/create"
          ><AppIcon name="add" :size="16" /> {{ t('Add fixed asset') }}
        </RouterLink></template
      >
      <template #filters
        ><form class="filters" @submit.prevent="applyFilters">
          <label for="filter-category">
            {{ t('Asset category') }}
            <select
              id="filter-category"
              name="asset_category_id"
              v-model="filters.asset_category_id"
              :disabled="optionsLoading || !!optionsError"
            >
              <option value="">{{ t('All categories') }}</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select></label
          >
          <label for="filter-cashbook">
            {{ t('Cashbook') }}
            <select
              id="filter-cashbook"
              name="cashbook_id"
              v-model="filters.cashbook_id"
              :disabled="optionsLoading || !!optionsError"
            >
              <option value="">{{ t('All cashbooks') }}</option>
              <option v-for="cashbook in cashbooks" :key="cashbook.id" :value="cashbook.id">
                {{ cashbook.name }}
              </option>
            </select></label
          >
          <label for="filter-from">
            {{ t('From date') }}
            <input
              id="filter-from"
              name="date_from"
              type="date"
              v-model="filters.date_from"
              :aria-invalid="!!filterError"
              :aria-describedby="filterError ? 'filter-error' : undefined"
          /></label>
          <label for="filter-to">
            {{ t('To date') }}
            <input
              id="filter-to"
              name="date_to"
              type="date"
              v-model="filters.date_to"
              :aria-invalid="!!filterError"
              :aria-describedby="filterError ? 'filter-error' : undefined"
          /></label>
          <button type="submit">{{ t('Apply filters') }}</button
          ><button type="button" @click="clearFilters">{{ t('Clear filters') }}</button>
          <p v-if="filterError" id="filter-error" role="alert" class="error">
            {{ t(filterError) }}
          </p>
          <p v-if="optionsLoading" role="status">{{ t('Loading filter options...') }}</p>
          <div v-if="optionsError" role="alert">
            {{ t(optionsError) }}
            <button type="button" @click="loadOptions">{{ t('Retry options') }}</button>
          </div>
        </form></template
      >
      <template #cell-actions="{ row }"
        ><div class="actions">
          <RouterLink
            v-if="can('fixed_assets.update')"
            class="action"
            :to="`/fixed-assets/${row.id}/edit`"
            :aria-label="t('Edit {0}', [row.name])"
            :title="t('Edit {0}', [row.name])"
            ><AppIcon name="pencil" :size="18" /><span class="action-label">
              {{ t('Edit') }}
            </span></RouterLink
          ><button
            v-if="can('fixed_assets.update_status')"
            type="button"
            :aria-label="t('Update status for {0}', [row.name])"
            @click="selected = row"
            :title="t('Update status for {0}', [row.name])"
          >
            <AppIcon name="status" />
          </button>
          <RouterLink
            v-if="can('fixed_assets.view')"
            class="action"
            :to="`/fixed-assets/${row.id}/depreciations`"
            :aria-label="t('View depreciation history for {0}', [row.name])"
            :title="t('View depreciation history for {0}', [row.name])"
            ><AppIcon name="ledger" :size="18" /><span class="action-label">
              {{ t('Depreciation history') }}
            </span></RouterLink
          >
        </div></template
      >
    </DataTable>
    <FixedAssetStatusModal
      v-if="selected"
      :asset-id="selected.id"
      @close="selected = null"
      @saved="saved"
    />
  </section>
</template>
<style scoped>
.filters,
.actions {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.actions {
  justify-content: flex-end;
}
label {
  display: grid;
  gap: 0.4rem;
}
input,
select,
button,
.action {
  font: inherit;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
  color: inherit;
}
button,
.action {
  cursor: pointer;
  text-decoration: none;
}
.primary {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: white;
}
.error {
  color: #b91c1c;
}
:is(input, select, button, .action):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

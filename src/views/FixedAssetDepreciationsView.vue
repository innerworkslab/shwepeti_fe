<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { fixedAssetService } from '@/services/fixed-asset.service'
import type { FixedAssetDepreciation } from '@/types/fixed-asset'
import type { DataTableColumn } from '@/types/data-table'
const route = useRoute()
const assetId = computed(() => Number(route.params.id))
const columns: DataTableColumn<FixedAssetDepreciation>[] = [
  { key: 'id', label: 'ID', field: 'id' },
  { key: 'fixed_asset_id', label: 'Asset ID', field: 'fixed_asset_id' },
  { key: 'period', label: 'Period', field: 'period' },
  { key: 'amount', label: 'Depreciation amount', field: 'amount', align: 'right' },
  {
    key: 'opening_book_value',
    label: 'Opening book value',
    field: 'opening_book_value',
    align: 'right',
  },
  {
    key: 'closing_book_value',
    label: 'Closing book value',
    field: 'closing_book_value',
    align: 'right',
  },
  { key: 'created_at', label: 'Created at', field: 'created_at' },
]
const { rows, total, page, perPage, loading, error, setPage, setPerPage, setFilters, refresh } =
  useDataTable<FixedAssetDepreciation, { asset_id: number }>(
    ({ search: _search, asset_id, ...params }, signal) =>
      fixedAssetService.depreciations(asset_id, params, signal),
    { initialFilters: { asset_id: assetId.value } },
  )
watch(assetId, (id) => setFilters({ asset_id: id }))
</script>
<template>
  <section>
    <RouterLink to="/fixed-assets">Back to fixed assets</RouterLink>
    <h1>Depreciation History</h1>
    <p>Fixed asset #{{ route.params.id }} · Depreciation by period and remaining book value.</p>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row: FixedAssetDepreciation) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :loading="loading"
      :error="error"
      :searchable="false"
      caption="Fixed asset depreciation history"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @refresh="refresh"
    />
  </section>
</template>

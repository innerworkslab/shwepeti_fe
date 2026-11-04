<script setup lang="ts">
import { t } from '@/i18n'
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { stockInService } from '@/services/stock-in.service'
import { toApiError } from '@/services/api/api-error'
import type { StockIn } from '@/types/stock-in'
const route = useRoute()
const record = ref<StockIn | null>(null)
const loading = ref(false)
const error = ref('')
let controller: AbortController | undefined
async function load() {
  controller?.abort()
  controller = new AbortController()
  const active = controller
  record.value = null
  loading.value = true
  error.value = ''
  try {
    const result = await stockInService.get(Number(route.params.id), active.signal)
    if (!active.signal.aborted) record.value = result
  } catch (e) {
    if (!active.signal.aborted) error.value = toApiError(e).message
  } finally {
    if (!active.signal.aborted) loading.value = false
  }
}
watch(() => route.params.id, load, { immediate: true })
onBeforeUnmount(() => controller?.abort())
</script>
<template>
  <section class="detail-page">
    <RouterLink to="/stock-ins"> {{ t('Back to Stock In') }} </RouterLink>
    <h1>{{ t('Stock In Details') }}</h1>
    <p v-if="loading" role="status">{{ t('Loading stock in…') }}</p>
    <p v-else-if="error" role="alert">
      {{ t(error) }} <button @click="load">{{ t('Retry') }}</button>
    </p>
    <template v-else-if="record">
      <header>
        <h2>{{ record.reference_no ?? t('Stock in #{0}', [record.id]) }}</h2>
        <span class="status">{{ t(record.status ?? '—') }}</span>
      </header>
      <dl class="totals">
        <div>
          <dt>{{ t('Total amount') }}</dt>
          <dd>{{ record.total_amount ?? '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('Paid amount') }}</dt>
          <dd>{{ record.paid_amount ?? '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('Payable amount') }}</dt>
          <dd>{{ record.payable_amount ?? '—' }}</dd>
        </div>
      </dl>
      <div class="cards">
        <article>
          <h3>{{ t('Warehouse') }}</h3>
          <p>{{ record.warehouse?.name ?? t('Warehouse #{0}', [record.warehouse_id]) }}</p>
          <p>{{ record.warehouse?.code }}</p>
        </article>
        <article>
          <h3>{{ t('Supplier') }}</h3>
          <p>{{ record.supplier?.name ?? '—' }} {{ record.supplier?.supplier_code }}</p>
          <p>{{ record.supplier?.phone_number }} {{ record.supplier?.email }}</p>
          <p>{{ record.supplier?.address }}</p>
        </article>
        <article>
          <h3>{{ t('Cashbook') }}</h3>
          <p>{{ record.cashbook?.name ?? '—' }} {{ record.cashbook?.code }}</p>
          <dl>
            <dt>{{ t('Type') }}</dt>
            <dd>{{ t(record.cashbook?.type ?? '—') }}</dd>
            <dt>{{ t('Opening balance') }}</dt>
            <dd>{{ record.cashbook?.opening_balance ?? '—' }}</dd>
            <dt>{{ t('Current balance') }}</dt>
            <dd>{{ record.cashbook?.current_balance ?? '—' }}</dd>
          </dl>
        </article>
      </div>
      <dl class="metadata">
        <div>
          <dt>{{ t('Transaction date') }}</dt>
          <dd>{{ record.transaction_date }}</dd>
        </div>
        <div>
          <dt>{{ t('Created by') }}</dt>
          <dd>
            {{ record.creator?.name ?? record.created_by ?? '—' }} {{ record.creator?.email }}
          </dd>
        </div>
        <div>
          <dt>{{ t('Created at') }}</dt>
          <dd>{{ record.created_at ?? '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('Updated at') }}</dt>
          <dd>{{ record.updated_at ?? '—' }}</dd>
        </div>
        <div>
          <dt>{{ t('Remark') }}</dt>
          <dd>{{ record.remark ?? '—' }}</dd>
        </div>
      </dl>
      <h2>{{ t('Items') }}</h2>
      <div class="items-table">
        <table>
          <caption>
            {{
              t('Stock in items')
            }}
          </caption>
          <thead>
            <tr>
              <th>{{ t('Item') }}</th>
              <th>{{ t('Code / SKU') }}</th>
              <th>{{ t('Unit') }}</th>
              <th>{{ t('Quantity') }}</th>
              <th>{{ t('Base quantity') }}</th>
              <th>{{ t('Unit cost') }}</th>
              <th>{{ t('Total cost') }}</th>
              <th>{{ t('Batch') }}</th>
              <th>{{ t('Expiry date') }}</th>
              <th>{{ t('Remark') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in record.items" :key="line.id ?? index">
              <td>{{ line.item?.name ?? t('Item #{0}', [line.item_id]) }}</td>
              <td>
                {{ line.item?.code ?? '—' }}<small>{{ line.item?.sku }}</small>
              </td>
              <td>{{ line.unit?.name ?? t('Unit #{0}', [line.unit_id]) }}</td>
              <td>{{ line.quantity }}</td>
              <td>{{ line.base_quantity ?? '—' }}</td>
              <td>{{ line.unit_cost }}</td>
              <td>{{ line.total_cost ?? '—' }}</td>
              <td>{{ line.batch_no ?? '—' }}</td>
              <td>{{ line.expiry_date ?? '—' }}</td>
              <td>{{ line.remark ?? '—' }}</td>
            </tr>
            <tr v-if="!record.items?.length">
              <td colspan="10">{{ t('No items found.') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
<style scoped>
.detail-page {
  color: #263b51;
}
header {
  display: flex;
  align-items: center;
  gap: 16px;
}
.status {
  padding: 6px 12px;
  background: #e0f2fe;
  border-radius: 20px;
}
.totals,
.cards,
.metadata {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
.totals > div,
article,
.metadata > div {
  padding: 18px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}
dt {
  color: #64748b;
  font-size: 14px;
}
dd {
  margin: 6px 0 12px;
  overflow-wrap: anywhere;
}
.totals dd {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
h3 {
  margin-top: 0;
}
.items-table {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
th,
td {
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}
caption {
  text-align: left;
  padding: 12px;
}
small {
  display: block;
  color: #64748b;
}
[role='alert'] {
  color: #b91c1c;
}
</style>

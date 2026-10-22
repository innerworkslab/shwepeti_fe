<script setup lang="ts">
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
    <RouterLink to="/stock-ins">Back to Stock In</RouterLink>
    <h1>Stock In Details</h1>
    <p v-if="loading" role="status">Loading stock in…</p>
    <p v-else-if="error" role="alert">{{ error }} <button @click="load">Retry</button></p>
    <template v-else-if="record">
      <header>
        <h2>{{ record.reference_no ?? `Stock in #${record.id}` }}</h2>
        <span class="status">{{ record.status ?? '—' }}</span>
      </header>
      <dl class="totals">
        <div>
          <dt>Total amount</dt>
          <dd>{{ record.total_amount ?? '—' }}</dd>
        </div>
        <div>
          <dt>Paid amount</dt>
          <dd>{{ record.paid_amount ?? '—' }}</dd>
        </div>
        <div>
          <dt>Payable amount</dt>
          <dd>{{ record.payable_amount ?? '—' }}</dd>
        </div>
      </dl>
      <div class="cards">
        <article>
          <h3>Warehouse</h3>
          <p>{{ record.warehouse?.name ?? `Warehouse #${record.warehouse_id}` }}</p>
          <p>{{ record.warehouse?.code }}</p>
        </article>
        <article>
          <h3>Supplier</h3>
          <p>{{ record.supplier?.name ?? '—' }} {{ record.supplier?.supplier_code }}</p>
          <p>{{ record.supplier?.phone_number }} {{ record.supplier?.email }}</p>
          <p>{{ record.supplier?.address }}</p>
        </article>
        <article>
          <h3>Cashbook</h3>
          <p>{{ record.cashbook?.name ?? '—' }} {{ record.cashbook?.code }}</p>
          <dl>
            <dt>Type</dt>
            <dd>{{ record.cashbook?.type ?? '—' }}</dd>
            <dt>Opening balance</dt>
            <dd>{{ record.cashbook?.opening_balance ?? '—' }}</dd>
            <dt>Current balance</dt>
            <dd>{{ record.cashbook?.current_balance ?? '—' }}</dd>
          </dl>
        </article>
      </div>
      <dl class="metadata">
        <div>
          <dt>Transaction date</dt>
          <dd>{{ record.transaction_date }}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd>
            {{ record.creator?.name ?? record.created_by ?? '—' }} {{ record.creator?.email }}
          </dd>
        </div>
        <div>
          <dt>Created at</dt>
          <dd>{{ record.created_at ?? '—' }}</dd>
        </div>
        <div>
          <dt>Updated at</dt>
          <dd>{{ record.updated_at ?? '—' }}</dd>
        </div>
        <div>
          <dt>Remark</dt>
          <dd>{{ record.remark ?? '—' }}</dd>
        </div>
      </dl>
      <h2>Items</h2>
      <div class="items-table">
        <table>
          <caption>
            Stock in items
          </caption>
          <thead>
            <tr>
              <th>Item</th>
              <th>Code / SKU</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Base quantity</th>
              <th>Unit cost</th>
              <th>Total cost</th>
              <th>Batch</th>
              <th>Expiry date</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in record.items" :key="line.id ?? index">
              <td>{{ line.item?.name ?? `Item #${line.item_id}` }}</td>
              <td>
                {{ line.item?.code ?? '—' }}<small>{{ line.item?.sku }}</small>
              </td>
              <td>{{ line.unit?.name ?? `Unit #${line.unit_id}` }}</td>
              <td>{{ line.quantity }}</td>
              <td>{{ line.base_quantity ?? '—' }}</td>
              <td>{{ line.unit_cost }}</td>
              <td>{{ line.total_cost ?? '—' }}</td>
              <td>{{ line.batch_no ?? '—' }}</td>
              <td>{{ line.expiry_date ?? '—' }}</td>
              <td>{{ line.remark ?? '—' }}</td>
            </tr>
            <tr v-if="!record.items?.length">
              <td colspan="10">No items found.</td>
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

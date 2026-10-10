<script setup lang="ts">
import { RouterLink } from 'vue-router'
import DataTable from '@/components/common/DataTable.vue'
import { useDataTable } from '@/composables/useDataTable'
import { posBookingService } from '@/services/pos-booking.service'
import { statusLabel, statusStyle } from '@/constants/hotel-status'
import type { PosBookingDetail } from '@/types/pos-booking'
import type { DataTableColumn } from '@/types/data-table'
const columns: DataTableColumn<PosBookingDetail>[] = [
  { key: 'booking_no', label: 'Booking', field: 'booking_no' },
  { key: 'guest_name', label: 'Guest', field: 'guest_name' },
  { key: 'room', label: 'Room', format: (row) => row.room?.name || `Room #${row.room_id}` },
  { key: 'booking_type', label: 'Type', format: (row) => statusLabel(row.booking_type) },
  { key: 'status', label: 'Status', field: 'status' },
  { key: 'expected_check_in_at', label: 'Expected check-in', field: 'expected_check_in_at' },
  { key: 'expected_check_out_at', label: 'Expected check-out', field: 'expected_check_out_at' },
  { key: 'total_amount', label: 'Total', field: 'total_amount' },
  { key: 'paid_amount', label: 'Paid', field: 'paid_amount' },
  { key: 'balance_amount', label: 'Balance', field: 'balance_amount' },
]
// The POS endpoint returns the complete collection with meta: []; paginate and search locally.
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
} = useDataTable<PosBookingDetail>(async (params, options) => {
  const all = await posBookingService.list(options)
  const filtered = all.filter((row) =>
    `${row.booking_no} ${row.guest_name} ${row.room?.name || ''}`
      .toLowerCase()
      .includes(params.search.toLowerCase()),
  )
  return {
    data: filtered.slice((params.page - 1) * params.perPage, params.page * params.perPage),
    total: filtered.length,
    page: params.page,
    perPage: params.perPage,
  }
})
</script>
<template>
  <main class="bookings-page">
    <header>
      <div>
        <h1>Bookings</h1>
        <p>View stays, payment balances, and booking details.</p>
      </div>
      <RouterLink class="create" to="/pos/bookings/create">Create booking</RouterLink>
    </header>
    <DataTable
      :rows="rows"
      :columns="columns"
      :row-key="(row) => row.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      caption="Bookings"
      search-placeholder="Search booking, guest or room"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #cell-booking_no="{ row }"
        ><RouterLink :to="`/pos/bookings/${row.id}`">{{ row.booking_no }}</RouterLink></template
      >
      <template #cell-status="{ row }"
        ><span class="badge" :style="statusStyle(row.status)">{{
          statusLabel(row.status)
        }}</span></template
      >
    </DataTable>
  </main>
</template>
<style scoped>
.bookings-page {
  padding: 28px;
  min-height: calc(100dvh - 60px);
  background: #f4f7fa;
  color: #263b51;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}
h1 {
  margin: 0;
  font-size: 26px;
}
p {
  color: #64748b;
}
a {
  color: #036985;
}
.create {
  padding: 12px 16px;
  border-radius: 8px;
  background: #089ec4;
  color: white;
  text-decoration: none;
}
.badge {
  padding: 5px 9px;
  border-radius: 18px;
  white-space: nowrap;
  font-size: 12px;
}
@media (max-width: 600px) {
  header {
    align-items: start;
    flex-direction: column;
  }
  .bookings-page {
    padding: 16px;
  }
}
</style>

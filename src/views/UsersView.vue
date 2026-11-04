<script setup lang="ts">
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()

import AppIcon from '@/components/common/AppIcon.vue'
import { ref } from 'vue'
import DataTable from '@/components/common/DataTable.vue'
import { useRouter } from 'vue-router'
const router = useRouter()
import { useDataTable } from '@/composables/useDataTable'
import { userService } from '@/services/user.service'
import type { User } from '@/types/user'
import type { DataTableColumn } from '@/types/data-table'

const columns: DataTableColumn<User>[] = [
  { key: 'name', label: 'Name', field: 'name' },
  { key: 'email', label: 'Email', field: 'email' },
  { key: 'role', label: 'Role', field: 'role' },
  { key: 'portal_access', label: 'Portal access', field: 'portal_access' },
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
} = useDataTable(userService.list)
const notice = ref('')
function openForm(id: number | null = null) {
  void router.push(id == null ? '/users/create' : `/users/${id}/edit`)
}
</script>

<template>
  <section>
    <h1>{{ t('Users') }}</h1>
    <p>{{ t('Manage user accounts and roles.') }}</p>
    <p v-if="notice" role="status" class="notice">{{ t(notice) }}</p>
    <DataTable
      :rows="rows"
      :columns="columns.filter((column) => column.key !== 'actions' || can(['users.update']))"
      :row-key="(user: User) => user.id"
      :total="total"
      :page="page"
      :per-page="perPage"
      :search="search"
      :loading="loading"
      :error="error"
      :caption="t('Users')"
      :search-placeholder="t('Search users...')"
      @update:page="setPage"
      @update:per-page="setPerPage"
      @update:search="setSearch"
      @refresh="refresh"
    >
      <template #toolbar
        ><button v-if="can('users.create')" type="button" class="primary" @click="openForm()">
          <AppIcon name="add" :size="16" /> {{ t('Add user') }}
        </button></template
      >
      <template #cell-actions="{ row }"
        ><button
          v-if="can('users.update')"
          type="button"
          :aria-label="t('Edit {0}', [row.name])"
          @click="openForm(row.id)"
          :title="t('Edit {0}', [row.name])"
        >
          <AppIcon name="pencil" :size="18" /><span class="action-label"> {{ t('Edit') }} </span>
        </button></template
      >
    </DataTable>
  </section>
</template>

<style scoped>
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
</style>

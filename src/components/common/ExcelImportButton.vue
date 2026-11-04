<script setup lang="ts">
import { t } from '@/i18n'
import { ref, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import AppIcon from './AppIcon.vue'
import { importExcel, type ImportResource } from '@/services/excel-import.service'
import { toApiError } from '@/services/api/api-error'
const props = defineProps<{ resource: ImportResource }>()
const emit = defineEmits<{ imported: [message: string] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const file = ref<File | null>(null)
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')
let disposed = false
function open() {
  file.value = null
  error.value = ''
  if (input.value) input.value.value = ''
  dialog.value?.showModal()
}
function close() {
  if (!busy.value) dialog.value?.close()
}
function select(event: Event) {
  file.value = (event.target as HTMLInputElement).files?.[0] ?? null
  error.value = ''
}
async function submit() {
  if (busy.value) return
  error.value = ''
  if (!file.value || !/\.(xlsx|xls)$/i.test(file.value.name) || file.value.size === 0) {
    error.value = 'Choose a non-empty Excel file (.xlsx or .xls).'
    return
  }
  busy.value = true
  try {
    const message = await importExcel(props.resource, file.value)
    if (!disposed) {
      dialog.value?.close()
      emit('imported', message)
    }
  } catch (cause) {
    if (!disposed) {
      const apiError = toApiError(cause)
      const details = apiError.details as { errors?: Record<string, unknown> } | undefined
      const messages = Object.values(details?.errors ?? {})
        .flat()
        .filter((v) => typeof v === 'string')
      error.value = [apiError.message, ...messages].join(' ')
    }
  } finally {
    if (!disposed) busy.value = false
  }
}
onBeforeRouteLeave(() => !busy.value)
onBeforeUnmount(() => {
  disposed = true
  dialog.value?.close()
})
</script>
<template>
  <button type="button" class="import-button" @click="open">
    <AppIcon name="upload" :size="16" /> {{ t('Import Excel') }}
  </button>
  <Teleport to="body"
    ><dialog
      ref="dialog"
      class="import-dialog"
      aria-labelledby="excel-import-title"
      @cancel.prevent="close"
    >
      <header>
        <h2 id="excel-import-title">{{ t('Import') }} {{ t(resource) }}</h2>
        <button type="button" :aria-label="t('Close import')" :disabled="busy" @click="close">
          <AppIcon name="close" :size="18" />
        </button>
      </header>
      <p>
        {{
          t(
            'Choose an Excel workbook using the import template columns. Repeated rows can include additional',
          )
        }}
        {{ resource === 'items' ? t('Unit conversions') : t('Recipe ingredients') }}.
      </p>
      <form @submit.prevent="submit">
        <label>
          {{ t('Excel file') }}
          <input
            ref="input"
            name="file"
            type="file"
            accept=".xlsx,.xls"
            :disabled="busy"
            @change="select"
        /></label>
        <p v-if="error" role="alert">{{ t(error) }}</p>
        <p v-if="busy" role="status">{{ t('Importing… Please keep this page open.') }}</p>
        <footer>
          <button type="button" :disabled="busy" @click="close">{{ t('Cancel') }}</button
          ><button type="submit" :disabled="busy || !file">
            {{ busy ? t('Importing…') : t('Import file') }}
          </button>
        </footer>
      </form>
    </dialog></Teleport
  >
</template>
<style scoped>
button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  padding: 8px 12px;
  background: white;
  color: #263b51;
  cursor: pointer;
  font: inherit;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
.import-dialog {
  width: min(520px, 90vw);
  border: 0;
  border-radius: 12px;
  padding: 24px;
  color: #263b51;
}
.import-dialog::backdrop {
  background: #172d4766;
}
header,
footer {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
footer {
  margin-top: 20px;
  justify-content: flex-end;
}
label {
  display: grid;
  gap: 10px;
}
[role='alert'] {
  color: #b91c1c;
}
p {
  line-height: 1.5;
}
</style>

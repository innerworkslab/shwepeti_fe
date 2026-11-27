<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { t } from '@/i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import { exportCashbook } from '@/services/cashbook-export.service'
const props = defineProps<{
  pos?: boolean
  cashbookId?: number
  kind: 'transactions' | 'closings'
  dateFrom: string
  dateTo: string
}>()
const busy = ref(false)
const error = ref('')
let controller: AbortController | undefined
onBeforeUnmount(() => controller?.abort())
async function download() {
  if (busy.value) return
  error.value = ''
  if (!props.cashbookId) {
    error.value = 'Choose a cashbook from the sidebar.'
    return
  }
  if (!props.dateFrom || !props.dateTo) {
    error.value = 'Choose both dates.'
    return
  }
  if (props.dateFrom > props.dateTo) {
    error.value = 'From date must be on or before to date.'
    return
  }
  busy.value = true
  controller = new AbortController()
  const signal = controller.signal
  try {
    const { blob, filename } = await exportCashbook(
      props.cashbookId,
      props.kind,
      { date_from: props.dateFrom, date_to: props.dateTo },
      signal,
      props.pos,
    )
    if (signal.aborted) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    if (!signal.aborted) error.value = 'Could not export report. Please try again.'
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="cashbook-export">
    <button type="button" :disabled="busy" :aria-busy="busy" @click="download">
      <AppIcon name="download" :size="18" /> {{ busy ? t('Exporting Excel…') : t('Export Excel') }}
    </button>
    <p v-if="error" role="alert">{{ t(error) }}</p>
  </div>
</template>
<style scoped>
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #16704a;
  border-radius: 7px;
  background: #16704a;
  color: white;
  font: inherit;
  cursor: pointer;
}
button:disabled {
  opacity: 0.65;
  cursor: wait;
}
p {
  color: #b91c1c;
  margin: 8px 0 0;
}
</style>

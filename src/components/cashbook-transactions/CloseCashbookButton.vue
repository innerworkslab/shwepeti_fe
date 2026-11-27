<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { t } from '@/i18n'
import AppIcon from '@/components/common/AppIcon.vue'
import { cashbookClosings } from '@/services/cashbook-closing.service'
import { toApiError } from '@/services/api/api-error'
const props = defineProps<{ cashbookId: number; pos?: boolean }>()
const emit = defineEmits<{ saved: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const selectedId = ref(0),
  remark = ref('Daily Closing'),
  busy = ref(false),
  error = ref('')
function open() {
  selectedId.value = props.cashbookId
  remark.value = 'Daily Closing'
  error.value = ''
  dialog.value?.showModal()
}
function close() {
  if (!busy.value) dialog.value?.close()
}
async function save() {
  if (busy.value || !Number.isSafeInteger(selectedId.value) || selectedId.value <= 0) return
  busy.value = true
  error.value = ''
  try {
    await cashbookClosings(props.pos ?? false).close({
      cashbook_id: selectedId.value,
      remark: remark.value.trim(),
    })
    dialog.value?.close()
    emit('saved')
  } catch (cause) {
    error.value = toApiError(cause).message
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => dialog.value?.close())
</script>
<template>
  <button type="button" class="primary" @click="open">
    <AppIcon name="add" :size="16" />{{ t('Close cashbook') }}
  </button>
  <dialog ref="dialog" :aria-label="t('Close cashbook')" @cancel.prevent="close">
    <h2>{{ t('Close cashbook') }}</h2>
    <p>{{ t('Cashbook #{0}', [selectedId]) }}</p>
    <form @submit.prevent="save">
      <label>{{ t('Remark') }}<textarea v-model="remark" :disabled="busy" /></label>
      <p v-if="error" role="alert">{{ t(error) }}</p>
      <footer>
        <button type="button" :disabled="busy" @click="close">{{ t('Cancel') }}</button
        ><button type="submit" :disabled="busy" class="primary">
          {{ busy ? t('Saving…') : t('Save closing') }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
<style scoped>
button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  font: inherit;
  cursor: pointer;
}
.primary {
  background: #183249;
  color: white;
}
dialog {
  width: min(480px, 90vw);
  border: 0;
  border-radius: 12px;
  padding: 24px;
}
dialog::backdrop {
  background: #172d4766;
}
label {
  display: grid;
  gap: 8px;
}
textarea {
  font: inherit;
  padding: 10px;
  min-height: 90px;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
}
[role='alert'] {
  color: #b91c1c;
}
</style>

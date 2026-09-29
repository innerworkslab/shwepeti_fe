<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { fixedAssetService } from '@/services/fixed-asset.service'
import { fixedAssetStatusSchema } from '@/schemas/fixed-asset.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{ assetId: number }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({ name: '', status: '' })
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null

async function load() {
  if (disposed || (loading.value && controller)) return
  controller = new AbortController()
  const active = controller
  loading.value = true
  loadError.value = ''
  try {
    if (props.assetId != null) {
      const group = await fixedAssetService.get(props.assetId, active.signal)
      if (disposed || active.signal.aborted) return
      if (group.id !== props.assetId)
        throw new Error('The API returned a different asset. Please retry.')
      form.name = group.name
      form.status = ['posted', 'cancelled'].includes(group.status ?? '') ? group.status! : ''
    }
  } catch (cause) {
    if (!disposed) {
      loadError.value = toApiError(cause).message
      active.abort()
    }
  } finally {
    if (!disposed) {
      loading.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('input, select')?.focus()
    }
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  dialog.value?.close()
  previousFocus?.focus()
})
function close() {
  if (!saving.value) emit('close')
}
async function submit() {
  if (saving.value || loading.value || loadError.value || disposed) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    if (props.assetId == null) throw new Error('Choose an asset.')
    const payload = await fixedAssetStatusSchema.validate(
      { status: form.status },
      { abortEarly: false, stripUnknown: true },
    )
    if (disposed) return
    await fixedAssetService.updateStatus(props.assetId, payload)
    if (!disposed) emit('saved')
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner)
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
    } else saveError.value = toApiError(cause).message
  } finally {
    if (!disposed) {
      saving.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="asset-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">Update asset status</h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading asset...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else>
        <p>{{ form.name }} (ID {{ assetId }})</p>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <fieldset :disabled="saving">
          <label :for="`${prefix}-status`">Status</label
          ><select
            :id="`${prefix}-status`"
            name="status"
            v-model="form.status"
            :aria-invalid="!!errors.status"
            :aria-describedby="errors.status ? `${prefix}-error` : undefined"
          >
            <option value="" disabled>Choose status</option>
            <option value="posted">Posted</option>
            <option value="cancelled">Cancelled</option></select
          ><span v-if="errors.status" :id="`${prefix}-error`" class="error">{{
            errors.status
          }}</span>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{ saving ? 'Saving...' : 'Update status' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.asset-modal {
  width: min(480px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.asset-modal::backdrop {
  background: #0f172a80;
}
header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
h2 {
  margin: 0;
  font-size: 1.25rem;
}
h3 {
  margin: 0;
  font-size: 1rem;
}
fieldset {
  border: 0;
  padding: 0;
  margin: 1.5rem 0;
  min-width: 0;
  display: grid;
  gap: 1rem;
}
.field {
  display: grid;
  align-content: start;
  gap: 0.4rem;
  min-width: 0;
}
label {
  font-size: 0.875rem;
  font-weight: 600;
}
textarea,
input,
select,
button {
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  color: inherit;
  background: white;
}
textarea,
input,
select {
  width: 100%;
  min-width: 0;
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.primary {
  background: #1d4ed8;
  color: white;
  border-color: #1d4ed8;
}
footer {
  justify-content: flex-end;
  flex-wrap: wrap;
}
.error {
  font-size: 0.875rem;
  color: #b91c1c;
}
small {
  color: #64748b;
}
[aria-invalid='true'] {
  border-color: #b91c1c;
}
:is(input, select, textarea, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
textarea {
  resize: vertical;
}
</style>

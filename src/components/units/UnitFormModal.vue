<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { unitGroupService } from '@/services/unit-group.service'
import type { UnitGroup } from '@/types/unit-group'
import { unitService } from '@/services/unit.service'
import { createUnitSchema, updateUnitSchema, unitStatusSchema } from '@/schemas/unit.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{ unitId?: number | null; statusOnly?: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.unitId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({
  name: '',
  symbol: '',
  unit_group_id: '' as number | string,
  is_base: false,
  is_active: undefined as boolean | undefined,
})
const groups = ref<UnitGroup[]>([])
const missingGroup = computed(
  () =>
    editing.value &&
    form.unit_group_id !== '' &&
    !groups.value.some((group) => group.id === form.unit_group_id),
)
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
    const [options, unit] = await Promise.all([
      props.statusOnly ? Promise.resolve([]) : unitGroupService.listOptions(active.signal),
      props.unitId != null ? unitService.get(props.unitId, active.signal) : Promise.resolve(null),
    ])
    if (disposed || active.signal.aborted) return
    groups.value = options
    if (unit) {
      if (unit.id !== props.unitId)
        throw new Error('The API returned a different unit. Please retry.')
      form.name = unit.name
      form.is_active = unit.is_active
      form.symbol = unit.symbol
      form.unit_group_id = unit.unit_group_id
      form.is_base = unit.is_base
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
    if (props.statusOnly) {
      if (props.unitId == null) throw new Error('Select a unit to update its status.')
      const payload = await unitStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await unitService.toggleActive(props.unitId, payload)
    } else {
      const input = {
        name: form.name,
        symbol: form.symbol,
        unit_group_id: form.unit_group_id,
        is_base: form.is_base,
      }
      if (props.unitId != null) {
        const payload = await updateUnitSchema.validate(
          { ...input, id: props.unitId },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await unitService.update(payload)
      } else {
        const payload = await createUnitSchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (disposed) return
        await unitService.create(payload)
      }
    }
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
    class="unit-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{ statusOnly ? 'Update unit status' : editing ? 'Edit unit' : 'Add unit' }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading unit...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <p v-if="errors.id" role="alert" class="error">{{ errors.id }}</p>
        <fieldset :disabled="saving">
          <template v-if="statusOnly">
            <p>{{ form.name }} &middot; ID {{ unitId }}</p>
            <div class="field">
              <label :for="`${prefix}-status`">Status</label>
              <select
                :id="`${prefix}-status`"
                v-model="form.is_active"
                name="is_active"
                required
                :aria-invalid="!!errors.is_active"
                :aria-describedby="errors.is_active ? `${prefix}-status-error` : undefined"
              >
                <option :value="undefined" disabled>Choose status</option>
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
              <span v-if="errors.is_active" :id="`${prefix}-status-error`" class="error">{{
                errors.is_active
              }}</span>
            </div>
          </template>
          <template v-else>
            <div class="field">
              <label :for="`${prefix}-name`">Name</label>
              <input
                :id="`${prefix}-name`"
                v-model="form.name"
                name="name"
                required
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? `${prefix}-name-error` : undefined"
              />
              <span v-if="errors.name" :id="`${prefix}-name-error`" class="error">{{
                errors.name
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-symbol`">Symbol</label>
              <input
                :id="`${prefix}-symbol`"
                v-model="form.symbol"
                name="symbol"
                required
                :aria-invalid="!!errors.symbol"
                :aria-describedby="errors.symbol ? `${prefix}-symbol-error` : undefined"
              />
              <span v-if="errors.symbol" :id="`${prefix}-symbol-error`" class="error">{{
                errors.symbol
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-group`">Unit group</label>
              <select
                :id="`${prefix}-group`"
                v-model="form.unit_group_id"
                name="unit_group_id"
                required
                :aria-invalid="!!errors.unit_group_id"
                :aria-describedby="errors.unit_group_id ? `${prefix}-group-error` : undefined"
              >
                <option value="" disabled>Choose a unit group</option>
                <option v-if="missingGroup" :value="form.unit_group_id">
                  Group #{{ form.unit_group_id }} (not in list)
                </option>
                <option v-for="group in groups" :key="group.id" :value="group.id">
                  {{ group.name }}
                </option>
              </select>
              <small v-if="!groups.length">No unit groups found. Create a unit group first.</small>
              <span v-if="errors.unit_group_id" :id="`${prefix}-group-error`" class="error">{{
                errors.unit_group_id
              }}</span>
            </div>
            <div class="field">
              <label class="checkbox-label" :for="`${prefix}-base`"
                ><input
                  :id="`${prefix}-base`"
                  v-model="form.is_base"
                  name="is_base"
                  type="checkbox"
                  :aria-invalid="!!errors.is_base"
                  :aria-describedby="errors.is_base ? `${prefix}-base-error` : undefined"
                />
                Base unit</label
              >
              <span v-if="errors.is_base" :id="`${prefix}-base-error`" class="error">{{
                errors.is_base
              }}</span>
            </div>
          </template>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{
            saving
              ? 'Saving...'
              : statusOnly
                ? 'Update status'
                : editing
                  ? 'Save changes'
                  : 'Create unit'
          }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: #1d4ed8;
}
small {
  color: #64748b;
}
.unit-modal {
  width: min(480px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.unit-modal::backdrop {
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
:is(input, select, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

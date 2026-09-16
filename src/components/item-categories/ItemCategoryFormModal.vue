<script setup lang="ts">
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import {
  createItemCategorySchema,
  updateItemCategorySchema,
  itemCategoryStatusSchema,
} from '@/schemas/item-category.schema'
import { itemCategoryService } from '@/services/item-category.service'
import { toApiError } from '@/services/api/api-error'
import type { ItemCategory } from '@/types/item-category'

const props = defineProps<{ category?: ItemCategory | null; statusOnly?: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const prefix = useId()
const editing = computed(() => !!props.category)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const saveError = ref('')
const form = reactive({
  parent_id: props.category?.parent_id ?? '',
  code: props.category?.code ?? '',
  name: props.category?.name ?? '',
  description: props.category?.description ?? '',
  // Missing status is left unselected rather than silently activating a record.
  is_active: props.category?.is_active,
})
let disposed = false
let previousFocus: HTMLElement | null = null

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
})
onBeforeUnmount(() => {
  disposed = true
  dialog.value?.close()
  previousFocus?.focus()
})

function close() {
  if (!saving.value) emit('close')
}

async function submit() {
  if (saving.value) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    if (props.statusOnly) {
      if (!props.category) throw new Error('Select a category before changing its status.')
      const payload = await itemCategoryStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      await itemCategoryService.toggleActive(props.category.id, payload)
    } else if (props.category) {
      const payload = await updateItemCategorySchema.validate(
        { ...form, id: props.category.id },
        { abortEarly: false, stripUnknown: true },
      )
      await itemCategoryService.update(payload)
    } else {
      const payload = await createItemCategorySchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      await itemCategoryService.create(payload)
    }
    if (!disposed) emit('saved')
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner) {
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
      }
    } else {
      saveError.value = toApiError(cause).message
    }
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
    class="category-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{
            statusOnly
              ? 'Update category status'
              : editing
                ? 'Edit item category'
                : 'Add item category'
          }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          Ã—
        </button>
      </header>
      <p v-if="statusOnly && category">{{ category.name }} Â· ID {{ category.id }}</p>
      <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
      <fieldset :disabled="saving">
        <p v-if="errors.id" role="alert" class="error">{{ errors.id }}</p>
        <div v-if="!statusOnly" class="field">
          <label :for="`${prefix}-name`">Name</label>
          <input
            :id="`${prefix}-name`"
            v-model="form.name"
            name="name"
            type="text"
            required
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? `${prefix}-name-error` : undefined"
          />
          <span v-if="errors.name" :id="`${prefix}-name-error`" class="error">{{
            errors.name
          }}</span>
        </div>
        <div v-if="!statusOnly" class="field">
          <label :for="`${prefix}-code`">Code</label>
          <input
            :id="`${prefix}-code`"
            v-model="form.code"
            name="code"
            type="text"
            required
            :aria-invalid="!!errors.code"
            :aria-describedby="errors.code ? `${prefix}-code-error` : undefined"
          />
          <span v-if="errors.code" :id="`${prefix}-code-error`" class="error">{{
            errors.code
          }}</span>
        </div>
        <div v-if="!statusOnly" class="field">
          <label :for="`${prefix}-parent`">Parent category ID (optional)</label>
          <input
            :id="`${prefix}-parent`"
            v-model="form.parent_id"
            name="parent_id"
            type="number"
            min="1"
            step="1"
            :aria-invalid="!!errors.parent_id"
            :aria-describedby="`${prefix}-parent-help${errors.parent_id ? ` ${prefix}-parent-error` : ''}`"
          />
          <small :id="`${prefix}-parent-help`">Leave blank for a top-level category.</small>
          <span v-if="errors.parent_id" :id="`${prefix}-parent-error`" class="error">{{
            errors.parent_id
          }}</span>
        </div>
        <div v-if="!statusOnly" class="field">
          <label :for="`${prefix}-description`">Description (optional)</label>
          <textarea
            :id="`${prefix}-description`"
            v-model="form.description"
            name="description"
            rows="4"
            :aria-invalid="!!errors.description"
            :aria-describedby="errors.description ? `${prefix}-description-error` : undefined"
          />
          <span v-if="errors.description" :id="`${prefix}-description-error`" class="error">{{
            errors.description
          }}</span>
        </div>
        <div v-if="statusOnly" class="field">
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
      </fieldset>
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="primary" :disabled="saving">
          {{
            saving
              ? 'Savingâ€¦'
              : statusOnly
                ? 'Update status'
                : editing
                  ? 'Save changes'
                  : 'Create category'
          }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.category-modal {
  width: min(540px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.category-modal::backdrop {
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
fieldset {
  margin: 1.5rem 0;
  padding: 0;
  border: 0;
  min-width: 0;
  display: grid;
  gap: 1rem;
}
input,
textarea,
select {
  width: 100%;
  box-sizing: border-box;
  font: inherit;
  color: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  background: white;
}
textarea {
  resize: vertical;
}
label {
  font-weight: 600;
  font-size: 0.875rem;
}
small {
  color: #64748b;
}
button {
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: white;
}
.field {
  display: grid;
  gap: 0.4rem;
}
label {
  font-weight: 600;
  font-size: 0.875rem;
}
input,
textarea,
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
textarea,
select {
  width: 100%;
  box-sizing: border-box;
}
textarea {
  resize: vertical;
}
input[readonly] {
  background: #f1f5f9;
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
  border-color: #1d4ed8;
  color: white;
}
footer {
  justify-content: flex-end;
  flex-wrap: wrap;
}
.error {
  color: #b91c1c;
  font-size: 0.875rem;
}
[aria-invalid='true'] {
  border-color: #b91c1c;
}
:is(input, textarea, select, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

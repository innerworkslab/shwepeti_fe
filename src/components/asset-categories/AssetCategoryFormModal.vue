<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onMounted, onBeforeUnmount, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import {
  createAssetCategorySchema,
  updateAssetCategorySchema,
  assetCategoryStatusSchema,
} from '@/schemas/asset-category.schema'
import { assetCategoryService } from '@/services/asset-category.service'
import { toApiError } from '@/services/api/api-error'
import type { AssetCategory } from '@/types/asset-category'

const props = defineProps<{ category?: AssetCategory | null; statusOnly?: boolean }>()
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
const loading = ref(true)
const loadError = ref('')
const categories = ref<AssetCategory[]>([])
const parentOptions = computed(() => {
  const excluded = new Set<number>()
  if (props.category) excluded.add(props.category.id)
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories.value) {
      if (
        category.parent_id != null &&
        excluded.has(category.parent_id) &&
        !excluded.has(category.id)
      ) {
        excluded.add(category.id)
        changed = true
      }
    }
  }
  return categories.value.filter((category) => !excluded.has(category.id))
})
let controller: AbortController | undefined
async function load() {
  if (disposed || (loading.value && controller)) return
  controller = new AbortController()
  loading.value = true
  loadError.value = ''
  const results = await Promise.allSettled([
    props.category
      ? assetCategoryService.get(props.category.id, controller.signal)
      : Promise.resolve(null),
    props.statusOnly ? Promise.resolve([]) : assetCategoryService.listOptions(controller.signal),
  ])
  if (disposed) return
  const [detail, options] = results
  if (detail.status === 'fulfilled' && detail.value) {
    if (detail.value.id !== props.category?.id)
      loadError.value = 'The API returned a different category. Please retry.'
    else
      Object.assign(form, {
        name: detail.value.name,
        code: detail.value.code,
        description: detail.value.description ?? '',
        parent_id: detail.value.parent_id ?? '',
        is_active: detail.value.is_active,
      })
  }
  if (options.status === 'fulfilled') categories.value = options.value
  for (const result of results)
    if (result.status === 'rejected') loadError.value = toApiError(result.reason).message
  loading.value = false
}
let disposed = false
let previousFocus: HTMLElement | null = null

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
      if (!props.category) throw new Error('Select a category before changing its status.')
      const payload = await assetCategoryStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await assetCategoryService.toggleActive(props.category.id, payload)
    } else if (props.category) {
      const parent = Number(form.parent_id)
      if (form.parent_id !== '' && !parentOptions.value.some((option) => option.id === parent)) {
        throw new ValidationError(
          'Choose a parent outside this category and its descendants.',
          form.parent_id,
          'parent_id',
        )
      }
      const payload = await updateAssetCategorySchema.validate(
        { ...form, id: props.category.id },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await assetCategoryService.update(payload)
    } else {
      const payload = await createAssetCategorySchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      if (disposed) return
      await assetCategoryService.create(payload)
    }
    if (!disposed) emit('saved')
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner.length ? cause.inner : [cause]) {
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
    <form novalidate :aria-busy="saving || loading" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{
            statusOnly
              ? 'Update category status'
              : editing
                ? 'Edit asset category'
                : 'Add asset category'
          }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="statusOnly && category">{{ category.name }} | ID {{ category.id }}</p>
      <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
      <p v-if="loading" role="status">Loading category...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <fieldset v-else :disabled="saving">
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
          <label :for="`${prefix}-parent`">Parent category (optional)</label>
          <select
            :id="`${prefix}-parent`"
            v-model="form.parent_id"
            name="parent_id"
            :aria-invalid="!!errors.parent_id"
            :aria-describedby="errors.parent_id ? `${prefix}-parent-error` : undefined"
          >
            <option value="">No parent (top-level category)</option>
            <option v-for="parent in parentOptions" :key="parent.id" :value="parent.id">
              {{ parent.name }} ({{ parent.code }})
            </option>
          </select>
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
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{
            saving
              ? 'Saving...'
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

<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { menuCategoryService } from '@/services/menu-category.service'
import {
  createMenuCategorySchema,
  updateMenuCategorySchema,
  menuCategoryStatusSchema,
} from '@/schemas/menu-category.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{ categoryId?: number | null; statusOnly?: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.categoryId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({
  name: '',
  code: '',
  description: '',
  sort_order: 0 as number | string,
  is_active: undefined as boolean | undefined,
})
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
    if (props.categoryId != null) {
      const group = await menuCategoryService.get(props.categoryId, active.signal)
      if (disposed || active.signal.aborted) return
      if (group.id !== props.categoryId)
        throw new Error('The API returned a different menu category. Please retry.')
      form.name = group.name
      form.code = group.code
      form.description = group.description ?? ''
      form.sort_order = group.sort_order
      form.is_active = group.is_active
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
      if (props.categoryId == null) throw new Error('Select a menu category to update its status.')
      const payload = await menuCategoryStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await menuCategoryService.toggleActive(props.categoryId, payload)
    } else {
      const input = {
        name: form.name,
        code: form.code,
        description: form.description,
        sort_order: form.sort_order,
      }
      if (props.categoryId != null) {
        const payload = await updateMenuCategorySchema.validate(
          { ...input, id: props.categoryId },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await menuCategoryService.update(payload)
      } else {
        const payload = await createMenuCategorySchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (disposed) return
        await menuCategoryService.create(payload)
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
    class="menu-category-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{
            statusOnly
              ? 'Update menu category status'
              : editing
                ? 'Edit menu category'
                : 'Add menu category'
          }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading menu category...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <p v-if="errors.id" role="alert" class="error">{{ errors.id }}</p>
        <fieldset :disabled="saving">
          <template v-if="statusOnly">
            <p>{{ form.name }} &middot; ID {{ categoryId }}</p>
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
              <label :for="`${prefix}-code`">Code</label>
              <input
                :id="`${prefix}-code`"
                v-model="form.code"
                name="code"
                required
                :aria-invalid="!!errors.code"
                :aria-describedby="errors.code ? `${prefix}-code-error` : undefined"
              />
              <span v-if="errors.code" :id="`${prefix}-code-error`" class="error">{{
                errors.code
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-description`">Description</label>
              <textarea
                :id="`${prefix}-description`"
                v-model="form.description"
                name="description"
                rows="3"
                :aria-invalid="!!errors.description"
                :aria-describedby="errors.description ? `${prefix}-description-error` : undefined"
              ></textarea>
              <span v-if="errors.description" :id="`${prefix}-description-error`" class="error">{{
                errors.description
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-sort-order`">Sort order</label>
              <input
                :id="`${prefix}-sort-order`"
                v-model="form.sort_order"
                name="sort_order"
                type="number"
                step="1"
                min="0"
                required
                :aria-invalid="!!errors.sort_order"
                :aria-describedby="errors.sort_order ? `${prefix}-sort-order-error` : undefined"
              />
              <span v-if="errors.sort_order" :id="`${prefix}-sort-order-error`" class="error">{{
                errors.sort_order
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
                  : 'Create menu category'
          }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.menu-category-modal {
  width: min(480px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.menu-category-modal::backdrop {
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

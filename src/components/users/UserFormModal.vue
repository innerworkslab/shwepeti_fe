<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { userService } from '@/services/user.service'
import { createUserSchema, updateUserSchema } from '@/schemas/user.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{ userId?: number | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.userId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const form = reactive({ name: '', email: '', password: '', role: '' })
const fields = [
  { key: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  { key: 'role', label: 'Role', type: 'text', autocomplete: 'off' },
] as const
const loading = ref(editing.value)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null

async function loadUser() {
  if (props.userId == null || disposed || (loading.value && controller)) return
  const active = new AbortController()
  controller = active
  loading.value = true
  loadError.value = ''
  try {
    const user = await userService.get(props.userId, active.signal)
    if (disposed || active.signal.aborted) return
    if (user.id !== props.userId)
      throw new Error('The API returned a different user. Please retry.')
    form.name = user.name
    form.email = user.email
    form.role = user.role
    form.password = ''
  } catch (cause) {
    if (!disposed && !active.signal.aborted) loadError.value = toApiError(cause).message
  } finally {
    if (!disposed) {
      loading.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLInputElement>('[name="name"]')?.focus()
    }
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
  if (editing.value) void loadUser()
  else dialog.value?.querySelector<HTMLInputElement>('[name="name"]')?.focus()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  form.password = ''
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
    if (props.userId != null) {
      const payload = await updateUserSchema.validate(
        { ...form, id: props.userId },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await userService.update(payload)
    } else {
      const payload = await createUserSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      if (disposed) return
      await userService.create(payload)
    }
    if (!disposed) {
      form.password = ''
      emit('saved')
    }
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner) {
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
      }
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
    class="user-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">{{ editing ? 'Edit user' : 'Add user' }}</h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          &times;
        </button>
      </header>
      <p v-if="loading" role="status">Loading user...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="loadUser">Try again</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <p v-if="errors.id" role="alert" class="error">{{ errors.id }}</p>
        <fieldset :disabled="saving">
          <div v-for="field in fields" :key="field.key" class="field">
            <label :for="`${prefix}-${field.key}`">{{ field.label }}</label>
            <input
              :id="`${prefix}-${field.key}`"
              v-model="form[field.key]"
              :name="field.key"
              :type="field.type"
              :autocomplete="field.autocomplete"
              required
              :aria-invalid="!!errors[field.key]"
              :aria-describedby="errors[field.key] ? `${prefix}-${field.key}-error` : undefined"
              :list="field.key === 'role' ? `${prefix}-roles` : undefined"
            />
            <span v-if="errors[field.key]" :id="`${prefix}-${field.key}-error`" class="error">{{
              errors[field.key]
            }}</span>
          </div>
          <datalist :id="`${prefix}-roles`">
            <option value="front_office_administrator">Front office administrator</option>
          </datalist>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button>
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{ saving ? 'Saving...' : editing ? 'Save changes' : 'Create user' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>

<style scoped>
.user-modal {
  width: min(540px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.user-modal::backdrop {
  background: #0f172a80;
}
header,
footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
.field {
  display: grid;
  gap: 0.4rem;
}
label {
  font-weight: 600;
  font-size: 0.875rem;
}
input,
button {
  font: inherit;
  color: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  background: white;
}
input {
  width: 100%;
  box-sizing: border-box;
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
:is(input, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

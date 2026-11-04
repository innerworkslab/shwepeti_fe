<script setup lang="ts">
import { t } from '@/i18n'
import { usePermissions } from '@/composables/usePermissions'
const { can } = usePermissions()
import { permissionService, type PermissionGroup } from '@/services/permission.service'
import { userRoles, portalAccessOptions } from '@/constants/admin-options'
import { statusLabel } from '@/constants/hotel-status'
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { userService } from '@/services/user.service'
import { createUserSchema, updateUserSchema } from '@/schemas/user.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{ userId?: number | null }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.userId != null)
const prefix = useId()
const dialog = ref<HTMLElement | null>(null)
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: '',
  portal_access: 'admin',
  permissions: [] as string[],
})
const fields = [
  { key: 'name', label: 'Name', type: 'text', autocomplete: 'name' },
  { key: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { key: 'password', label: 'Password', type: 'password', autocomplete: 'new-password' },
  { key: 'role', label: 'Role', type: 'text', autocomplete: 'off' },
  { key: 'portal_access', label: 'Portal access', type: 'text', autocomplete: 'off' },
] as const
const groups = ref<PermissionGroup[]>([])
function groupSelected(group: PermissionGroup) {
  return (
    group.permissions.length > 0 &&
    group.permissions.every((p) => form.permissions.includes(p.name))
  )
}
function groupPartial(group: PermissionGroup) {
  return !groupSelected(group) && group.permissions.some((p) => form.permissions.includes(p.name))
}
function toggleGroup(group: PermissionGroup, checked: boolean) {
  const names = new Set(group.permissions.map((p) => p.name))
  form.permissions = checked
    ? [...new Set([...form.permissions, ...names])]
    : form.permissions.filter((p) => !names.has(p))
}
const loading = ref(true)
const saving = ref(false)
defineExpose({ saving })
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let previousFocus: HTMLElement | null = null

async function loadUser() {
  if (disposed || (loading.value && controller)) return
  const active = new AbortController()
  controller = active
  loading.value = true
  loadError.value = ''
  try {
    const [permissionGroups, user] = await Promise.all([
      can('users.manage_permissions') ? permissionService.list(active.signal) : Promise.resolve([]),
      props.userId != null ? userService.get(props.userId, active.signal) : Promise.resolve(null),
    ])
    if (disposed || active.signal.aborted) return
    groups.value = permissionGroups
    if (user) {
      if (user.id !== props.userId)
        throw new Error('The API returned a different user. Please retry.')
      form.name = user.name
      form.email = user.email
      form.role = user.role
      form.portal_access = user.portal_access || ''
      form.permissions = [...new Set(user.permissions ?? [])]
      form.password = ''
    }
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
  void loadUser()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  form.password = ''
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
      if (!can('users.manage_permissions'))
        delete (payload as { permissions?: string[] }).permissions
      await userService.update(payload)
    } else {
      const payload = await createUserSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      if (disposed) return
      if (!can('users.manage_permissions'))
        delete (payload as { permissions?: string[] }).permissions
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
  <section
    ref="dialog"
    class="user-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">{{ editing ? t('Edit user') : t('Add user') }}</h2>
        <button type="button" :aria-label="t('Back to users')" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">{{ t('Loading user...') }}</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ t(loadError) }}</p>
        <button type="button" @click="loadUser">{{ t('Try again') }}</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ t(saveError) }}</p>
        <p v-if="errors.id" role="alert" class="error">{{ t(errors.id) }}</p>
        <fieldset :disabled="saving">
          <div v-for="field in fields" :key="field.key" class="field">
            <label :for="`${prefix}-${field.key}`">{{ t(field.label) }}</label>
            <select
              v-if="field.key === 'role' || field.key === 'portal_access'"
              :id="`${prefix}-${field.key}`"
              v-model="form[field.key]"
              :name="field.key"
              required
              :aria-invalid="!!errors[field.key]"
            >
              <option value="" disabled>
                {{ t('Select') }} {{ t(field.label.toLowerCase()) }}
              </option>
              <option
                v-for="option in field.key === 'role' ? userRoles : portalAccessOptions"
                :key="option"
                :value="option"
              >
                {{ t(statusLabel(option)) }}
              </option>
            </select>
            <input
              v-else
              :id="`${prefix}-${field.key}`"
              v-model="form[field.key]"
              :name="field.key"
              :type="field.type"
              :autocomplete="field.autocomplete"
              required
              :aria-invalid="!!errors[field.key]"
              :aria-describedby="errors[field.key] ? `${prefix}-${field.key}-error` : undefined"
            />
            <span v-if="errors[field.key]" :id="`${prefix}-${field.key}-error`" class="error">{{
              t(errors[field.key])
            }}</span>
          </div>
          <section
            v-if="can('users.manage_permissions')"
            class="permissions"
            :aria-label="t('User permissions')"
          >
            <h3>{{ t('Permissions') }}</h3>
            <p>{{ t('Choose the actions this user may perform.') }}</p>
            <p v-if="!groups.length">{{ t('No permissions available.') }}</p>
            <fieldset v-for="group in groups" :key="group.group" class="permission-group">
              <legend>{{ t(group.label) }}</legend>
              <label class="permission-option"
                ><input
                  type="checkbox"
                  :checked="groupSelected(group)"
                  :indeterminate="groupPartial(group)"
                  :disabled="!group.permissions.length"
                  :aria-label="t('Select all {0} permissions', [t(group.label)])"
                  @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
                />
                {{ t('Select all') }}
              </label>
              <div class="permission-options">
                <label
                  v-for="permission in group.permissions"
                  :key="permission.name"
                  class="permission-option"
                  ><input
                    type="checkbox"
                    v-model="form.permissions"
                    :value="permission.name"
                    :name="permission.name"
                  />{{ t(permission.label) }}</label
                >
              </div>
            </fieldset>
          </section>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">{{ t('Cancel') }}</button>
        <button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{ saving ? t('Saving...') : editing ? t('Save changes') : t('Create user') }}
        </button>
      </footer>
    </form>
  </section>
</template>

<style scoped>
.user-modal {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  box-sizing: border-box;
}
.permission-group {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
.permission-options {
  display: flex;
  gap: 14px 24px;
  flex-wrap: wrap;
}
.permission-option {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}
.permission-option input {
  width: auto;
}
legend {
  font-weight: 600;
}

.user-modal {
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  background: white;
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
select,
button {
  font: inherit;
  color: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  background: white;
}
input,
select {
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
:is(input, select, button):focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
</style>

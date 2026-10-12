<script setup lang="ts">
import { supplierTypes } from '@/constants/admin-options'
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ValidationError } from 'yup'
import { supplierService } from '@/services/supplier.service'
import { createSupplierSchema, updateSupplierSchema } from '@/schemas/supplier.schema'
import { toApiError } from '@/services/api/api-error'
const route = useRoute()
const router = useRouter()
const editing = computed(() => route.params.id != null)
const defaults = () => ({
  supplier_code: '',
  name: '',
  phone_number: '',
  email: '',
  address: '',
  bank_account_no: '',
  credit_limit_amount: 0 as number | string,
  supplier_type: 'wholesale',
  is_active: true,
})
const form = reactive(defaults())
const formElement = ref<HTMLFormElement | null>(null)
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let saved = false
function supplierId() {
  const raw = String(route.params.id)
  const id = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1)
    throw new Error('Invalid supplier ID.')
  return id
}
async function load() {
  controller?.abort()
  const active = new AbortController()
  controller = active
  loading.value = true
  loadError.value = ''
  saveError.value = ''
  errors.value = {}
  Object.assign(form, defaults())
  try {
    if (editing.value) {
      const id = supplierId()
      const result = await supplierService.get(id, active.signal)
      if (active.signal.aborted || disposed) return
      if (result.id !== id) throw new Error('The API returned a different supplier. Please retry.')
      for (const key of Object.keys(defaults()) as (keyof typeof form)[]) {
        Object.assign(form, { [key]: result[key] ?? defaults()[key] })
      }
    }
  } catch (cause) {
    if (!active.signal.aborted && !disposed) loadError.value = toApiError(cause).message
  } finally {
    if (!active.signal.aborted && !disposed) loading.value = false
  }
}
watch(
  () => route.params.id,
  () => {
    void load()
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
})
onBeforeRouteLeave(() => !saving.value || saved)
onBeforeRouteUpdate(() => !saving.value)
async function submit() {
  if (loading.value || saving.value || loadError.value || disposed) return
  saving.value = true
  saved = false
  errors.value = {}
  saveError.value = ''
  const wasEditing = editing.value
  try {
    if (wasEditing) {
      const payload = await updateSupplierSchema.validate(
        { ...form, id: supplierId() },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await supplierService.update(payload)
    } else {
      const payload = await createSupplierSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      if (disposed) return
      await supplierService.create(payload)
    }
    if (!disposed) {
      saved = true
      await router.push({ name: 'suppliers', query: { saved: wasEditing ? 'updated' : 'created' } })
    }
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
      formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }
}
</script>
<template>
  <section class="supplier-page">
    <h1>{{ editing ? 'Edit supplier' : 'Add supplier' }}</h1>
    <p>Enter supplier contact, banking, and credit details.</p>
    <p v-if="loading" role="status">Loading supplier...</p>
    <div v-else-if="loadError" role="alert" class="error">
      <p>{{ loadError }}</p>
      <button type="button" @click="load">Try again</button>
    </div>
    <form v-else ref="formElement" novalidate :aria-busy="saving" @submit.prevent="submit">
      <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
      <fieldset :disabled="saving">
        <div class="field">
          <label for="supplier-supplier_code">Supplier code *</label
          ><input
            id="supplier-supplier_code"
            name="supplier_code"
            v-model="form.supplier_code"
            required
            :aria-invalid="!!errors.supplier_code"
            :aria-describedby="errors.supplier_code ? 'supplier-supplier_code-error' : undefined"
          /><span v-if="errors.supplier_code" id="supplier-supplier_code-error" class="error">{{
            errors.supplier_code
          }}</span>
        </div>
        <div class="field">
          <label for="supplier-name">Name *</label
          ><input
            id="supplier-name"
            name="name"
            v-model="form.name"
            required
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'supplier-name-error' : undefined"
          /><span v-if="errors.name" id="supplier-name-error" class="error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="supplier-phone_number">Phone number</label
          ><input
            id="supplier-phone_number"
            name="phone_number"
            v-model="form.phone_number"
            type="tel"
            :aria-invalid="!!errors.phone_number"
            :aria-describedby="errors.phone_number ? 'supplier-phone_number-error' : undefined"
          /><span v-if="errors.phone_number" id="supplier-phone_number-error" class="error">{{
            errors.phone_number
          }}</span>
        </div>
        <div class="field">
          <label for="supplier-email">Email</label
          ><input
            id="supplier-email"
            name="email"
            v-model="form.email"
            type="email"
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'supplier-email-error' : undefined"
          /><span v-if="errors.email" id="supplier-email-error" class="error">{{
            errors.email
          }}</span>
        </div>
        <div class="field">
          <label for="supplier-address">Address</label
          ><textarea
            id="supplier-address"
            name="address"
            v-model="form.address"
            :aria-invalid="!!errors.address"
            :aria-describedby="errors.address ? 'supplier-address-error' : undefined"
          ></textarea
          ><span v-if="errors.address" id="supplier-address-error" class="error">{{
            errors.address
          }}</span>
        </div>
        <div class="field">
          <label for="supplier-bank_account_no">Bank account number</label
          ><input
            id="supplier-bank_account_no"
            name="bank_account_no"
            v-model="form.bank_account_no"
            type="text"
            :aria-invalid="!!errors.bank_account_no"
            :aria-describedby="
              errors.bank_account_no ? 'supplier-bank_account_no-error' : undefined
            "
          /><span v-if="errors.bank_account_no" id="supplier-bank_account_no-error" class="error">{{
            errors.bank_account_no
          }}</span>
        </div>
        <div class="field">
          <label for="supplier-credit_limit_amount">Credit limit amount *</label
          ><input
            id="supplier-credit_limit_amount"
            name="credit_limit_amount"
            v-model="form.credit_limit_amount"
            type="number"
            min="0"
            step="any"
            required
            :aria-invalid="!!errors.credit_limit_amount"
            :aria-describedby="
              errors.credit_limit_amount ? 'supplier-credit_limit_amount-error' : undefined
            "
          /><span
            v-if="errors.credit_limit_amount"
            id="supplier-credit_limit_amount-error"
            class="error"
            >{{ errors.credit_limit_amount }}</span
          >
        </div>
        <div class="field">
          <label for="supplier-supplier_type">Supplier type *</label
          ><select
            id="supplier-supplier_type"
            name="supplier_type"
            v-model="form.supplier_type"
            required
            :aria-invalid="!!errors.supplier_type"
            :aria-describedby="errors.supplier_type ? 'supplier-supplier_type-error' : undefined"
          >
            <option v-for="type in supplierTypes" :key="type" :value="type">
              {{ type }}
            </option></select
          ><span v-if="errors.supplier_type" id="supplier-supplier_type-error" class="error">{{
            errors.supplier_type
          }}</span>
        </div>

        <div class="field">
          <label for="supplier-status">Status *</label
          ><select
            id="supplier-status"
            name="is_active"
            v-model="form.is_active"
            :aria-invalid="!!errors.is_active"
            :aria-describedby="errors.is_active ? 'supplier-status-error' : undefined"
          >
            <option :value="true">Active</option>
            <option :value="false">Inactive</option></select
          ><span v-if="errors.is_active" id="supplier-status-error" class="error">{{
            errors.is_active
          }}</span>
        </div>
      </fieldset>
      <footer>
        <button type="button" :disabled="saving" @click="router.push('/suppliers')">Cancel</button
        ><button type="submit" class="primary" :disabled="saving">
          {{ saving ? 'Saving...' : editing ? 'Save changes' : 'Create supplier' }}
        </button>
      </footer>
    </form>
    <RouterLink v-if="loadError" to="/suppliers">Back to suppliers</RouterLink>
  </section>
</template>
<style scoped>
.supplier-page {
  max-width: 960px;
}
form {
  background: white;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}
fieldset {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  padding: 0;
  margin: 0;
  border: 0;
}
.field {
  display: grid;
  align-content: start;
  gap: 0.4rem;
  min-width: 0;
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
  color: inherit;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
}
input,
textarea,
select {
  width: 100%;
  min-width: 0;
}
textarea {
  resize: vertical;
}
footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
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
@media (max-width: 640px) {
  fieldset {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ValidationError } from 'yup'
import { supplierService } from '@/services/supplier.service'
import { cashbookService } from '@/services/cashbook.service'
import { supplierApService } from '@/services/supplier-ap.service'
import { createSupplierApPaymentSchema } from '@/schemas/supplier-ap.schema'
import { toApiError } from '@/services/api/api-error'
import type { Supplier } from '@/types/supplier'
import type { Cashbook } from '@/types/cashbook'
const router = useRouter()
const suppliers = ref<Supplier[]>([])
const cashbooks = ref<Cashbook[]>([])
const form = reactive({
  supplier_id: '',
  cashbook_id: '',
  amount: '',
  payment_date: '',
  remark: '',
})
const formElement = ref<HTMLFormElement | null>(null)
const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const errors = ref<Record<string, string>>({})
let controller: AbortController | undefined
let disposed = false
let saved = false
async function load() {
  if (controller && loading.value) return
  controller = new AbortController()
  loading.value = true
  loadError.value = ''
  const results = await Promise.allSettled([
    supplierService.listOptions(controller.signal),
    cashbookService.listOptions(controller.signal),
  ])
  if (disposed) return
  const [supplierResult, cashbookResult] = results
  if (supplierResult.status === 'fulfilled') suppliers.value = supplierResult.value
  if (cashbookResult.status === 'fulfilled') cashbooks.value = cashbookResult.value
  loadError.value = results
    .filter((result) => result.status === 'rejected')
    .map((result) => toApiError(result.reason).message)
    .join(' ')
  loading.value = false
}
onMounted(() => {
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
})
onBeforeRouteLeave(() => !saving.value || saved)
async function submit() {
  if (loading.value || saving.value || loadError.value || disposed) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    const payload = await createSupplierApPaymentSchema.validate(form, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (disposed) return
    await supplierApService.createPayment(payload)
    if (!disposed) {
      saved = true
      await router.push({ name: 'supplier-ap-balances', query: { saved: 'created' } })
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
    <h1>Add supplier AP payment</h1>
    <p>Record a payment against a supplier account.</p>
    <p v-if="loading" role="status">Loading suppliers and cashbooks...</p>
    <div v-else-if="loadError" class="error" role="alert">
      <p>{{ loadError }}</p>
      <button type="button" @click="load">Try again</button>
    </div>
    <form v-else ref="formElement" novalidate :aria-busy="saving" @submit.prevent="submit">
      <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
      <fieldset :disabled="saving">
        <div class="field">
          <label for="payment-supplier_id">Supplier</label
          ><select
            id="payment-supplier_id"
            name="supplier_id"
            v-model="form.supplier_id"
            required
            :aria-invalid="!!errors.supplier_id"
            :aria-describedby="errors.supplier_id ? 'payment-supplier_id-error' : undefined"
          >
            <option value="" disabled>Choose supplier</option>
            <option v-for="option in suppliers" :key="option.id" :value="option.id">
              {{ option.name }} ({{ option.supplier_code }})
            </option></select
          ><span v-if="errors.supplier_id" id="payment-supplier_id-error" class="error">{{
            errors.supplier_id
          }}</span>
          <p v-if="!suppliers.length">No suppliers available.</p>
        </div>
        <div class="field">
          <label for="payment-cashbook_id">Cashbook</label
          ><select
            id="payment-cashbook_id"
            name="cashbook_id"
            v-model="form.cashbook_id"
            required
            :aria-invalid="!!errors.cashbook_id"
            :aria-describedby="errors.cashbook_id ? 'payment-cashbook_id-error' : undefined"
          >
            <option value="" disabled>Choose cashbook</option>
            <option v-for="option in cashbooks" :key="option.id" :value="option.id">
              {{ option.name }} ({{ option.code }})
            </option></select
          ><span v-if="errors.cashbook_id" id="payment-cashbook_id-error" class="error">{{
            errors.cashbook_id
          }}</span>
          <p v-if="!cashbooks.length">No cashbooks available.</p>
        </div>
        <div class="field">
          <label for="payment-amount">Amount</label
          ><input
            id="payment-amount"
            name="amount"
            v-model="form.amount"
            type="number"
            min="0"
            step="any"
            required
            :aria-invalid="!!errors.amount"
            :aria-describedby="errors.amount ? 'payment-amount-error' : undefined"
          /><span v-if="errors.amount" id="payment-amount-error" class="error">{{
            errors.amount
          }}</span>
        </div>
        <div class="field">
          <label for="payment-payment_date">Payment date</label
          ><input
            id="payment-payment_date"
            name="payment_date"
            v-model="form.payment_date"
            type="datetime-local"
            step="1"
            required
            :aria-invalid="!!errors.payment_date"
            :aria-describedby="errors.payment_date ? 'payment-payment_date-error' : undefined"
          /><span v-if="errors.payment_date" id="payment-payment_date-error" class="error">{{
            errors.payment_date
          }}</span>
        </div>
        <div class="field">
          <label for="payment-remark">Remark</label
          ><textarea
            id="payment-remark"
            name="remark"
            v-model="form.remark"
            :aria-invalid="!!errors.remark"
            :aria-describedby="errors.remark ? 'payment-remark-error' : undefined"
          ></textarea
          ><span v-if="errors.remark" id="payment-remark-error" class="error">{{
            errors.remark
          }}</span>
        </div>
      </fieldset>
      <footer>
        <button type="button" :disabled="saving" @click="router.push('/supplier-ap-balances')">
          Cancel</button
        ><button
          type="submit"
          class="primary"
          :disabled="saving || !suppliers.length || !cashbooks.length"
        >
          {{ saving ? 'Saving...' : 'Create payment' }}
        </button>
      </footer>
    </form>
    <RouterLink v-if="loadError" to="/supplier-ap-balances">Back to Supplier AP</RouterLink>
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

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import AppIcon from '@/components/common/AppIcon.vue'
import { cashbookService } from '@/services/cashbook.service'
import { cashbookTransactionService } from '@/services/cashbook-transaction.service'
import { createCashbookTransactionSchema } from '@/schemas/cashbook-transaction.schema'
import { toApiError } from '@/services/api/api-error'
import type { Cashbook } from '@/types/cashbook'
import type { CashbookTransaction } from '@/types/cashbook-transaction'
const props = defineProps<{ transactionId?: number }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const cashbooks = ref<Cashbook[]>([])
const detail = ref<CashbookTransaction | null>(null)
const form = reactive({
  cashbook_id: '',
  transaction_type: 'income',
  amount: '',
  transaction_date: '',
  remark: '',
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
  loading.value = true
  loadError.value = ''
  try {
    if (props.transactionId != null) {
      const result = await cashbookTransactionService.get(props.transactionId, controller.signal)
      if (disposed) return
      if (result.id !== props.transactionId)
        throw new Error('The API returned a different transaction. Please retry.')
      detail.value = result
    } else {
      const result = await cashbookService.listOptions(controller.signal)
      if (disposed) return
      cashbooks.value = result
    }
  } catch (cause) {
    if (!disposed) loadError.value = toApiError(cause).message
  } finally {
    if (!disposed) {
      loading.value = false
      await nextTick()
      dialog.value?.querySelector<HTMLElement>('select, input')?.focus()
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
  if (props.transactionId != null || saving.value || loading.value || loadError.value || disposed)
    return
  saving.value = true
  saveError.value = ''
  errors.value = {}
  try {
    const payload = await createCashbookTransactionSchema.validate(form, {
      abortEarly: false,
      stripUnknown: true,
    })
    if (disposed) return
    await cashbookTransactionService.create(payload)
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
    class="transaction-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <h2 :id="`${prefix}-title`">
          {{ transactionId != null ? 'Transaction details' : 'Add cashbook transaction' }}
        </h2>
        <button type="button" aria-label="Close dialog" :disabled="saving" @click="close">
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading...</p>
      <div v-else-if="loadError" class="error" role="alert">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <dl v-else-if="detail">
        <dt>ID</dt>
        <dd>{{ detail.id }}</dd>
        <dt>Cashbook</dt>
        <dd>{{ detail.cashbook?.name ?? `#${detail.cashbook_id}` }}</dd>
        <dt>Transaction type</dt>
        <dd>{{ detail.transaction_type }}</dd>
        <dt>Amount</dt>
        <dd>{{ detail.amount }}</dd>
        <dt>Transaction date</dt>
        <dd>{{ detail.transaction_date }}</dd>
        <dt>Reference</dt>
        <dd>{{ detail.reference_no ?? '-' }}</dd>
        <dt>Balance after</dt>
        <dd>{{ detail.balance_after ?? '-' }}</dd>
        <dt>Reference type / ID</dt>
        <dd>{{ detail.reference_type ?? '-' }} / {{ detail.reference_id ?? '-' }}</dd>
        <dt>Cashbook code / type</dt>
        <dd>{{ detail.cashbook?.code }} / {{ detail.cashbook?.type }}</dd>
        <dt>Opening balance</dt>
        <dd>{{ detail.cashbook?.opening_balance ?? '-' }}</dd>
        <dt>Current balance</dt>
        <dd>{{ detail.cashbook?.current_balance ?? '-' }}</dd>
        <dt>Created by</dt>
        <dd>{{ detail.creator?.name ?? '-' }} {{ detail.creator?.email }}</dd>
        <dt>Created at</dt>
        <dd>{{ detail.created_at ?? '-' }}</dd>
        <dt>Updated at</dt>
        <dd>{{ detail.updated_at ?? '-' }}</dd>
        <dt>Remark</dt>
        <dd>{{ detail.remark || '-' }}</dd>
      </dl>
      <template v-else>
        <p v-if="saveError" class="error" role="alert">{{ saveError }}</p>
        <fieldset :disabled="saving">
          <div class="field">
            <label :for="`${prefix}-cashbook_id`">Cashbook</label>
            <select
              :id="`${prefix}-cashbook_id`"
              v-model="form.cashbook_id"
              name="cashbook_id"
              required
              :aria-invalid="!!errors.cashbook_id"
              :aria-describedby="errors.cashbook_id ? `${prefix}-cashbook_id-error` : undefined"
            >
              <option value="" disabled>Choose cashbook</option>
              <option v-for="cashbook in cashbooks" :key="cashbook.id" :value="cashbook.id">
                {{ cashbook.name }} ({{ cashbook.code }})
              </option>
            </select>
            <span v-if="errors.cashbook_id" :id="`${prefix}-cashbook_id-error`" class="error">{{
              errors.cashbook_id
            }}</span>
            <p v-if="!cashbooks.length">No cashbooks available. Create a cashbook first.</p>
          </div>
          <div class="field">
            <label :for="`${prefix}-transaction_type`">Transaction type</label
            ><input
              :id="`${prefix}-transaction_type`"
              v-model="form.transaction_type"
              name="transaction_type"
              :list="`${prefix}-types`"
              required
              :aria-invalid="!!errors.transaction_type"
              :aria-describedby="
                errors.transaction_type ? `${prefix}-transaction_type-error` : undefined
              "
            /><span
              v-if="errors.transaction_type"
              :id="`${prefix}-transaction_type-error`"
              class="error"
              >{{ errors.transaction_type }}</span
            >
          </div>
          <div class="field">
            <label :for="`${prefix}-amount`">Amount</label
            ><input
              :id="`${prefix}-amount`"
              v-model="form.amount"
              name="amount"
              type="number"
              step="any"
              min="0"
              required
              :aria-invalid="!!errors.amount"
              :aria-describedby="errors.amount ? `${prefix}-amount-error` : undefined"
            /><span v-if="errors.amount" :id="`${prefix}-amount-error`" class="error">{{
              errors.amount
            }}</span>
          </div>
          <div class="field">
            <label :for="`${prefix}-transaction_date`">Transaction date</label
            ><input
              :id="`${prefix}-transaction_date`"
              v-model="form.transaction_date"
              name="transaction_date"
              type="datetime-local"
              step="1"
              required
              :aria-invalid="!!errors.transaction_date"
              :aria-describedby="
                errors.transaction_date ? `${prefix}-transaction_date-error` : undefined
              "
            /><span
              v-if="errors.transaction_date"
              :id="`${prefix}-transaction_date-error`"
              class="error"
              >{{ errors.transaction_date }}</span
            >
          </div>
          <div class="field">
            <label :for="`${prefix}-remark`">Remark</label
            ><textarea
              :id="`${prefix}-remark`"
              v-model="form.remark"
              name="remark"
              :aria-invalid="!!errors.remark"
              :aria-describedby="errors.remark ? `${prefix}-remark-error` : undefined"
            ></textarea
            ><span v-if="errors.remark" :id="`${prefix}-remark-error`" class="error">{{
              errors.remark
            }}</span>
          </div>
          <datalist :id="`${prefix}-types`"><option value="income" /></datalist>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">
          {{ transactionId != null ? 'Close' : 'Cancel' }}</button
        ><button
          v-if="transactionId == null"
          type="submit"
          class="primary"
          :disabled="loading || saving || !!loadError || !cashbooks.length"
        >
          {{ saving ? 'Saving...' : 'Create transaction' }}
        </button>
      </footer>
    </form>
  </dialog>
</template>
<style scoped>
.transaction-modal {
  width: min(480px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.transaction-modal::backdrop {
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
dt {
  font-weight: 600;
  margin-top: 1rem;
}
dd {
  margin: 0.25rem 0 1rem;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>

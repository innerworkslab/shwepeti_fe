<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/common/AppIcon.vue'
import { useAssetLookups } from '@/composables/useAssetLookups'
import { ValidationError } from 'yup'
import { fixedAssetService } from '@/services/fixed-asset.service'
import { createFixedAssetSchema, updateFixedAssetSchema } from '@/schemas/fixed-asset.schema'
import { toApiError } from '@/services/api/api-error'
const route = useRoute()
const router = useRouter()
const editing = computed(() => route.params.id != null)
const {
  categories,
  cashbooks,
  loading: optionsLoading,
  error: optionsError,
  load: loadOptions,
} = useAssetLookups()
let nextKey = 0
const defaults = () => ({
  asset_code: '',
  asset_category_id: '' as number | string,
  cashbook_id: '' as number | string,
  name: '',
  serial_number: '',
  purchase_date: '',
  purchase_amount: '' as number | string,
  warranty_expiry_date: '',
  documents: [] as { name: string; path: string; key: number }[],
  remark: '',
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
function assetId() {
  const raw = String(route.params.id)
  const id = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(id) || id < 1)
    throw new Error('Invalid asset ID.')
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
    await loadOptions()
    if (active.signal.aborted || disposed) return
    if (editing.value) {
      const id = assetId()
      const result = await fixedAssetService.get(id, active.signal)
      if (active.signal.aborted || disposed) return
      if (result.id !== id) throw new Error('The API returned a different asset. Please retry.')
      Object.assign(form, {
        asset_code: result.asset_code,
        asset_category_id: result.asset_category_id,
        cashbook_id: result.cashbook_id,
        name: result.name,
        serial_number: result.serial_number ?? '',
        purchase_date: result.purchase_date.replace(' ', 'T'),
        purchase_amount: result.purchase_amount,
        warranty_expiry_date: result.warranty_expiry_date?.slice(0, 10) ?? '',
        documents: (result.documents ?? []).map((document) => ({
          name: document.name,
          path: document.path,
          key: nextKey++,
        })),
        remark: result.remark ?? '',
      })
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
  if (
    loading.value ||
    optionsLoading.value ||
    saving.value ||
    loadError.value ||
    optionsError.value ||
    disposed
  )
    return
  saving.value = true
  saved = false
  errors.value = {}
  saveError.value = ''
  const wasEditing = editing.value
  try {
    if (wasEditing) {
      const payload = await updateFixedAssetSchema.validate(
        { ...form, id: assetId() },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await fixedAssetService.update(payload)
    } else {
      const payload = await createFixedAssetSchema.validate(form, {
        abortEarly: false,
        stripUnknown: true,
      })
      if (disposed) return
      await fixedAssetService.create(payload)
    }
    if (!disposed) {
      saved = true
      await router.push({
        name: 'fixed-assets',
        query: { saved: wasEditing ? 'updated' : 'created' },
      })
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
function documentUrl(path: string): string | undefined {
  try {
    const url = new URL(path)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  } catch {
    return undefined
  }
}
function addDocument() {
  form.documents.push({ name: '', path: '', key: nextKey++ })
}
function removeDocument(index: number) {
  form.documents.splice(index, 1)
  errors.value = {}
}
</script>
<template>
  <section class="supplier-page">
    <h1>{{ editing ? 'Edit fixed asset' : 'Add fixed asset' }}</h1>
    <p>Record purchase details and supporting documents.</p>
    <p v-if="loading || optionsLoading" role="status">Loading asset details...</p>
    <div v-else-if="loadError || optionsError" role="alert" class="error">
      <p>{{ loadError || optionsError }}</p>
      <button type="button" @click="load">Try again</button>
    </div>
    <form v-else ref="formElement" novalidate :aria-busy="saving" @submit.prevent="submit">
      <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
      <fieldset :disabled="saving">
        <div class="field">
          <label for="asset-asset_code">Asset code</label
          ><input
            id="asset-asset_code"
            name="asset_code"
            v-model="form.asset_code"
            :aria-invalid="!!errors.asset_code"
            :aria-describedby="errors.asset_code ? 'asset-asset_code-error' : undefined"
          /><span v-if="errors.asset_code" id="asset-asset_code-error" class="error">{{
            errors.asset_code
          }}</span>
        </div>
        <div class="field">
          <label for="asset-name">Name</label
          ><input
            id="asset-name"
            name="name"
            v-model="form.name"
            :aria-invalid="!!errors.name"
            :aria-describedby="errors.name ? 'asset-name-error' : undefined"
          /><span v-if="errors.name" id="asset-name-error" class="error">{{ errors.name }}</span>
        </div>
        <div class="field">
          <label for="asset-serial_number">Serial number</label
          ><input
            id="asset-serial_number"
            name="serial_number"
            v-model="form.serial_number"
            :aria-invalid="!!errors.serial_number"
            :aria-describedby="errors.serial_number ? 'asset-serial_number-error' : undefined"
          /><span v-if="errors.serial_number" id="asset-serial_number-error" class="error">{{
            errors.serial_number
          }}</span>
        </div>
        <div class="field">
          <label for="asset-purchase_date">Purchase date</label
          ><input
            id="asset-purchase_date"
            name="purchase_date"
            v-model="form.purchase_date"
            type="datetime-local"
            step="1"
            :aria-invalid="!!errors.purchase_date"
            :aria-describedby="errors.purchase_date ? 'asset-purchase_date-error' : undefined"
          /><span v-if="errors.purchase_date" id="asset-purchase_date-error" class="error">{{
            errors.purchase_date
          }}</span>
        </div>
        <div class="field">
          <label for="asset-purchase_amount">Purchase amount</label
          ><input
            id="asset-purchase_amount"
            name="purchase_amount"
            v-model="form.purchase_amount"
            type="number"
            min="0"
            step="any"
            :aria-invalid="!!errors.purchase_amount"
            :aria-describedby="errors.purchase_amount ? 'asset-purchase_amount-error' : undefined"
          /><span v-if="errors.purchase_amount" id="asset-purchase_amount-error" class="error">{{
            errors.purchase_amount
          }}</span>
        </div>
        <div class="field">
          <label for="asset-warranty_expiry_date">Warranty expiry date</label
          ><input
            id="asset-warranty_expiry_date"
            name="warranty_expiry_date"
            v-model="form.warranty_expiry_date"
            type="date"
            :aria-invalid="!!errors.warranty_expiry_date"
            :aria-describedby="
              errors.warranty_expiry_date ? 'asset-warranty_expiry_date-error' : undefined
            "
          /><span
            v-if="errors.warranty_expiry_date"
            id="asset-warranty_expiry_date-error"
            class="error"
            >{{ errors.warranty_expiry_date }}</span
          >
        </div>
        <div class="field">
          <label for="asset-remark">Remark</label
          ><input
            id="asset-remark"
            name="remark"
            v-model="form.remark"
            :aria-invalid="!!errors.remark"
            :aria-describedby="errors.remark ? 'asset-remark-error' : undefined"
          /><span v-if="errors.remark" id="asset-remark-error" class="error">{{
            errors.remark
          }}</span>
        </div>
        <div class="field">
          <label for="asset-asset_category_id">Asset category</label
          ><select
            id="asset-asset_category_id"
            name="asset_category_id"
            v-model="form.asset_category_id"
            required
            :aria-invalid="!!errors.asset_category_id"
            :aria-describedby="
              errors.asset_category_id ? 'asset-asset_category_id-error' : undefined
            "
          >
            <option value="" disabled>Choose asset category</option>
            <option v-for="option in categories" :key="option.id" :value="option.id">
              {{ option.name }}
            </option></select
          ><span v-if="errors.asset_category_id" id="asset-asset_category_id-error" class="error">{{
            errors.asset_category_id
          }}</span
          ><span v-if="!categories.length">No asset category options available.</span>
        </div>
        <div class="field">
          <label for="asset-cashbook_id">Cashbook</label
          ><select
            id="asset-cashbook_id"
            name="cashbook_id"
            v-model="form.cashbook_id"
            required
            :aria-invalid="!!errors.cashbook_id"
            :aria-describedby="errors.cashbook_id ? 'asset-cashbook_id-error' : undefined"
          >
            <option value="" disabled>Choose cashbook</option>
            <option v-for="option in cashbooks" :key="option.id" :value="option.id">
              {{ option.name }}
            </option></select
          ><span v-if="errors.cashbook_id" id="asset-cashbook_id-error" class="error">{{
            errors.cashbook_id
          }}</span
          ><span v-if="!cashbooks.length">No cashbook options available.</span>
        </div>
        <section class="documents">
          <h2>Documents</h2>
          <p>
            Add the name and stored path of each document. Full HTTP(S) links can be opened for
            preview.
          </p>
          <div v-for="(document, index) in form.documents" :key="document.key" class="document-row">
            <a
              v-if="documentUrl(document.path)"
              :href="documentUrl(document.path)"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Preview ${document.name || 'document'}`"
              class="document-icon"
              ><AppIcon name="document" :size="32"
            /></a>
            <span v-else class="document-icon" title="Preview needs the document's full URL"
              ><AppIcon name="document" :size="32"
            /></span>
            <div class="field">
              <label :for="`document-name-${document.key}`">Document name</label
              ><input
                :id="`document-name-${document.key}`"
                v-model="document.name"
                :name="`documents[${index}].name`"
                :aria-invalid="!!errors[`documents[${index}].name`]"
                :aria-describedby="
                  errors[`documents[${index}].name`]
                    ? `document-name-error-${document.key}`
                    : undefined
                "
              /><span
                v-if="errors[`documents[${index}].name`]"
                :id="`document-name-error-${document.key}`"
                class="error"
                >{{ errors[`documents[${index}].name`] }}</span
              >
            </div>
            <div class="field">
              <label :for="`document-path-${document.key}`">Document path</label
              ><input
                :id="`document-path-${document.key}`"
                v-model="document.path"
                :name="`documents[${index}].path`"
                :aria-invalid="!!errors[`documents[${index}].path`]"
                :aria-describedby="
                  errors[`documents[${index}].path`]
                    ? `document-path-error-${document.key}`
                    : undefined
                "
              /><span
                v-if="errors[`documents[${index}].path`]"
                :id="`document-path-error-${document.key}`"
                class="error"
                >{{ errors[`documents[${index}].path`] }}</span
              >
            </div>
            <button
              type="button"
              :aria-label="`Remove document ${index + 1}`"
              @click="removeDocument(index)"
            >
              <AppIcon name="remove" />
            </button>
          </div>
          <button type="button" @click="addDocument"><AppIcon name="add" /> Add document</button>
        </section>
      </fieldset>
      <footer>
        <button type="button" :disabled="saving" @click="router.push('/fixed-assets')">
          Cancel</button
        ><button
          type="submit"
          class="primary"
          :disabled="saving || !categories.length || !cashbooks.length"
        >
          {{ saving ? 'Saving...' : editing ? 'Save changes' : 'Create asset' }}
        </button>
      </footer>
    </form>
    <RouterLink v-if="loadError || optionsError" to="/fixed-assets"
      >Back to fixed assets</RouterLink
    >
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
.documents {
  grid-column: 1 / -1;
}
.document-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 1rem 0;
}
.document-row .field {
  flex: 1 1 200px;
}
.document-icon {
  color: #1d4ed8;
  padding: 0.5rem;
}
</style>

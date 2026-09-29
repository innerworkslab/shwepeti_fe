<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { roomService } from '@/services/room.service'
import { roomCategoryService } from '@/services/room-category.service'
import { createRoomSchema, updateRoomSchema, roomStatusSchema } from '@/schemas/room.schema'
import { toApiError } from '@/services/api/api-error'
import type { RoomCategory } from '@/types/room-category'

const props = defineProps<{ page?: boolean; roomId?: number | null; statusOnly?: boolean }>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.roomId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
let nextBedKey = 0
const form = reactive({
  name: '',
  room_category_id: '' as number | string,
  price: '' as number | string,
  room_beds: [{ key: nextBedKey++, bed_type: '', qty: 1 as number | string }],
  status: '',
})
const categories = ref<RoomCategory[]>([])
const missingCategory = computed(
  () =>
    editing.value &&
    form.room_category_id !== '' &&
    !categories.value.some((category) => category.id === form.room_category_id),
)
const loading = ref(true)
const saving = ref(false)
defineExpose({ saving })
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
    const [options, room] = await Promise.all([
      props.statusOnly ? Promise.resolve([]) : roomCategoryService.listOptions(active.signal),
      props.roomId != null ? roomService.get(props.roomId, active.signal) : Promise.resolve(null),
    ])
    if (disposed || active.signal.aborted) return
    categories.value = options
    if (room) {
      if (room.id !== props.roomId)
        throw new Error('The API returned a different room. Please retry.')
      form.name = room.name
      form.room_category_id = room.room_category_id
      form.price = room.price
      form.status = room.status ?? ''
      if (!props.statusOnly) {
        if (!Array.isArray(room.room_beds))
          throw new Error('Room details did not include beds. Please retry.')
        form.room_beds = room.room_beds.map((bed) => ({
          key: nextBedKey++,
          bed_type: bed.bed_type,
          qty: bed.qty,
        }))
      }
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
      dialog.value?.querySelector<HTMLInputElement>('input')?.focus()
    }
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  if (!props.page) dialog.value?.showModal()
  void load()
})
onBeforeUnmount(() => {
  disposed = true
  controller?.abort()
  if (!props.page) dialog.value?.close()
  if (!props.page) previousFocus?.focus()
})
function close() {
  if (!saving.value) emit('close')
}
function addBed() {
  form.room_beds.push({ key: nextBedKey++, bed_type: '', qty: 1 })
  errors.value = {}
}
function removeBed(index: number) {
  form.room_beds.splice(index, 1)
  errors.value = {}
}

async function submit() {
  if (saving.value || loading.value || loadError.value || disposed) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    if (props.statusOnly) {
      if (props.roomId == null) throw new Error('Select a room to update its status.')
      const payload = await roomStatusSchema.validate(
        { status: form.status },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await roomService.updateStatus(props.roomId, payload)
    } else {
      const input = {
        name: form.name,
        room_category_id: form.room_category_id,
        price: form.price,
        room_beds: form.room_beds.map(({ bed_type, qty }) => ({ bed_type, qty })),
      }
      if (props.roomId != null) {
        const payload = await updateRoomSchema.validate(
          { ...input, id: props.roomId },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await roomService.update(payload)
      } else {
        const payload = await createRoomSchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (disposed) return
        await roomService.create(payload)
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
  <component
    :is="page ? 'section' : 'dialog'"
    data-form-surface
    :class="{ 'form-page': page }"
    ref="dialog"
    class="room-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <component :is="page ? 'h1' : 'h2'" :id="`${prefix}-title`">
          {{ statusOnly ? 'Update room status' : editing ? 'Edit room' : 'Add room' }}
        </component>
        <button
          type="button"
          :aria-label="page ? 'Back to list' : 'Close dialog'"
          :disabled="saving"
          @click="close"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <p v-if="loading" role="status">Loading room information...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else>
        <p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <fieldset :disabled="saving">
          <template v-if="statusOnly">
            <p>{{ form.name }} &middot; ID {{ roomId }}</p>
            <div class="field">
              <label :for="`${prefix}-status`">Status</label>
              <input
                :id="`${prefix}-status`"
                v-model="form.status"
                name="status"
                :list="`${prefix}-statuses`"
                required
                :aria-invalid="!!errors.status"
                :aria-describedby="errors.status ? `${prefix}-status-error` : undefined"
              />
              <datalist :id="`${prefix}-statuses`">
                <option value="cleaning">Cleaning</option>
              </datalist>
              <span v-if="errors.status" :id="`${prefix}-status-error`" class="error">{{
                errors.status
              }}</span>
            </div>
          </template>
          <template v-else>
            <div class="field">
              <label :for="`${prefix}-name`">Room name</label>
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
              <label :for="`${prefix}-category`">Room category</label>
              <select
                :id="`${prefix}-category`"
                v-model="form.room_category_id"
                name="room_category_id"
                required
                :aria-invalid="!!errors.room_category_id"
                :aria-describedby="errors.room_category_id ? `${prefix}-category-error` : undefined"
              >
                <option value="" disabled>Choose a category</option>
                <option v-if="missingCategory" :value="form.room_category_id">
                  Category #{{ form.room_category_id }} (not in list)
                </option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <small v-if="!categories.length"
                >No room categories found. Create a category first.</small
              >
              <span v-if="errors.room_category_id" :id="`${prefix}-category-error`" class="error">{{
                errors.room_category_id
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-price`">Price</label>
              <input
                :id="`${prefix}-price`"
                v-model="form.price"
                name="price"
                type="number"
                min="0"
                step="any"
                required
                :aria-invalid="!!errors.price"
                :aria-describedby="errors.price ? `${prefix}-price-error` : undefined"
              />
              <span v-if="errors.price" :id="`${prefix}-price-error`" class="error">{{
                errors.price
              }}</span>
            </div>
            <div class="beds-heading">
              <h3>Beds</h3>
              <button type="button" @click="addBed">Add bed</button>
            </div>
            <p v-if="errors.room_beds" role="alert" class="error">{{ errors.room_beds }}</p>
            <div v-for="(bed, index) in form.room_beds" :key="bed.key" class="bed-row">
              <div class="field">
                <label :for="`${prefix}-bed-${bed.key}`">Bed type {{ index + 1 }}</label>
                <input
                  :id="`${prefix}-bed-${bed.key}`"
                  v-model="bed.bed_type"
                  :name="`room_beds[${index}].bed_type`"
                  :list="`${prefix}-bed-types`"
                  required
                  :aria-invalid="!!errors[`room_beds[${index}].bed_type`]"
                  :aria-describedby="
                    errors[`room_beds[${index}].bed_type`]
                      ? `${prefix}-bed-${bed.key}-error`
                      : undefined
                  "
                />
                <span
                  v-if="errors[`room_beds[${index}].bed_type`]"
                  :id="`${prefix}-bed-${bed.key}-error`"
                  class="error"
                  >{{ errors[`room_beds[${index}].bed_type`] }}</span
                >
              </div>
              <div class="field">
                <label :for="`${prefix}-qty-${bed.key}`">Quantity</label>
                <input
                  :id="`${prefix}-qty-${bed.key}`"
                  v-model="bed.qty"
                  :name="`room_beds[${index}].qty`"
                  type="number"
                  min="1"
                  step="1"
                  required
                  :aria-invalid="!!errors[`room_beds[${index}].qty`]"
                  :aria-describedby="
                    errors[`room_beds[${index}].qty`] ? `${prefix}-qty-${bed.key}-error` : undefined
                  "
                />
                <span
                  v-if="errors[`room_beds[${index}].qty`]"
                  :id="`${prefix}-qty-${bed.key}-error`"
                  class="error"
                  >{{ errors[`room_beds[${index}].qty`] }}</span
                >
              </div>
              <button
                type="button"
                :aria-label="`Remove bed ${index + 1}`"
                @click="removeBed(index)"
              >
                Remove
              </button>
            </div>
            <datalist :id="`${prefix}-bed-types`">
              <option value="king_bed">King bed</option>
              <option value="single_bed">Single bed</option>
            </datalist>
          </template>
        </fieldset>
      </template>
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button
        ><button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{
            saving
              ? 'Saving...'
              : statusOnly
                ? 'Update status'
                : editing
                  ? 'Save changes'
                  : 'Create room'
          }}
        </button>
      </footer>
    </form>
  </component>
</template>

<style scoped>
.room-modal {
  width: min(660px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.room-modal::backdrop {
  background: #0f172a80;
}
header,
footer,
.beds-heading {
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
.bed-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 100px auto;
  gap: 0.75rem;
  align-items: start;
  background: #f8fafc;
  padding: 0.8rem;
  border-radius: 8px;
}
.bed-row > button {
  margin-top: 1.45rem;
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
@media (max-width: 500px) {
  .bed-row {
    grid-template-columns: minmax(0, 1fr) 80px;
  }
  .bed-row > button {
    grid-column: 1 / -1;
    margin-top: 0;
  }
}
.form-page {
  width: 100%;
  max-width: 1100px;
  max-height: none;
  overflow: visible;
  margin: 0;
  box-shadow: none;
  background: white;
  box-sizing: border-box;
}
.form-page h1 {
  margin: 0;
  font-size: 1.5rem;
}
</style>

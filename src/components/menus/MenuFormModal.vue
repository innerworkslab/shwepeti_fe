<script setup lang="ts">
import AppIcon from '@/components/common/AppIcon.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import { ValidationError } from 'yup'
import { menuCategoryService } from '@/services/menu-category.service'
import { unitService } from '@/services/unit.service'
import type { MenuCategory } from '@/types/menu-category'
import type { Unit } from '@/types/unit'
import type { Item } from '@/types/item'
import { menuService } from '@/services/menu.service'
import { itemService } from '@/services/item.service'
import {
  createMenuSchema,
  updateMenuSchema,
  menuStatusSchema,
  menuAvailabilitySchema,
} from '@/schemas/menu.schema'
import { toApiError } from '@/services/api/api-error'

const props = defineProps<{
  page?: boolean
  menuId?: number | null
  mode?: 'edit' | 'status' | 'availability'
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const editing = computed(() => props.menuId != null)
const prefix = useId()
const dialog = ref<HTMLDialogElement | null>(null)
let nextRowKey = 0
function newRecipe() {
  return {
    key: nextRowKey++,
    item_id: '' as number | string,
    unit_id: '' as number | string,
    quantity: '' as number | string,
    remark: '',
  }
}
const form = reactive({
  name: '',
  code: '',
  description: '',
  menu_category_id: '' as number | string,
  price: '' as number | string,
  cost_price: '' as number | string,
  image_url: '',
  is_active: undefined as boolean | undefined,
  is_available: undefined as boolean | undefined,
  recipes: [] as ReturnType<typeof newRecipe>[],
})
const categories = ref<MenuCategory[]>([])
const items = ref<Item[]>([])
const units = ref<Unit[]>([])
const statusOnly = computed(() => props.mode === 'status')
const availabilityOnly = computed(() => props.mode === 'availability')
const detailsOnly = computed(() => statusOnly.value || availabilityOnly.value)
function missing(options: { id: number }[], id: number | string) {
  return id !== '' && !options.some((option) => option.id === Number(id))
}
function addRecipe() {
  form.recipes.push(newRecipe())
  errors.value = {}
}
function removeRecipe(index: number) {
  form.recipes.splice(index, 1)
  errors.value = {}
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

async function load() {
  if (disposed || (loading.value && controller)) return
  controller = new AbortController()
  const active = controller
  loading.value = true
  loadError.value = ''
  try {
    const [categoryOptions, unitOptions, itemOptions, menu] = await Promise.all([
      detailsOnly.value ? Promise.resolve([]) : menuCategoryService.listOptions(active.signal),
      detailsOnly.value ? Promise.resolve([]) : unitService.listOptions(active.signal),
      detailsOnly.value ? Promise.resolve([]) : itemService.listOptions(active.signal),
      props.menuId != null ? menuService.get(props.menuId, active.signal) : Promise.resolve(null),
    ])
    if (disposed || active.signal.aborted) return
    categories.value = categoryOptions
    units.value = unitOptions
    items.value = itemOptions
    if (menu) {
      if (menu.id !== props.menuId)
        throw new Error('The API returned a different menu. Please retry.')
      form.name = menu.name
      form.code = menu.code
      form.description = menu.description ?? ''
      form.menu_category_id = menu.menu_category_id
      form.price = menu.price
      form.cost_price = menu.cost_price ?? ''
      form.image_url = menu.image_url ?? ''
      form.is_active = menu.is_active
      form.is_available = menu.is_available
      form.recipes = (menu.recipes ?? []).map((row) => ({
        ...newRecipe(),
        item_id: row.item_id,
        unit_id: row.unit_id,
        quantity: row.quantity,
        remark: row.remark ?? '',
      }))
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
async function submit() {
  if (saving.value || loading.value || loadError.value || disposed) return
  saving.value = true
  errors.value = {}
  saveError.value = ''
  try {
    if (statusOnly.value) {
      if (props.menuId == null) throw new Error('Select a menu to update its status.')
      const payload = await menuStatusSchema.validate(
        { is_active: form.is_active },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await menuService.toggleActive(props.menuId, payload)
    } else if (availabilityOnly.value) {
      if (props.menuId == null) throw new Error('Select a menu to update availability.')
      const payload = await menuAvailabilitySchema.validate(
        { is_available: form.is_available },
        { abortEarly: false, stripUnknown: true },
      )
      if (disposed) return
      await menuService.toggleAvailable(props.menuId, payload)
    } else {
      const input = {
        name: form.name,
        code: form.code,
        description: form.description,
        menu_category_id: form.menu_category_id,
        price: form.price,
        cost_price: form.cost_price,
        image_url: form.image_url,
        recipes: form.recipes.map(({ item_id, unit_id, quantity, remark }) => ({
          item_id,
          unit_id,
          quantity,
          remark,
        })),
      }
      if (props.menuId != null) {
        const payload = await updateMenuSchema.validate(
          { ...input, id: props.menuId },
          { abortEarly: false, stripUnknown: true },
        )
        if (disposed) return
        await menuService.update(payload)
      } else {
        const payload = await createMenuSchema.validate(input, {
          abortEarly: false,
          stripUnknown: true,
        })
        if (disposed) return
        await menuService.create(payload)
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
    class="menu-modal"
    :aria-labelledby="`${prefix}-title`"
    @cancel.prevent="close"
  >
    <form novalidate :aria-busy="loading || saving" @submit.prevent="submit">
      <header>
        <component :is="page ? 'h1' : 'h2'" :id="`${prefix}-title`">
          {{
            statusOnly
              ? 'Update menu status'
              : availabilityOnly
                ? 'Update menu availability'
                : editing
                  ? 'Edit menu'
                  : 'Add menu'
          }}
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
      <p v-if="loading" role="status">Loading menu...</p>
      <div v-else-if="loadError" role="alert" class="error">
        <p>{{ loadError }}</p>
        <button type="button" @click="load">Try again</button>
      </div>
      <template v-else
        ><p v-if="saveError" role="alert" class="error">{{ saveError }}</p>
        <p v-if="errors.id" role="alert" class="error">{{ errors.id }}</p>
        <fieldset :disabled="saving">
          <p v-if="detailsOnly">{{ form.name }} &middot; ID {{ menuId }}</p>
          <template v-if="statusOnly"
            ><div class="field">
              <label :for="`${prefix}-is_active`">Status</label
              ><select
                :id="`${prefix}-is_active`"
                name="is_active"
                v-model="form.is_active"
                :aria-invalid="!!errors.is_active"
                :aria-describedby="errors.is_active ? `${prefix}-is_active-error` : undefined"
                required
              >
                <option :value="undefined" disabled>Choose status</option>
                <option :value="true">Active</option>
                <option :value="false">Inactive</option></select
              ><span v-if="errors.is_active" :id="`${prefix}-is_active-error`" class="error">{{
                errors.is_active
              }}</span>
            </div></template
          ><template v-else-if="availabilityOnly"
            ><div class="field">
              <label :for="`${prefix}-is_available`">Availability</label
              ><select
                :id="`${prefix}-is_available`"
                name="is_available"
                v-model="form.is_available"
                :aria-invalid="!!errors.is_available"
                :aria-describedby="errors.is_available ? `${prefix}-is_available-error` : undefined"
                required
              >
                <option :value="undefined" disabled>Choose availability</option>
                <option :value="true">Available</option>
                <option :value="false">Unavailable</option></select
              ><span
                v-if="errors.is_available"
                :id="`${prefix}-is_available-error`"
                class="error"
                >{{ errors.is_available }}</span
              >
            </div></template
          ><template v-else
            ><div class="field">
              <label :for="`${prefix}-menu_category_id`">Menu category</label
              ><select
                :id="`${prefix}-menu_category_id`"
                name="menu_category_id"
                v-model="form.menu_category_id"
                :aria-invalid="!!errors.menu_category_id"
                :aria-describedby="
                  errors.menu_category_id ? `${prefix}-menu_category_id-error` : undefined
                "
                required
              >
                <option value="" disabled>Choose a menu category</option>
                <option
                  v-if="missing(categories, form.menu_category_id)"
                  :value="form.menu_category_id"
                >
                  Category #{{ form.menu_category_id }} (not in list)
                </option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option></select
              ><small v-if="!categories.length"
                >No menu categories found. Create a category first.</small
              ><span
                v-if="errors.menu_category_id"
                :id="`${prefix}-menu_category_id-error`"
                class="error"
                >{{ errors.menu_category_id }}</span
              >
            </div>
            <div class="field">
              <label :for="`${prefix}-name`">Name</label
              ><input
                :id="`${prefix}-name`"
                name="name"
                v-model="form.name"
                :aria-invalid="!!errors.name"
                :aria-describedby="errors.name ? `${prefix}-name-error` : undefined"
                required
              /><span v-if="errors.name" :id="`${prefix}-name-error`" class="error">{{
                errors.name
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-code`">Code</label
              ><input
                :id="`${prefix}-code`"
                name="code"
                v-model="form.code"
                :aria-invalid="!!errors.code"
                :aria-describedby="errors.code ? `${prefix}-code-error` : undefined"
                required
              /><span v-if="errors.code" :id="`${prefix}-code-error`" class="error">{{
                errors.code
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-description`">Description</label
              ><textarea
                :id="`${prefix}-description`"
                name="description"
                v-model="form.description"
                :aria-invalid="!!errors.description"
                :aria-describedby="errors.description ? `${prefix}-description-error` : undefined"
                rows="3"
              ></textarea
              ><span v-if="errors.description" :id="`${prefix}-description-error`" class="error">{{
                errors.description
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-price`">Price</label
              ><input
                :id="`${prefix}-price`"
                name="price"
                v-model="form.price"
                :aria-invalid="!!errors.price"
                :aria-describedby="errors.price ? `${prefix}-price-error` : undefined"
                type="number"
                min="0"
                step="any"
                required
              /><span v-if="errors.price" :id="`${prefix}-price-error`" class="error">{{
                errors.price
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-cost_price`">Cost price (optional)</label
              ><input
                :id="`${prefix}-cost_price`"
                name="cost_price"
                v-model="form.cost_price"
                :aria-invalid="!!errors.cost_price"
                :aria-describedby="errors.cost_price ? `${prefix}-cost_price-error` : undefined"
                type="number"
                min="0"
                step="any"
              /><span v-if="errors.cost_price" :id="`${prefix}-cost_price-error`" class="error">{{
                errors.cost_price
              }}</span>
            </div>
            <div class="field">
              <label :for="`${prefix}-image_url`">Image URL (optional)</label
              ><input
                :id="`${prefix}-image_url`"
                name="image_url"
                v-model="form.image_url"
                :aria-invalid="!!errors.image_url"
                :aria-describedby="errors.image_url ? `${prefix}-image_url-error` : undefined"
                type="url"
                placeholder="https://..."
              /><span v-if="errors.image_url" :id="`${prefix}-image_url-error`" class="error">{{
                errors.image_url
              }}</span>
            </div>
            <section class="recipes" aria-label="Recipes">
              <h3>Recipes</h3>
              <p v-if="!form.recipes.length">No recipe ingredients added.</p>
              <small v-if="!items.length">No items found. Create an item first.</small
              ><small v-if="!units.length">No units found. Create a unit first.</small>
              <div v-for="(row, index) in form.recipes" :key="row.key" class="recipe-row">
                <h4>Ingredient {{ index + 1 }}</h4>
                <div class="field">
                  <label :for="`${prefix}-recipe-${row.key}-item_id`">Item</label
                  ><select
                    :id="`${prefix}-recipe-${row.key}-item_id`"
                    :name="`recipes[${index}].item_id`"
                    v-model="row.item_id"
                    :aria-invalid="!!errors[`recipes[${index}].item_id`]"
                    :aria-describedby="
                      errors[`recipes[${index}].item_id`]
                        ? `${prefix}-recipe-${row.key}-item_id-error`
                        : undefined
                    "
                    required
                  >
                    <option value="" disabled>Choose item</option>
                    <option v-if="missing(items, row.item_id)" :value="row.item_id">
                      Item #{{ row.item_id }} (not in list)
                    </option>
                    <option v-for="option in items" :key="option.id" :value="option.id">
                      {{ option.name }}
                    </option></select
                  ><span
                    v-if="errors[`recipes[${index}].item_id`]"
                    :id="`${prefix}-recipe-${row.key}-item_id-error`"
                    class="error"
                    >{{ errors[`recipes[${index}].item_id`] }}</span
                  >
                </div>
                <div class="field">
                  <label :for="`${prefix}-recipe-${row.key}-unit_id`">Unit</label
                  ><select
                    :id="`${prefix}-recipe-${row.key}-unit_id`"
                    :name="`recipes[${index}].unit_id`"
                    v-model="row.unit_id"
                    :aria-invalid="!!errors[`recipes[${index}].unit_id`]"
                    :aria-describedby="
                      errors[`recipes[${index}].unit_id`]
                        ? `${prefix}-recipe-${row.key}-unit_id-error`
                        : undefined
                    "
                    required
                  >
                    <option value="" disabled>Choose unit</option>
                    <option v-if="missing(units, row.unit_id)" :value="row.unit_id">
                      Unit #{{ row.unit_id }} (not in list)
                    </option>
                    <option v-for="option in units" :key="option.id" :value="option.id">
                      {{ option.name }}
                    </option></select
                  ><span
                    v-if="errors[`recipes[${index}].unit_id`]"
                    :id="`${prefix}-recipe-${row.key}-unit_id-error`"
                    class="error"
                    >{{ errors[`recipes[${index}].unit_id`] }}</span
                  >
                </div>
                <div class="field">
                  <label :for="`${prefix}-recipe-${row.key}-quantity`">Quantity</label
                  ><input
                    :id="`${prefix}-recipe-${row.key}-quantity`"
                    :name="`recipes[${index}].quantity`"
                    v-model="row.quantity"
                    :aria-invalid="!!errors[`recipes[${index}].quantity`]"
                    :aria-describedby="
                      errors[`recipes[${index}].quantity`]
                        ? `${prefix}-recipe-${row.key}-quantity-error`
                        : undefined
                    "
                    type="number"
                    step="any"
                    min="0"
                    required
                  /><span
                    v-if="errors[`recipes[${index}].quantity`]"
                    :id="`${prefix}-recipe-${row.key}-quantity-error`"
                    class="error"
                    >{{ errors[`recipes[${index}].quantity`] }}</span
                  >
                </div>
                <div class="field">
                  <label :for="`${prefix}-recipe-${row.key}-remark`">Remark</label
                  ><input
                    :id="`${prefix}-recipe-${row.key}-remark`"
                    :name="`recipes[${index}].remark`"
                    v-model="row.remark"
                    :aria-invalid="!!errors[`recipes[${index}].remark`]"
                    :aria-describedby="
                      errors[`recipes[${index}].remark`]
                        ? `${prefix}-recipe-${row.key}-remark-error`
                        : undefined
                    "
                  /><span
                    v-if="errors[`recipes[${index}].remark`]"
                    :id="`${prefix}-recipe-${row.key}-remark-error`"
                    class="error"
                    >{{ errors[`recipes[${index}].remark`] }}</span
                  >
                </div>
                <button
                  type="button"
                  :aria-label="`Remove ingredient ${index + 1}`"
                  @click="removeRecipe(index)"
                >
                  <AppIcon name="remove" :size="16" /> Remove ingredient
                </button>
              </div>
              <button type="button" @click="addRecipe">
                <AppIcon name="add" :size="16" /> Add ingredient
              </button>
            </section>
          </template>
        </fieldset></template
      >
      <footer>
        <button type="button" :disabled="saving" @click="close">Cancel</button
        ><button type="submit" class="primary" :disabled="saving || loading || !!loadError">
          {{
            saving
              ? 'Saving...'
              : statusOnly
                ? 'Update status'
                : availabilityOnly
                  ? 'Update availability'
                  : editing
                    ? 'Save changes'
                    : 'Create menu'
          }}
        </button>
      </footer>
    </form>
  </component>
</template>
<style scoped>
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  accent-color: #1d4ed8;
}
small {
  color: #64748b;
}
.menu-modal {
  width: min(640px, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  color: #1e293b;
  box-shadow: 0 24px 64px #0f172a33;
}
.menu-modal::backdrop {
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
.recipes {
  display: grid;
  gap: 1rem;
}
.recipe-row {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}
h4 {
  margin: 0;
}
textarea {
  resize: vertical;
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

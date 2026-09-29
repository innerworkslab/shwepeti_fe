import { onBeforeUnmount, ref } from 'vue'
import { assetCategoryService } from '@/services/asset-category.service'
import { cashbookService } from '@/services/cashbook.service'
import { toApiError } from '@/services/api/api-error'
import type { AssetCategory } from '@/types/asset-category'
import type { Cashbook } from '@/types/cashbook'
export function useAssetLookups() {
  const categories = ref<AssetCategory[]>([])
  const cashbooks = ref<Cashbook[]>([])
  const loading = ref(false)
  const error = ref('')
  let controller: AbortController | undefined
  let disposed = false
  async function load() {
    controller?.abort()
    const active = new AbortController()
    controller = active
    loading.value = true
    error.value = ''
    const results = await Promise.allSettled([
      assetCategoryService.listOptions(active.signal),
      cashbookService.listOptions(active.signal),
    ])
    if (disposed || active.signal.aborted) return
    const [categoryResult, cashbookResult] = results
    if (categoryResult.status === 'fulfilled') categories.value = categoryResult.value
    if (cashbookResult.status === 'fulfilled') cashbooks.value = cashbookResult.value
    error.value = results
      .filter((result) => result.status === 'rejected')
      .map((result) => toApiError(result.reason).message)
      .join(' ')
    loading.value = false
  }
  onBeforeUnmount(() => {
    disposed = true
    controller?.abort()
  })
  return { categories, cashbooks, loading, error, load }
}

import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PosCashbooksView from '../PosCashbooksView.vue'
import { posApiClient } from '@/services/api/pos-client'
import { posCashbookService } from '@/services/pos-cashbook.service'
afterEach(() => vi.restoreAllMocks())
it('loads the POS envelope and displays balances without write actions', async () => {
 const get = vi.spyOn(posApiClient, 'get').mockResolvedValue({ data: { success: true, data: [{ id: 1, code: 'MAIN-CASH', name: 'Main Cash', type: 'cash', opening_balance: '0.00', current_balance: '12345.67', description: 'Main operating cashbook.', is_active: true }], meta: [] } })
 const w = mount(PosCashbooksView); await flushPromises()
 expect(get).toHaveBeenCalledExactlyOnceWith('/cashbooks', { signal: expect.any(AbortSignal) })
 expect(w.get('tbody').text()).toContain('12345.67'); expect(w.get('tbody').text()).toContain('Main Cash')
 expect(w.findAll('th').some(th => th.text() === 'Actions')).toBe(false)
 w.unmount()
})
it('rejects application errors and malformed lists', async () => {
 vi.spyOn(posApiClient, 'get').mockResolvedValueOnce({ data: { success: false, message: 'Denied' } }).mockResolvedValueOnce({ data: { success: true, data: {} } })
 await expect(posCashbookService.list()).rejects.toThrow('Denied')
 await expect(posCashbookService.list()).rejects.toThrow('Invalid cashbooks response')
})

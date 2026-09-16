import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataTable from '../DataTable.vue'

const props = {
  rows: [{ id: 'r1', name: 'Suite' }],
  columns: [{ key: 'name', label: 'Name', field: 'name' as const }],
  rowKey: (row: { id: string }) => row.id,
  total: 30,
  page: 1,
  perPage: 20,
  caption: 'Rooms',
}

describe('DataTable', () => {
  it('renders accessible table headers and emits search and pagination changes', async () => {
    const wrapper = mount(DataTable, { props })
    expect(wrapper.get('caption').text()).toBe('Rooms')
    expect(wrapper.get('th').attributes('scope')).toBe('col')
    expect(wrapper.get('tbody').text()).toBe('Suite')
    await wrapper.get('input').setValue('suite')
    await wrapper.get('select').setValue('50')
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(wrapper.emitted('update:search')).toEqual([['suite']])
    expect(wrapper.emitted('update:perPage')).toEqual([[50]])
    expect(wrapper.emitted('update:page')).toEqual([[2]])
    expect(wrapper.get('[aria-label="Previous page"]').attributes('disabled')).toBeDefined()
  })

  it('renders custom cells and filters', () => {
    const wrapper = mount(DataTable, {
      props,
      slots: {
        'cell-name': '<template #cell-name="{ row }">Room: {{ row.name }}</template>',
        filters: '<label>Status</label>',
      },
    })
    expect(wrapper.get('tbody').text()).toBe('Room: Suite')
    expect(wrapper.text()).toContain('Status')
  })

  it('separates loading, error, retry, and empty states', async () => {
    const wrapper = mount(DataTable, { props: { ...props, rows: [], total: 0, loading: true } })
    expect(wrapper.get('tbody').text()).toContain('Loading')
    expect(wrapper.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ loading: false, error: { message: 'Offline' } })
    expect(wrapper.get('[role="alert"]').text()).toContain('Offline')
    await wrapper.get('[role="alert"] button').trigger('click')
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    await wrapper.setProps({ error: null })
    expect(wrapper.get('tbody').text()).toContain('No records found')
    expect(wrapper.text()).toContain('0–0 of 0')
  })
})

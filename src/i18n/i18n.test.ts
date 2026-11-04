import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { t, setLocale, locale, enumLabel, dateLabel } from './index'
import LanguageSwitch from '@/components/common/LanguageSwitch.vue'
import DataTable from '@/components/common/DataTable.vue'
import catalog from './my.json'
import sourceMessages from './source-strings.json'
import { createUserSchema } from '@/schemas/user.schema'

afterEach(() => {
  setLocale('en')
  localStorage.clear()
  vi.restoreAllMocks()
})

it('covers the extracted interface text and preserves arbitrary data', () => {
  for (const source of sourceMessages)
    expect(catalog, source).toHaveProperty([source.toLowerCase()])
  setLocale('my')
  expect(t('Rooms')).toBe('အခန်းများ')
  expect(t('Name is required.')).toContain('လိုအပ်သည်')
  expect(t('Tax percentage must be a number.')).toContain('ကိန်းဂဏန်း')
  expect(t('Edit {0}', ['Chicken'])).toBe('Chicken ပြင်ရန်')
  expect(t('Unrecognised server message')).toBe('Unrecognised server message')
  expect(enumLabel('checked_in')).toBe('အခန်းဝင်ပြီး')
  expect(dateLabel(new Date(2026, 10, 4), { month: 'long' })).not.toBe('November')
})

it('switches immediately, persists the choice and updates document language', async () => {
  const w = mount(LanguageSwitch)
  expect(w.text()).toBe('EN')
  await w.get('button').trigger('click')
  expect(locale.value).toBe('my')
  expect(w.text()).toBe('မြန်မာ')
  expect(document.documentElement.lang).toBe('my')
  expect(localStorage.getItem('shwe-petit.locale')).toBe('my')
  localStorage.setItem('shwe-petit.locale', 'en')
  window.dispatchEvent(
    new StorageEvent('storage', { key: 'shwe-petit.locale', storageArea: localStorage }),
  )
  await nextTick()
  expect(w.text()).toBe('EN')
  w.unmount()
})

it('works when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked')
  })
  expect(() => setLocale('my')).not.toThrow()
  expect(locale.value).toBe('my')
})

it('uses Burmese calendar labels when the browser lacks Burmese ICU data', () => {
  vi.spyOn(Intl.DateTimeFormat, 'supportedLocalesOf').mockReturnValue([])
  setLocale('my')
  expect(dateLabel(new Date(2026, 10, 4), { month: 'long' })).toBe('နိုဝင်ဘာ')
  expect(dateLabel(new Date(2026, 10, 4), { weekday: 'short' })).toBe('ဗုဒ္ဓဟူး')
})

it('translates table headings and statuses without translating record names or changing search', async () => {
  const rows = [{ id: 1, name: 'Cash', status: 'checked_in' }]
  const w = mount(DataTable, {
    props: {
      rows,
      columns: [
        { key: 'name', label: 'Name', field: 'name' },
        { key: 'status', label: 'Status', field: 'status' },
      ],
      rowKey: (row: (typeof rows)[number]) => row.id,
      page: 1,
      perPage: 15,
      total: 1,
      search: 'Chicken',
    },
  })
  setLocale('my')
  await nextTick()
  expect(w.get('thead').text()).toContain('အမည်')
  expect(w.get('tbody').text()).toContain('Cash')
  expect(w.get('tbody').text()).toContain('အခန်းဝင်ပြီး')
  expect((w.get('input').element as HTMLInputElement).value).toBe('Chicken')
  setLocale('en')
  await nextTick()
  expect(w.get('thead').text()).toContain('Name')
  expect(w.emitted('update:search')).toBeUndefined()
  w.unmount()
})

it('keeps validated API identifiers and permission values in English', async () => {
  setLocale('my')
  const payload = {
    name: 'Cash',
    email: 'staff@example.com',
    password: 'secret',
    role: 'hotel_administrator',
    portal_access: 'both',
    permissions: ['users.view'],
  }
  expect(await createUserSchema.validate(payload)).toEqual(payload)
  await flushPromises()
})

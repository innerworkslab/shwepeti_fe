import { afterEach, expect, it, vi } from 'vitest'
import { createRequestId } from '@/utils/uuid'
afterEach(() => vi.unstubAllGlobals())
it('uses the native generator when available', () => {
  const randomUUID = vi.fn(() => 'native-id')
  vi.stubGlobal('crypto', { randomUUID })
  expect(createRequestId()).toBe('native-id')
})
it('generates version 4 UUIDs without randomUUID', () => {
  const getRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto)
  vi.stubGlobal('crypto', { getRandomValues })
  const ids = Array.from({ length: 100 }, createRequestId)
  expect(new Set(ids).size).toBe(100)
  for (const id of ids)
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

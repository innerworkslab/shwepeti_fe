import { afterEach, expect, it, vi } from 'vitest'
import { currentDateTime } from './current-date-time'

afterEach(() => vi.useRealTimers())
it('formats the current local time and refreshes it on every call', () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 10, 6, 9, 5, 3))
  expect(currentDateTime()).toBe('2026-11-06 09:05:03')
  vi.advanceTimersByTime(2000)
  expect(currentDateTime()).toBe('2026-11-06 09:05:05')
})

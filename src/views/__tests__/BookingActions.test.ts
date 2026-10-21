import { posCashbookService } from '@/services/pos-cashbook.service'
vi.mock('@/services/pos-cashbook.service', () => ({ posCashbookService: { list: vi.fn() } }))
import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BookingActions from '@/components/pos/BookingActions.vue'
import { posBookingService } from '@/services/pos-booking.service'
vi.mock('@/services/pos-booking.service', () => ({
  posBookingService: { get: vi.fn(), checkIn: vi.fn(), checkout: vi.fn(), partialPayment: vi.fn() },
}))
afterEach(() => vi.resetAllMocks())
it.each(['partial', 'checkout'] as const)('validates and submits %s payment', async (mode) => {
  vi.mocked(posBookingService.get).mockResolvedValue({
    id: 1,
    status: 'checked_in',
    subtotal: '45000.00',
    discount_amount: '0.00',
    total_amount: '45000.00',
    paid_amount: '30000.00',
    balance_amount: '15000.00',
  } as never)
  vi.mocked(posCashbookService.list).mockResolvedValue([
    { id: 1, name: 'Main Cash', code: 'MAIN-CASH' },
  ] as never)
  const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
  await flushPromises()
  await w
    .findAll('button')
    .find((b) => b.text() === (mode === 'partial' ? 'Partial payment' : 'Check out'))!
    .trigger('click')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(posBookingService.checkout).not.toHaveBeenCalled()
  expect(posBookingService.partialPayment).not.toHaveBeenCalled()
  await w.get('[name="cashbook_id"]').setValue('1')
  if (mode === 'checkout') {
    await w.get('[name="tax_percentage"]').setValue(5)
    await w.get('[name="service_charge_percentage"]').setValue(10)
    expect(w.get('[name="tax_amount"]').attributes('readonly')).toBeDefined()
    expect((w.get('[name="amount"]').element as HTMLInputElement).value).toBe('21750')
  } else await w.get('[name="amount"]').setValue('15000')
  await w.get('[name="paid_at"]').setValue('2026-10-08T12:00')
  await w.get('[name="payment_method"]').setValue('kpay')
  await w.get('[name="note"]').setValue('Payment')
  await w.get('form').trigger('submit')
  await flushPromises()
  expect(
    mode === 'partial' ? posBookingService.partialPayment : posBookingService.checkout,
  ).toHaveBeenCalledWith(
    1,
    {
      cashbook_id: 1,
      amount: mode === 'checkout' ? 21750 : 15000,
      paid_at: '2026-10-08 12:00:00',
      payment_method: 'kpay',
      note: 'Payment',
      ...(mode === 'checkout'
        ? {
            tax_percentage: 5,
            tax_amount: 2250,
            service_charge_percentage: 10,
            service_charge_amount: 4500,
          }
        : {}),
    },
    expect.any(AbortSignal),
  )
  expect(w.emitted('saved')).toHaveLength(1)
  w.unmount()
})
it('checks in a reserved booking and retains errors on failure', async () => {
  vi.mocked(posBookingService.get).mockResolvedValue({ id: 1, status: 'reserved' } as never)
  vi.mocked(posBookingService.checkIn).mockRejectedValue(new Error('Room unavailable'))
  vi.mocked(posCashbookService.list).mockResolvedValue([
    { id: 1, name: 'Main Cash', code: 'MAIN-CASH' },
  ] as never)
  const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
  await flushPromises()
  await w
    .findAll('button')
    .find((b) => b.text() === 'Check in')!
    .trigger('click')
  await flushPromises()
  expect(posBookingService.checkIn).toHaveBeenCalledWith(1, expect.any(AbortSignal))
  expect(w.text()).toContain('Room unavailable')
  expect(w.emitted('saved')).toBeUndefined()
  w.unmount()
})

it('records full partial payment without checkout, then checks out only on click', async () => {
  const initial = {
    id: 1,
    status: 'checked_in',
    subtotal: '100',
    total_amount: '100',
    paid_amount: '0',
    balance_amount: '100',
    payments: [],
  }
  vi.mocked(posBookingService.get)
    .mockResolvedValueOnce(initial as never)
    .mockResolvedValue({ ...initial, paid_amount: '100', balance_amount: '0' } as never)
  vi.mocked(posCashbookService.list).mockResolvedValue([
    { id: 1, name: 'Cash', code: 'CASH' },
  ] as never)
  const w = mount(BookingActions, { props: { bookingId: 1, disabled: false } })
  try {
    await flushPromises()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Partial payment')!
      .trigger('click')
    await flushPromises()
    await w.get('[name="cashbook_id"]').setValue('1')
    await w.get('[name="amount"]').setValue('100')
    await w.get('[name="paid_at"]').setValue('2026-10-21T10:00')
    await w.get('form').trigger('submit')
    await flushPromises()
    expect(posBookingService.partialPayment).toHaveBeenCalledTimes(1)
    expect(posBookingService.checkout).not.toHaveBeenCalled()
    await w
      .findAll('button')
      .find((b) => b.text() === 'Check out')!
      .trigger('click')
    await flushPromises()
    expect(w.find('form').exists()).toBe(false)
    expect(posBookingService.checkout).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ amount: 0, cashbook_id: 1 }),
      expect.any(AbortSignal),
    )
  } finally {
    w.unmount()
  }
})

it('uses refreshed room invoice amounts even when booking details still have older totals', async () => {
  vi.mocked(posBookingService.get).mockResolvedValue({
    id: 1,
    status: 'checked_in',
    subtotal: '100',
    total_amount: '100',
    tax_amount: '0',
    paid_amount: '0',
    balance_amount: '100',
  } as never)
  const w = mount(BookingActions, {
    props: {
      bookingId: 1,
      disabled: false,
      roomBooking: { id: 1, total_amount: '150.00', tax_amount: '15.00' },
    },
  })
  try {
    await flushPromises()
    expect(w.text()).toContain('150.00')
    expect(w.text()).toContain('15.00')
    await w.setProps({
      refreshKey: 1,
      roomBooking: { id: 1, total_amount: '275.00', tax_amount: '25.00', balance_amount: '0.00' },
    })
    await flushPromises()
    expect(w.text()).toContain('275.00')
    expect(w.text()).toContain('25.00')
    expect(w.text()).not.toContain('150.00')
  } finally {
    w.unmount()
  }
})

it('shows the booking order breakdown and includes orders once in checkout', async () => {
  vi.mocked(posBookingService.get).mockResolvedValue({
    id: 1,
    status: 'checked_in',
    subtotal: '45000.00',
    discount_amount: '0.00',
    total_amount: '45000.00',
    room_total_amount: '45000.00',
    food_order_amount: '9540.00',
    service_order_amount: '0.00',
    order_amount: '9540.00',
    grand_total_amount: '54540.00',
    tax_amount: '0.00',
    paid_amount: '0.00',
    balance_amount: '54540.00',
  } as never)
  vi.mocked(posCashbookService.list).mockResolvedValue([])
  const w = mount(BookingActions, {
    props: { bookingId: 1, disabled: false, roomBooking: { id: 1, balance_amount: '45000.00' } },
  })
  try {
    await flushPromises()
    const labels = w.findAll('dt')
    const amount = (label: string) =>
      labels.find((d) => d.text() === label)?.element.nextElementSibling?.textContent
    expect(amount('Food orders')).toBe('9540.00')
    expect(amount('Service orders')).toBe('0.00')
    expect(amount('Grand total')).toBe('54540.00')
    expect(amount('Balance')).toBe('54540.00')
    await w
      .findAll('button')
      .find((b) => b.text() === 'Check out')!
      .trigger('click')
    expect((w.get('[name="amount"]').element as HTMLInputElement).value).toBe('54540')
  } finally {
    w.unmount()
  }
})

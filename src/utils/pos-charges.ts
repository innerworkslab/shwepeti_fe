// Both charges use the discounted subtotal independently; neither is compounded.
export function calculatePosCharges(
  subtotal: number,
  discount: number,
  tax: number,
  service: number,
) {
  const base = subtotal - discount
  const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  const tax_amount = round((base * tax) / 100)
  const service_charge_amount = round((base * service) / 100)
  return {
    tax_amount,
    service_charge_amount,
    total: round(base + tax_amount + service_charge_amount),
  }
}

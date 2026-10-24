export const reportDefinitions = {
  'profit-and-loss': { title: 'Financial Report', fields: 'name,amount' },
  'daily-summary': {
    title: 'Daily Summary Report',
    fields:
      'date,total_rooms,available_rooms,occupied_rooms,check_ins,check_outs,room_revenue,food_drink_revenue,other_bill_revenue,total_revenue,total_payment_received,refunds,net_payment_received,outstanding_balance',
  },
  'room-occupancy': {
    title: 'Room Occupancy',
    fields: 'booking_id,room,category,guest,check_in,check_out,duration_days,status',
  },
  'room-revenue': {
    title: 'Room Revenue',
    fields:
      'booking_id,date,room,guest,stay_type,room_charge,extra_time,discount,tax,service_charge,total',
  },
  'guest-balances': {
    title: 'Guest Balance',
    fields: 'booking_id,room,guest,total_charges,deposit,paid,refund,outstanding,payment_status',
  },
  'food-sales': {
    title: 'Food Sale',
    fields:
      'date,order_no,room,menu_id,menu_item,category_id,category,qty,unit_price,amount,status',
  },
  'top-selling-items': { title: 'Top Selling Items', fields: 'menu_id,item,qty_sold,revenue' },
  // Provisional columns until a populated other-bills response is available.
  'other-bills': { title: 'Other Bill', fields: 'date,room,item,qty,unit_price,amount,status' },
  'inventory-balance': {
    title: 'Inventory Balance',
    fields:
      'item_id,item,category,unit,current_stock,minimum_stock,status,opening,stock_in,stock_out,adjustment',
  },
  'low-stock': {
    title: 'Low Stock',
    fields: 'item_id,item,category,unit,current_stock,minimum_stock,status',
  },
  depreciation: {
    title: 'Depreciation',
    fields: 'asset_id,asset,original_value,month,monthly_depreciation,accumulated,book_value',
  },
} as const
export type AdminReport = keyof typeof reportDefinitions
export const reportLinks = (Object.keys(reportDefinitions) as AdminReport[])
  .filter((key) => key !== 'profit-and-loss')
  .map((key) => ({ key, title: reportDefinitions[key].title, to: `/reports/${key}` }))
export function reportLabel(key: string) {
  return key
    .split('_')
    .map((word) => (word === 'id' ? 'ID' : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

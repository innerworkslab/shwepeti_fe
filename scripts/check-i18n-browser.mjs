import fs from 'node:fs'
const pages = await (await fetch('http://127.0.0.1:9333/json')).json()
const ws = new WebSocket(pages.find((p) => p.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let id = 0
const pending = new Map()
const errors = []
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id
    pending.set(n, { resolve, reject })
    ws.send(JSON.stringify({ id: n, method, params }))
  })
}
ws.addEventListener('message', async (e) => {
  const m = JSON.parse(e.data)
  if (m.id) {
    const p = pending.get(m.id)
    pending.delete(m.id)
    if (m.error) p?.reject(m.error)
    else p?.resolve(m.result)
  } else if (m.method === 'Runtime.exceptionThrown')
    errors.push(
      m.params.exceptionDetails.text + ': ' + m.params.exceptionDetails.exception?.description,
    )
  else if (m.method === 'Fetch.requestPaused') {
    const u = new URL(m.params.request.url)
    let body = { success: true, data: [], meta: [] }
    if (u.pathname.endsWith('/users'))
      body = {
        success: true,
        data: [
          {
            id: 1,
            name: 'Hotel Staff',
            email: 'staff@example.test',
            role: 'front_office_administrator',
            portal_access: 'both',
          },
        ],
        meta: { current_page: 1, per_page: 15, total: 1, last_page: 1 },
      }
    if (u.pathname.endsWith('/permissions'))
      body = {
        success: true,
        data: [
          {
            group: 'users',
            label: 'Users',
            permissions: [
              { name: 'users.view', label: 'View' },
              { name: 'users.create', label: 'Create' },
              { name: 'users.update', label: 'Update' },
            ],
          },
        ],
        meta: [],
      }
    if (u.pathname.endsWith('/booking-dashboard')) {
      const start = u.searchParams.get('start_date')
      const end = u.searchParams.get('end_date')
      const dates = []
      let current = new Date(start + 'T00:00:00')
      while (current <= new Date(end + 'T23:59:59')) {
        dates.push({ date: current.toISOString().slice(0, 10), label: '' })
        current.setDate(current.getDate() + 1)
      }
      body = {
        success: true,
        data: {
          start_date: start,
          end_date: end,
          dates,
          room_categories: [
            {
              id: 1,
              name: 'Standard',
              availability: dates.map((d) => ({
                date: d.date,
                total_count: 2,
                booked_count: 0,
                available_count: 2,
              })),
              rooms: [
                { id: 1, name: 'Room 101', status: 'available', price: '45000' },
                { id: 2, name: 'Room 102', status: 'available', price: '45000' },
              ],
              bookings: [],
            },
          ],
        },
        meta: [],
      }
    }
    await send('Fetch.fulfillRequest', {
      requestId: m.params.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Access-Control-Allow-Origin', value: '*' },
        { name: 'Access-Control-Allow-Headers', value: 'authorization,content-type' },
        { name: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
      ],
      body: Buffer.from(JSON.stringify(body)).toString('base64'),
    })
  }
})
await send('Runtime.enable')
await send('Page.enable')
await send('Fetch.enable', { patterns: [{ urlPattern: '*/api/v1/*' }] })
await send('Emulation.setDeviceMetricsOverride', {
  width: 1366,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
})
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `localStorage.setItem('shwe-petit.locale','my');localStorage.setItem('shwe-petit.sidebar-collapsed','false');const session={token:'local-browser-test',user:{id:1,name:'Hotel Staff',email:'staff@example.test',role:'hotel_administrator',permissions:['users.view','users.create','users.update','users.manage_permissions','booking_dashboard.view','bookings.view','bookings.create','rooms.view','menus.view']}};localStorage.setItem('shwe-petit.session',JSON.stringify(session));localStorage.setItem('shwe-petit.pos-session',JSON.stringify(session));`,
})
async function evaluate(expression) {
  return (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.value
}
async function waitFor(expression) {
  for (let i = 0; i < 160; i++) {
    if (await evaluate(expression)) return
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error('Timed out: ' + expression)
}
const dir = 'C:/Users/Admin/.codex/visualizations/2026/09/15/01a0a458-e416-7762-95d7-daefb660dca1'
await send('Page.navigate', { url: 'http://127.0.0.1:5173/users' })
await waitFor("document.querySelector('tbody')?.textContent.includes('Hotel Staff')")
fs.writeFileSync(
  dir + '/burmese-admin.png',
  Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
)
console.log(
  'Admin:',
  await evaluate(
    "({lang:document.documentElement.lang,heading:document.querySelector('h1')?.textContent,flag:!!document.querySelector('.account .language-switch'),overflow:document.documentElement.scrollWidth>innerWidth})",
  ),
)
await evaluate("document.querySelector('.language-switch').click()")
await waitFor("document.documentElement.lang==='en'")
console.log('Switch back:', await evaluate("document.querySelector('h1')?.textContent"))
await evaluate(
  "document.querySelector('.language-switch').click();document.querySelector('.data-table__actions button.primary').click()",
)
await waitFor(
  "!!document.querySelector('[name=permissions]') || document.body.textContent.includes('ခွင့်ပြုချက်အားလုံး') || !!document.querySelector('[name=\"users.view\"]')",
)
fs.writeFileSync(
  dir + '/burmese-user-form.png',
  Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
)
await send('Page.navigate', { url: 'http://127.0.0.1:5173/pos' })
await waitFor("document.querySelector('.room-number')?.textContent.includes('Room 101')")
fs.writeFileSync(
  dir + '/burmese-pos.png',
  Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64'),
)
console.log(
  'POS:',
  await evaluate(
    "({lang:document.documentElement.lang,flag:!!document.querySelector('.pos-account .language-switch'),overflow:document.documentElement.scrollWidth>innerWidth})",
  ),
)
console.log('Burmese month:', await evaluate("document.querySelector('.month-row')?.textContent || document.querySelector('.month-nav')?.textContent"))
await send('Emulation.setDeviceMetricsOverride', {width:390,height:844,deviceScaleFactor:1,mobile:false})
console.log('POS mobile overflow:', await evaluate('document.documentElement.scrollWidth > innerWidth'))
fs.writeFileSync(dir+'/burmese-pos-mobile.png',Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'))
console.log('Browser errors:', errors)
ws.close()

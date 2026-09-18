# Shwe Petit Admin

Hotel management admin foundation using Vue 3, TypeScript, Vite, Vue Router, Pinia, and Axios.

## Run locally

Use Node.js `^22.18.0 || >=24.12.0`.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

A local `.env` is already provided in this workspace. Set `VITE_API_BASE_URL=http://localhost:8000` to the backend root. Services supply `/api/v1/admin/login` or `/api/v1/admin/...` paths; requests go directly to the configured host in development and production. No backend is included.

## Structure

```text
src/
  assets/styles/      Global styles and static assets
  components/common/  Shared UI components
  composables/        Reusable Vue state and behavior
  config/env.ts       Parsed environment configuration
  layouts/            Page shells
  router/             Route definitions and future guards
  services/
    api/client.ts     Shared Axios instance and token setter
    api/api-error.ts  Consistent API errors
    room.service.ts   Room list, detail, save, and status API
  stores/             Shared Pinia state (registered in main.ts)
  types/              Domain models and API contracts
  utils/              Framework-independent helpers
  views/              Route-level pages
```

Keep HTTP calls in services. Views and composables call services; stores hold state shared across pages. Add feature files such as `reservation.service.ts` and `reservation.ts` as features are implemented.

## Environment

Vite loads dotenv files automatically; a separate dotenv package is unnecessary. `.env` and mode files are ignored by Git; `.env.example` is the committed template. Use `.env.production` or deployment environment variables for production. Restart the dev server after changing values, and rebuild deployed assets.

| Variable | Default without an env file | Purpose |
| --- | --- | --- |
| `VITE_APP_NAME` | Shwe Petit Admin | Application title |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend root, without an `/api` suffix |
| `VITE_API_TIMEOUT` | `15000` | Positive request timeout in milliseconds |

All `VITE_*` values are public in the browser bundle. Keep secrets on the backend. An absolute backend URL requires that server to allow the frontend origin through CORS.

### Local Laravel connection

The shared Axios client uses `VITE_API_BASE_URL` directly in all modes. Services specify their exact route paths:

| Service path | Request URL |
| --- | --- |
| `/api/v1/admin/login` | `http://localhost:8000/api/v1/admin/login` |
| `/api/v1/admin/users` | `http://localhost:8000/api/v1/admin/users` |
| `/api/v1/admin/logout` | `http://localhost:8000/api/v1/admin/logout` |

There is no development proxy or automatic path prefix. Keep the host in `.env` without `/api`; each service controls its endpoint path. Bearer headers remain attached to authenticated requests. Restart `npm run dev` after environment changes. Laravel must allow the frontend origin through its CORS configuration.

## API usage

```ts
import { roomService } from '@/services/room.service'
import { ApiError } from '@/services/api/api-error'

try {
  const rooms = await roomService.list({ page: 1, perPage: 20 })
  console.log(rooms.data)
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.message, error.status, error.details)
  }
}
```

List services use `{ success, message, data, meta: { current_page, per_page, total, last_page } }`; adapt the service mapping if the backend returns a different pagination envelope. Room detail accepts a room directly or `{ data: room }`. Saves do not assume a response body and refresh the list afterward. TypeScript types do not validate server responses at runtime. The dashboard makes no API requests.

Axios handles JSON serialization. The response interceptor normalizes failed requests to `ApiError` with optional HTTP status, code, and response details. Cancellations remain Axios cancellation errors; pass an `AbortController.signal` to list/get and detect cancellation with `axios.isCancel(error)`.

Login now populates the session store and calls `setAccessToken(token)` on the shared Axios client. Every service request then includes `Authorization: Bearer <token>`. Tokens live in memory and reset on refresh. Token refresh and cookie authentication are not configured. Requests are not automatically retried.

## Navigation and authentication

The admin shell has a Shwe Petit monogram at the top left, the signed-in user's name/role and circular avatar at the top right, and a Log out button. The sidebar contains Dashboard, Rooms, Room categories, Item categories, and Users. Collapse it to icons using the sidebar control; desktop preference is stored in localStorage. On small screens, expanded navigation overlays the content and closes on navigation, backdrop click, or Escape.

- `/login` POSTs `{ email, password }` to the API `/api/v1/admin/login` endpoint.
- The confirmed response is `{ success: true, data: { token_type: 'Bearer', token, user }, ... }`. The response mapper retains only the user's ID, name, email, and role. Passwords and full API responses are not stored.
- The Pinia session store installs the returned token on the single Axios client, including for existing list/create/update/status services and logout.
- All admin routes require a local authenticated session; successful login returns to the requested protected page. Backend authorization still enforces access to API resources.
- Log out POSTs `/api/v1/admin/logout` with the bearer header, then clears the user and token and returns to `/login`. If the request fails, the session is retained and an error permits retry.
- Session state is in memory only. Reloading the browser requires signing in again; no token is persisted in localStorage or sessionStorage.

## Checks

```sh
npm run type-check
npm run build
npm run preview
npm run format
npm test
```

## Shared data tables

### Units

Visit `/units` from the sidebar. GET `/api/v1/admin/units` uses the shared table with search and pagination starting at page 1.

- Create: POST `/api/v1/admin/units` with `{ unit_group_id, name, symbol, is_base }`.
- Update: first GET `/api/v1/admin/units/:id`, then POST `/api/v1/admin/units` with those fields plus the existing `id`.
- Status pencil action: POST `/api/v1/admin/units/:id/toggle-active` with `{ is_active: true | false }`.

The validated form requires a unit group, name, and symbol. The base-unit checkbox sends a boolean, including `false`. The unit-group dropdown loads every page of the existing group list and preserves an existing group ID when it is absent from the options. Status is edited separately with a boolean select. Failed loads offer retry and block submission; failed saves retain input; successful saves refresh the table. List responses follow `{ success, message, data, meta: { current_page, per_page, total, last_page } }`; details can be direct or wrapped in `data`. The backend enforces any restriction on the number of base units per group.

### Unit groups

Visit `/unit-groups` from the sidebar. The page uses the shared searchable, paginated table with GET `/api/v1/admin/unit-groups` (starting at `page=1`). List responses follow `{ success, message, data, meta: { current_page, per_page, total, last_page } }`.

- Create: POST `/api/v1/admin/unit-groups` with `{ name }`; the backend generates the ID.
- Update: GET `/api/v1/admin/unit-groups/:id` to prefill the form, then POST `/api/v1/admin/unit-groups` with `{ id, name }`.
- Status pencil action: loads fresh details and POSTs `/api/v1/admin/unit-groups/:id/toggle-active` with `{ is_active: true | false }` using a boolean.

Yup trims and requires the name. Detail responses may be direct or wrapped in `data`. Failed loads block saving and offer retry; failed saves retain input. Requests are cancelled when loading dialogs close, duplicate submissions are prevented, and successful saves refresh the list.

### Rooms

Visit `/rooms` for the searchable, paginated list (GET `/api/v1/admin/rooms`, starting at `page=1`). The page displays room name, category, price, beds, and status.

- Create: POST `/api/v1/admin/rooms` with `{ name, room_category_id, price, room_beds: [{ bed_type, qty }] }`.
- Update: POST `/api/v1/admin/rooms` with the same fields plus `id`. The editor first loads GET `/api/v1/admin/rooms/:id` and sends the complete edited bed array.
- Status pencil action: loads the selected room, then POSTs `/api/v1/admin/rooms/:id/status` with only `{ status }`.

The category dropdown uses the existing room-category list, loading all pages with cancellation and pagination checks. If an existing category is absent from the results, its ID remains visible instead of silently selecting another category. The form blocks saving while details/options are unavailable and provides retry.

Yup requires a name, category, nonnegative finite price, and at least one bed. Every bed needs a type and positive whole-number quantity. Bed rows can be added and removed. `king_bed` and `single_bed` are suggestions; custom bed types remain allowed. `cleaning` is a status suggestion; other statuses can be entered until the full backend enums are supplied. The table's status filter applies when the value is committed (Enter or leaving the field). No currency or additional enum values are assumed.

### Users

Visit `/users` from the main navigation. The shared table requests GET `/api/v1/admin/users` starting at `page=1`, using the existing `page`, `perPage`, and `search` query convention and `{ success, message, data, meta: { current_page, per_page, total, last_page } }` list response contract. Editing first GETs `/api/v1/admin/users/:id`; the service expects a user object directly. Adapt these response mappings in `user.service.ts` if the backend wraps them differently.

Create and update both POST `/api/v1/admin/users` with `{ name, email, password, role }`; updates also include the selected `id`. There are no status or delete actions. Yup requires all four fields and validates email syntax. Passwords are required on both operations to match the supplied API payload; they are never prefilled, trimmed, displayed in the table, or stored persistently. Role is a text input with `front_office_administrator` as a suggestion because no full role list was supplied. The backend validates allowed roles and its password policy.

Detail-fetch failures block saving and allow retry. Closing while loading cancels the detail request. Successful saves close the modal and refresh the current table query; failed saves retain input for retry.

### Item categories

Visit `/item-categories` from the main navigation. The page uses `DataTable` and `useDataTable` with GET `/api/v1/admin/item-categories` and the same `{ success, message, data, meta: { current_page, per_page, total, last_page } }` list response contract.

- Create: POST `/api/v1/admin/item-categories` with `{ parent_id, name, code, description }`.
- Update: POST `/api/v1/admin/item-categories` with the same fields plus the existing `id`.
- Pencil status action: POST `/api/v1/admin/item-categories/:id/toggle-active` with only `{ is_active }`.

The Yup-validated modal requires name and code. Blank description and parent ID become `null`; a supplied parent ID must be a positive integer. The parent ID field allows selecting a parent outside the currently loaded table page. Updates reject a category's own ID as its parent; the backend must validate parent existence and hierarchy cycles. Status is managed separately from the details form. Successful saves refresh the table; failures preserve input for retry.

### Room categories

Visit `/room-categories` from the main navigation. The page uses the shared table to GET `/api/v1/admin/room-categories` with `page`, `perPage`, and `search`. As with the room service, the expected list response is `{ success, message, data, meta: { current_page, per_page, total, last_page } }`; map a different backend envelope in `room-category.service.ts`.

The Add/Edit modal uses [Yup schemas](https://github.com/jquense/yup) in `src/schemas/room-category.schema.ts`. Name and description are required and trimmed. Both operations POST to `/room-categories`:

- Create: `{ name, description }`. The backend generates the ID.
- Update: `{ id, name, description, is_active }`. The existing ID is retained; status is a boolean. When the list omits status, the editor requires an explicit selection.
- The pencil action opens a status-only modal showing the selected name and ID. It POSTs `/room-categories/:id/toggle-active` with only `{ is_active: true | false }`, then refreshes the table. The existing Edit action opens the full details form.

Failed saves retain form values and display the API error. Successful saves close the modal and refresh the current table query. The native dialog provides modal focus containment and Escape-to-close; closing and repeat submissions are disabled during a save. Save response bodies are not assumed because the list is fetched again.

Use `src/components/common/DataTable.vue` for table rendering and `src/composables/useDataTable.ts` for server data. The `/rooms` page is a complete example using `roomService.list`; it requires the configured backend. The dashboard still makes no API calls.

```ts
const {
  rows, total, page, perPage, search, filters, loading, error,
  setPage, setPerPage, setSearch, setFilters, reset, refresh,
} = useDataTable<Room, { status?: RoomStatus }>(roomService.list, {
  initialPerPage: 20,
  initialFilters: { status: undefined },
  debounceMs: 300,
})
```

```vue
<DataTable
  :rows="rows" :columns="columns" :row-key="(room: Room) => room.id"
  :total="total" :page="page" :per-page="perPage" :search="search"
  :loading="loading" :error="error" caption="Rooms"
  @update:page="setPage" @update:per-page="setPerPage"
  @update:search="setSearch" @refresh="refresh"
/>
```

Define columns as `DataTableColumn<Room>[]`, e.g. `{ key: 'name', label: 'Room', field: 'name' }`. `format(row)` formats a value; slot-only columns can omit `field`. Always supply a stable, unique row key.

- Service signature: `(params, signal?) => Promise<{ success, message, data, meta: { current_page, per_page, total, last_page } }>`. Pass a collection GET method, not a single-record GET. Query parameters are `{ ...filters, page, perPage, search }`, with one-based pages. Adapt different API envelopes/parameter names inside the service. Bind service methods that depend on `this`.
- Returned state is exposed through read-only computed refs; use the setters to change queries. Destructure refs at the top level for Vue template unwrapping. Call the composable during setup so requests and timers are cleaned up on unmount.
- Search is trimmed before sending and debounced (300 ms by default). Search, filters, and page-size changes reset to page one. Pagination/filter changes and `refresh()` fetch immediately. A query change cancels old work, and outdated responses are ignored even if the service ignores cancellation.
- Filters are flat scalar values (string, number, boolean, null, undefined). `setFilters()` merges values; use `undefined` to remove an optional filter from Axios query serialization. Keep `page`, `perPage`, and `search` reserved for the composable. `reset()` clears search and restores initial filters while retaining page size.
- `refresh()` can be awaited after create/update/delete; it reports failures through `error` instead of throwing. An out-of-range page is corrected with at most one extra request. Set `immediate: false` to defer the first request until `refresh()` or a query change.
- Component slots: `filters`, `toolbar`, `cell-{key}` (`row`, `column`, `value`), `header-{key}` (`column`), `loading`, `empty`, and `error` (`error`, `retry`). Use the filters slot for feature-specific controls calling `setFilters()`.
- Optional component props include `searchable`, `searchPlaceholder`, and `pageSizes` (default `[10, 20, 50, 100]`). Search and pagination run on the server; the component does not filter or slice rows locally.

Tests cover requests, debounce, cancellation, pagination correction, filters, retry, and component events/slots. Run `npm test` once or `npm run test:watch` during development. The implementation follows Vue's [typed Composition API](https://vuejs.org/guide/typescript/composition-api.html) and [generic components](https://vuejs.org/api/sfc-script-setup.html#generics).

References: [Vite environment variables](https://vite.dev/guide/env-and-mode), [Axios instances](https://axios-http.com/docs/instance).

Table services normalize the backend collection envelope into `{ data, total, page, perPage }` for the shared composable and dropdown loaders. Pagination uses the page size returned by the backend.

## Items

Visit `/items` from the sidebar. The shared table lists GET `/api/v1/admin/items` with pagination and search using the standard collection envelope.

- Create: POST `/api/v1/admin/items` with `item_category_id`, `name`, `code`, `stock_unit_id`, nullable `description`, nonnegative `min_stock`, and `item_unit_conversions`.
- Update: GET `/api/v1/admin/items/:id` for fresh details, then POST the same collection endpoint with `id` and the complete conversion array.
- Status: POST `/api/v1/admin/items/:id/toggle-active` with boolean `is_active`.
- Price: POST `/api/v1/admin/items/price` with only `{ item_id, price }`. No currency is assumed.

Category and unit dropdowns load all pages from the existing services. Conversions can be added or removed; each row requires source/destination unit IDs and a positive, finite factor. An empty conversion array is allowed. Price and minimum stock accept zero and decimal values. Edit, status, and price dialogs load fresh details, support retry, and prevent duplicate submissions. All requests use the shared bearer token.

## Warehouses

Visit `/warehouses` from the sidebar for the searchable, paginated table. All endpoints use the `/api/v1/admin` prefix and shared bearer token.

- GET `/warehouses` lists records using the standard `data` and `meta` envelope.
- POST `/warehouses` creates with `{ name, code }`; updates include `id`.
- GET `/warehouses/:id` loads fresh details for editing and status changes.
- POST `/warehouses/:id/toggle-active` sends `{ is_active: true | false }`.

The Yup-validated form requires name and code. The status pencil opens a separate selection modal. Successful saves refresh the table; load/save failures support retry.

## Stock In

Visit `/stock-ins` for the searchable, paginated list. GET `/api/v1/admin/stock-ins` uses the standard collection envelope.

- Create: POST `/api/v1/admin/stock-ins` with `{ warehouse_id, transaction_date, items: [{ item_id, unit_id, quantity, unit_cost }] }`.
- Status pencil: POST `/api/v1/admin/stock-ins/:id/status` with `{ status: "posted" | "cancelled" }`.

The creation modal loads all warehouse, item, and unit options. It requires a date/time and at least one item, with positive finite quantities and nonnegative finite unit costs. Date/time is sent as `YYYY-MM-DD HH:mm:ss`, preserving the entered local time. Dynamic rows can be added or removed. No edit or detail endpoint is assumed; the status modal identifies the selected list record and submits only its status. Backend errors remain visible for retry, and successful submissions refresh the list.

## Transfers

Visit `/inventory-transfers` from the sidebar. GET `/api/v1/admin/inventory-transfers` uses the standard paginated response.

- Create: POST `/api/v1/admin/inventory-transfers` with `{ from_warehouse_id, to_warehouse_id, transaction_date, remark, items: [{ item_id, unit_id, quantity, expiry_date }] }`.
- Status: POST `/api/v1/admin/inventory-transfers/:id/status` with `{ status: "posted" }`. Posted is the only supported selection.

The form loads warehouse, item, and unit dropdowns, requires different warehouses, at least one item, positive finite quantities, and valid expiry dates (`YYYY-MM-DD`). Remarks may be left blank. Transaction time is sent as entered in `YYYY-MM-DD HH:mm:ss` format. Successful creation/status updates refresh the table. No detail or edit endpoint is assumed.

## Adjustments

Visit `/inventory-adjustments` for the paginated list. GET `/api/v1/admin/inventory-adjustments` accepts `date_from` and `date_to` (`YYYY-MM-DD`). Apply/Clear dates resets pagination; reversed ranges are rejected. Dates start blank.

As confirmed by the backend contract, creation uses POST `/api/v1/admin/inventory-transfers` with the transfer payload (`from_warehouse_id`, `to_warehouse_id`, `transaction_date`, `remark`, and item/unit/quantity/expiry rows). Status updates use POST `/api/v1/admin/inventory-transfers/:id/status` with `{ status: "posted" }`. The existing validated transfer form is reused with Adjustment labels and item/warehouse/unit dropdowns. Successful mutations reload the adjustments list while preserving its filters.

## Menu Categories

Visit `/menu-categories` for the searchable, paginated list. All endpoints use `/api/v1/admin` and the shared bearer token.

- GET `/menu-categories` uses the standard collection envelope.
- POST `/menu-categories` creates with `{ name, code, description, sort_order }`; updates include `id`, following the existing create/update convention.
- GET `/menu-categories/:id` loads fresh details before editing or changing status.
- POST `/menu-categories/:id/toggle-active` sends boolean `is_active`.

Name and code are required, description may be blank, and sort order is a nonnegative integer defaulting to zero. The modal uses Yup validation, preserves input on failure, supports retry, and prevents duplicate submissions. Successful saves refresh the list.

## Menus

Visit `/menus` for search, pagination, and Active/Inactive/All filtering (Active is selected initially, sending `is_active=1`; Inactive sends `0`, All omits the filter).

All endpoints use `/api/v1/admin`: GET `/menus`, GET `/menus/:id`, POST `/menus` for create/update (update includes `id`), POST `/menus/:id/toggle-active` with boolean `is_active`, and POST `/menus/:id/toggle-available` with boolean `is_available`.

The Yup-validated form loads all category/item/unit pages and supports adding/removing recipe rows. Each recipe has item, unit, positive quantity, and remark. Name/category/code/price are required; prices cannot be negative. Blank cost price and image URL become null; zero cost remains zero. Image URLs accept HTTP(S). Description and remarks may be blank, and an empty recipe array is supported. Availability and active status use separate modals. Editing loads fresh details and successful mutations refresh the current filtered list.

## Inventory Ledger

Visit `/inventory-ledgers` for a read-only paginated/searchable list from GET `/api/v1/admin/inventory-ledgers`. It uses the standard collection envelope and bearer token. There are no create/edit/status controls or mutation methods.

Columns match the supplied response: transaction date/type, warehouse, item, unit, quantity, base quantity, balance quantity, unit/total costs, reference type/ID, batch, expiry date, remark, and creator. Related names are displayed with ID fallbacks. Decimal strings are preserved without rounding; null costs/dates display a dash. The shared table provides horizontal scrolling for the wide ledger.

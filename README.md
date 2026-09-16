# Shwe Petit Admin

Hotel management admin foundation using Vue 3, TypeScript, Vite, Vue Router, Pinia, and Axios.

## Run locally

Use Node.js `^22.18.0 || >=24.12.0`.

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

A local `.env` is already provided in this workspace. Set `VITE_API_BASE_URL` to your backend URL. The example assumes `http://localhost:8000/api`; no backend is included.

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
| `VITE_API_BASE_URL` | `/api` | Absolute HTTP(S) backend URL or same-origin path |
| `VITE_API_TIMEOUT` | `15000` | Positive request timeout in milliseconds |

All `VITE_*` values are public in the browser bundle. Keep secrets on the backend. An absolute backend URL requires that server to allow the frontend origin through CORS; `/api` requires a same-origin backend or reverse proxy.

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

List services use `{ data, total, page, perPage }`; adapt the service mapping if the backend returns a different pagination envelope. Room detail accepts a room directly or `{ data: room }`. Saves do not assume a response body and refresh the list afterward. TypeScript types do not validate server responses at runtime. The dashboard makes no API requests.

Axios handles JSON serialization. The response interceptor normalizes failed requests to `ApiError` with optional HTTP status, code, and response details. Cancellations remain Axios cancellation errors; pass an `AbortController.signal` to list/get and detect cancellation with `axios.isCancel(error)`.

Login now populates the session store and calls `setAccessToken(token)` on the shared Axios client. Every service request then includes `Authorization: Bearer <token>`. Tokens live in memory and reset on refresh. Token refresh and cookie authentication are not configured. Requests are not automatically retried.

## Navigation and authentication

The admin shell has a Shwe Petit monogram at the top left, the signed-in user's name/role and circular avatar at the top right, and a Log out button. The sidebar contains Dashboard, Rooms, Room categories, Item categories, and Users. Collapse it to icons using the sidebar control; desktop preference is stored in localStorage. On small screens, expanded navigation overlays the content and closes on navigation, backdrop click, or Escape.

- `/login` POSTs `{ email, password }` to the API `/login` endpoint.
- The confirmed response is `{ success: true, data: { token_type: 'Bearer', token, user }, ... }`. The response mapper retains only the user's ID, name, email, and role. Passwords and full API responses are not stored.
- The Pinia session store installs the returned token on the single Axios client, including for existing list/create/update/status services and logout.
- All admin routes require a local authenticated session; successful login returns to the requested protected page. Backend authorization still enforces access to API resources.
- Log out POSTs `/logout` with the bearer header, then clears the user and token and returns to `/login`. If the request fails, the session is retained and an error permits retry.
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

### Rooms

Visit `/rooms` for the searchable, paginated list (GET `/rooms`, starting at `page=1`). The page displays room name, category, price, beds, and status.

- Create: POST `/rooms` with `{ name, room_category_id, price, room_beds: [{ bed_type, qty }] }`.
- Update: POST `/rooms` with the same fields plus `id`. The editor first loads GET `/rooms/:id` and sends the complete edited bed array.
- Status pencil action: loads the selected room, then POSTs `/rooms/:id/status` with only `{ status }`.

The category dropdown uses the existing room-category list, loading all pages with cancellation and pagination checks. If an existing category is absent from the results, its ID remains visible instead of silently selecting another category. The form blocks saving while details/options are unavailable and provides retry.

Yup requires a name, category, nonnegative finite price, and at least one bed. Every bed needs a type and positive whole-number quantity. Bed rows can be added and removed. `king_bed` and `single_bed` are suggestions; custom bed types remain allowed. `cleaning` is a status suggestion; other statuses can be entered until the full backend enums are supplied. The table's status filter applies when the value is committed (Enter or leaving the field). No currency or additional enum values are assumed.

### Users

Visit `/users` from the main navigation. The shared table requests GET `/users` starting at `page=1`, using the existing `page`, `perPage`, and `search` query convention and `{ data, total, page, perPage }` list response contract. Editing first GETs `/users/:id`; the service expects a user object directly. Adapt these response mappings in `user.service.ts` if the backend wraps them differently.

Create and update both POST `/users` with `{ name, email, password, role }`; updates also include the selected `id`. There are no status or delete actions. Yup requires all four fields and validates email syntax. Passwords are required on both operations to match the supplied API payload; they are never prefilled, trimmed, displayed in the table, or stored persistently. Role is a text input with `front_office_administrator` as a suggestion because no full role list was supplied. The backend validates allowed roles and its password policy.

Detail-fetch failures block saving and allow retry. Closing while loading cancels the detail request. Successful saves close the modal and refresh the current table query; failed saves retain input for retry.

### Item categories

Visit `/item-categories` from the main navigation. The page uses `DataTable` and `useDataTable` with GET `/item-categories` and the same `{ data, total, page, perPage }` list response contract.

- Create: POST `/item-categories` with `{ parent_id, name, code, description }`.
- Update: POST `/item-categories` with the same fields plus the existing `id`.
- Pencil status action: POST `/item-categories/:id/toggle-active` with only `{ is_active }`.

The Yup-validated modal requires name and code. Blank description and parent ID become `null`; a supplied parent ID must be a positive integer. The parent ID field allows selecting a parent outside the currently loaded table page. Updates reject a category's own ID as its parent; the backend must validate parent existence and hierarchy cycles. Status is managed separately from the details form. Successful saves refresh the table; failures preserve input for retry.

### Room categories

Visit `/room-categories` from the main navigation. The page uses the shared table to GET `/room-categories` with `page`, `perPage`, and `search`. As with the room service, the expected list response is `{ data, total, page, perPage }`; map a different backend envelope in `room-category.service.ts`.

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

- Service signature: `(params, signal?) => Promise<{ data, total, page, perPage }>`. Pass a collection GET method, not a single-record GET. Query parameters are `{ ...filters, page, perPage, search }`, with one-based pages. Adapt different API envelopes/parameter names inside the service. Bind service methods that depend on `this`.
- Returned state is exposed through read-only computed refs; use the setters to change queries. Destructure refs at the top level for Vue template unwrapping. Call the composable during setup so requests and timers are cleaned up on unmount.
- Search is trimmed before sending and debounced (300 ms by default). Search, filters, and page-size changes reset to page one. Pagination/filter changes and `refresh()` fetch immediately. A query change cancels old work, and outdated responses are ignored even if the service ignores cancellation.
- Filters are flat scalar values (string, number, boolean, null, undefined). `setFilters()` merges values; use `undefined` to remove an optional filter from Axios query serialization. Keep `page`, `perPage`, and `search` reserved for the composable. `reset()` clears search and restores initial filters while retaining page size.
- `refresh()` can be awaited after create/update/delete; it reports failures through `error` instead of throwing. An out-of-range page is corrected with at most one extra request. Set `immediate: false` to defer the first request until `refresh()` or a query change.
- Component slots: `filters`, `toolbar`, `cell-{key}` (`row`, `column`, `value`), `header-{key}` (`column`), `loading`, `empty`, and `error` (`error`, `retry`). Use the filters slot for feature-specific controls calling `setFilters()`.
- Optional component props include `searchable`, `searchPlaceholder`, and `pageSizes` (default `[10, 20, 50, 100]`). Search and pagination run on the server; the component does not filter or slice rows locally.

Tests cover requests, debounce, cancellation, pagination correction, filters, retry, and component events/slots. Run `npm test` once or `npm run test:watch` during development. The implementation follows Vue's [typed Composition API](https://vuejs.org/guide/typescript/composition-api.html) and [generic components](https://vuejs.org/api/sfc-script-setup.html#generics).

References: [Vite environment variables](https://vite.dev/guide/env-and-mode), [Axios instances](https://axios-http.com/docs/instance).

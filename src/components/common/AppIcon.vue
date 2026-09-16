<script setup lang="ts">
export type IconName =
  | 'dashboard'
  | 'rooms'
  | 'categories'
  | 'items'
  | 'users'
  | 'user'
  | 'logout'
  | 'collapse'
  | 'expand'
defineProps<{ name: IconName }>()
const paths: Record<IconName, string> = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  rooms:
    'M3 18V7 M21 18V11a2 2 0 0 0-2-2H9v7 M3 16h18 M3 10h6 M3 18v3 M21 18v3 M5 7h2a2 2 0 0 1 2 2v1H3V9a2 2 0 0 1 2-2Z',
  categories: 'M3 5h7l2 3h9v12H3Z M7 12h10 M7 16h6',
  items: 'm12 3 9 5-9 5-9-5 9-5Z M3 8v9l9 5 9-5V8 M12 13v9 M7.5 5.5l9 5',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.9',
  user: 'M20 21a8 8 0 0 0-16 0 M12 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9',
  logout: 'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
  collapse: 'M4 4h16v16H4Z M9 4v16 M16 9l-3 3 3 3',
  expand: 'M4 4h16v16H4Z M9 4v16 M13 9l3 3-3 3',
}
</script>

<template>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="paths[name]" />
  </svg>
</template>

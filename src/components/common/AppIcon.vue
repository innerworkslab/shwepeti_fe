<script setup lang="ts">
import {
  LayoutDashboard,
  BedDouble,
  Folder,
  Utensils,
  BookOpen,
  ScrollText,
  Eye,
  Package,
  Warehouse,
  PackagePlus,
  ArrowLeftRight,
  ClipboardList,
  Plus,
  Trash2,
  Users,
  CircleUserRound,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  BadgeDollarSign,
  X,
} from '@lucide/vue'

const icons = {
  dashboard: LayoutDashboard,
  rooms: BedDouble,
  categories: Folder,
  menuCategories: Utensils,
  menus: BookOpen,
  ledger: ScrollText,
  availability: Eye,
  items: Package,
  warehouse: Warehouse,
  stockIn: PackagePlus,
  transfer: ArrowLeftRight,
  adjustment: ClipboardList,
  add: Plus,
  remove: Trash2,
  users: Users,
  user: CircleUserRound,
  logout: LogOut,
  collapse: PanelLeftClose,
  expand: PanelLeftOpen,
  pencil: Pencil,
  price: BadgeDollarSign,
  close: X,
}
export type IconName = keyof typeof icons
withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
</script>

<template>
  <component
    :is="icons[name]"
    :size="size"
    :stroke-width="1.8"
    aria-hidden="true"
    focusable="false"
    class="app-icon"
  />
</template>

<style scoped>
.app-icon {
  flex-shrink: 0;
  vertical-align: middle;
}
</style>

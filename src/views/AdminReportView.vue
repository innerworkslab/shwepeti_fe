<script setup lang="ts">
import AdminReportTable from '@/components/reports/AdminReportTable.vue'
import type { AdminReport } from '@/constants/admin-reports'
defineProps<{ report: AdminReport }>()
</script>
<template><AdminReportTable :key="report" :report="report" /></template>

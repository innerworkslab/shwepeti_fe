<script setup lang="ts">
import { t } from '@/i18n'
</script>
<template>
  <section>
    <h1>{{ t('Dashboard') }}</h1>
    <p>{{ t('Welcome to Shwe Petit hotel management.') }}</p>
    <RouterLink to="/rooms"> {{ t('View rooms') }} </RouterLink>
  </section>
</template>

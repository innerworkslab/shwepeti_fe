<script setup lang="ts">
import { t } from '@/i18n'
</script>
<template>
  <section class="access-denied">
    <h1>{{ t('Access unavailable') }}</h1>
    <p>
      {{
        t(
          'Your account does not have permission to open this page. Choose an available page from the sidebar or contact your administrator.',
        )
      }}
    </p>
  </section>
</template>
<style scoped>
.access-denied {
  padding: 2rem;
  max-width: 42rem;
}
</style>

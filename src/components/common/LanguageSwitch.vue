<script setup lang="ts">
import { locale, setLocale, t } from '@/i18n'
</script>
<template>
  <button
    class="language-switch"
    type="button"
    :title="locale === 'en' ? t('Switch to Burmese') : t('Switch to English')"
    :aria-label="locale === 'en' ? 'Switch to Burmese — မြန်မာ' : 'Switch to English'"
    @click="setLocale(locale === 'en' ? 'my' : 'en')"
  >
    <svg v-if="locale === 'my'" viewBox="0 0 30 20" aria-hidden="true">
      <path fill="#fecb00" d="M0 0h30v7H0z" />
      <path fill="#34b233" d="M0 7h30v6H0z" />
      <path fill="#ea2839" d="M0 13h30v7H0z" />
      <path fill="#fff" d="m15 2 2.1 5.8 6.2.2-4.9 3.8 1.8 6-5.2-3.5-5.2 3.5 1.8-6L6.7 8l6.2-.2z" />
    </svg>
    <svg v-else viewBox="0 0 30 20" aria-hidden="true">
      <path fill="#012169" d="M0 0h30v20H0z" />
      <path stroke="#fff" stroke-width="5" d="m0 0 30 20M30 0 0 20" />
      <path stroke="#c8102e" stroke-width="2" d="m0 0 30 20M30 0 0 20" />
      <path stroke="#fff" stroke-width="7" d="M15 0v20M0 10h30" />
      <path stroke="#c8102e" stroke-width="4" d="M15 0v20M0 10h30" />
    </svg>
    <span :lang="locale === 'my' ? 'my' : 'en'">{{ locale === 'my' ? 'မြန်မာ' : 'EN' }}</span>
  </button>
</template>
<style scoped>
.language-switch {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex-shrink: 0;
  padding: 0.45rem 0.65rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #334155;
  font: inherit;
  font-size: 0.82rem;
  line-height: 1.6;
  cursor: pointer;
}
.language-switch:hover {
  background: #f1f5f9;
  border-color: #94a3b8;
}
.language-switch:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}
svg {
  width: 24px;
  height: 16px;
  border-radius: 2px;
  box-shadow: 0 0 0 1px #0001;
}
</style>

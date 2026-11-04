import '@/i18n/validation'
import { installAuthorization } from '@/services/api/authorization'
import { apiClient } from '@/services/api/client'
import { posApiClient } from '@/services/api/pos-client'
import { useSessionStore } from '@/stores/session'
import { usePosSessionStore } from '@/stores/pos-session'
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
installAuthorization(apiClient, () => useSessionStore().user?.permissions)
installAuthorization(posApiClient, () => usePosSessionStore().user?.permissions)
app.use(router)

app.mount('#app')

import './assets/styles/main.css'

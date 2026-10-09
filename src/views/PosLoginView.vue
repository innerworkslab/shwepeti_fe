<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ValidationError } from 'yup'
import { posAuthService } from '@/services/pos-auth.service'
import { loginSchema } from '@/schemas/login.schema'
import { toApiError } from '@/services/api/api-error'
import { usePosSessionStore } from '@/stores/pos-session'

const router = useRouter()
const route = useRoute()
function destination() {
  const target = route.query.redirect
  return typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    router.resolve(target).meta.requiresPosAuth
    ? target
    : '/pos'
}
onMounted(() => {
  if (session.user) void router.replace(destination())
})
const session = usePosSessionStore()
const form = reactive({ email: '', password: '' })
const errors = ref<Record<string, string>>({})
const error = ref('')
const submitting = ref(false)
const controller = new AbortController()
let disposed = false
onBeforeUnmount(() => {
  disposed = true
  controller.abort()
  form.password = ''
})

async function submit() {
  if (submitting.value) return
  submitting.value = true
  errors.value = {}
  error.value = ''
  try {
    const payload = await loginSchema.validate(
      { ...form },
      { abortEarly: false, stripUnknown: true },
    )
    if (disposed) return
    const result = await posAuthService.login(payload, controller.signal)
    if (disposed) return
    session.setSession(result.user, result.token)
    form.password = ''
    await router.replace(destination())
  } catch (cause) {
    if (disposed) return
    if (cause instanceof ValidationError) {
      for (const issue of cause.inner)
        if (issue.path && !errors.value[issue.path]) errors.value[issue.path] = issue.message
    } else error.value = toApiError(cause).message
  } finally {
    if (!disposed) submitting.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-brand">SP<span>SHWE PETIT POS</span></div>
      <h1 id="login-title">POS sign in</h1>
      <p>Sign in to your hotel workspace.</p>
      <div v-if="session.user" class="signed-in" role="status">
        <h2>Signed in to POS</h2>
        <p>Welcome, {{ session.user.name }}.</p>
      </div>
      <form v-else novalidate :aria-busy="submitting" @submit.prevent="submit">
        <p v-if="error" role="alert" class="error">{{ error }}</p>
        <fieldset :disabled="submitting">
          <label for="login-email">Email</label>
          <input
            id="login-email"
            v-model="form.email"
            name="email"
            type="email"
            autocomplete="username"
            required
            :aria-invalid="!!errors.email"
            :aria-describedby="errors.email ? 'email-error' : undefined"
          />
          <span v-if="errors.email" id="email-error" class="error">{{ errors.email }}</span>
          <label for="login-password">Password</label>
          <input
            id="login-password"
            v-model="form.password"
            name="password"
            type="password"
            autocomplete="current-password"
            required
            :aria-invalid="!!errors.password"
            :aria-describedby="errors.password ? 'password-error' : undefined"
          />
          <span v-if="errors.password" id="password-error" class="error">{{
            errors.password
          }}</span>
        </fieldset>
        <button type="submit" :disabled="submitting">
          {{ submitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  background: #192b3b;
  padding: 24px;
}
.login-card {
  width: min(100%, 420px);
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 24px 60px #0003;
}
.login-brand {
  font:
    24px Georgia,
    serif;
  color: #997744;
  display: flex;
  align-items: center;
  gap: 16px;
}
.login-brand span {
  color: #192b3b;
  font-size: 13px;
  letter-spacing: 2px;
}
h1 {
  margin: 32px 0 8px;
  font-size: 26px;
  color: #192b3b;
}
p {
  color: #788596;
  font-size: 14px;
}
fieldset {
  display: grid;
  gap: 8px;
  border: 0;
  padding: 0;
  margin: 26px 0;
  min-width: 0;
}
label {
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
}
input {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  padding: 11px;
  font: inherit;
}
button {
  width: 100%;
  background: #192b3b;
  color: white;
  border: 0;
  border-radius: 7px;
  padding: 13px;
  font: inherit;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.error {
  color: #b91c1c;
  font-size: 13px;
}
:is(input, button):focus-visible {
  outline: 2px solid #b78d4c;
  outline-offset: 3px;
}
.signed-in {
  margin-top: 24px;
  padding: 16px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #065f46;
}
.signed-in h2 {
  margin: 0;
  font-size: 18px;
}
.signed-in p {
  color: #065f46;
  margin-bottom: 0;
}
</style>

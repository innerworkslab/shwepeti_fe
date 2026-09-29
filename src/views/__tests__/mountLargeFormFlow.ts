import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { Component } from 'vue'
import LargeFormView from '../LargeFormView.vue'
export async function mountLargeFormFlow(component: Component, resource: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: `/${resource}`,
        component,
        children: [
          { path: 'create', component: LargeFormView, props: { resource } },
          { path: ':id/edit', component: LargeFormView, props: { resource } },
        ],
      },
    ],
  })
  await router.push(`/${resource}`)
  await router.isReady()
  return mount(
    { template: '<RouterView />' },
    { attachTo: document.body, global: { plugins: [router] } },
  )
}

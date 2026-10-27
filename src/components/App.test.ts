// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import App from '../App.vue';
import { state } from '../store';
vi.mock('../store', async () => {
  const { reactive } = await import('vue');
  return {
    state: reactive({
      data: { version: 1, products: [], categories: [], movements: [] },
      loading: false,
      busy: false,
      error: '',
      toast: '',
    }),
    load: vi.fn(),
    save: vi.fn(),
    readRawSnapshot: vi.fn(),
    notify: vi.fn(),
  };
});
beforeEach(() => {
  state.error = '';
  state.loading = false;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});
async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<p>Audit route</p>' } }],
  });
  await router.push('/');
  await router.isReady();
  const wrapper = mount(App, { attachTo: document.body, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}
describe('application recovery and mobile navigation', () => {
  it('makes the closed mobile navigation inert and exposes expanded state', async () => {
    const w = await render();
    expect(w.get('#workspace-navigation').attributes('inert')).toBeDefined();
    const toggle = w.get('button[aria-controls=workspace-navigation]');
    expect(toggle.attributes('aria-expanded')).toBe('false');
    (toggle.element as HTMLButtonElement).focus();
    await toggle.trigger('click');
    expect(toggle.attributes('aria-expanded')).toBe('true');
    expect(w.get('#workspace-navigation').attributes('role')).toBe('dialog');
    expect(w.get('#workspace-navigation').attributes('inert')).toBeUndefined();
    expect(w.get('.main-shell').attributes('inert')).toBeDefined();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await flushPromises();
    expect(toggle.attributes('aria-expanded')).toBe('false');
    expect(w.get('#workspace-navigation').attributes('inert')).toBeDefined();
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(toggle.element);
    w.unmount();
  });
  it('keeps recovery actions accessible when normal data loading fails', async () => {
    state.error = 'Snapshot tidak valid';
    const w = await render();
    expect(w.get('.error-state').text()).toContain('Snapshot tidak valid');
    expect(w.get('.error-state').text()).toContain('Ekspor Data Mentah');
    expect(w.get('.error-state').text()).toContain('Impor Backup');
    expect(w.get('.error-state').text()).toContain('Reset Data Contoh');
    w.unmount();
  });
});

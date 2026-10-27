// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import DataControls from './DataControls.vue';
import { state } from '../store';
import { emptyInventory } from '../domain/inventory';
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  notify: vi.fn(),
  readRawSnapshot: vi.fn(),
  download: vi.fn(),
  readFile: vi.fn(),
}));
vi.mock('../store', async () => {
  const { reactive } = await import('vue');
  return {
    state: reactive({
      data: { version: 1, products: [], categories: [], movements: [] },
      busy: false,
    }),
    save: mocks.save,
    notify: mocks.notify,
    readRawSnapshot: mocks.readRawSnapshot,
  };
});
vi.mock('../services/files', () => ({ downloadFile: mocks.download }));
vi.mock('../services/backup', () => ({ readBackupFile: mocks.readFile }));
function button(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((b) => b.text().includes(label))!;
}
beforeEach(() => {
  vi.clearAllMocks();
  state.busy = false;
  state.data = emptyInventory();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  mocks.save.mockResolvedValue(undefined);
});
describe('data recovery and destructive confirmations', () => {
  it('requires confirmation and cancellation never calls the write operation', async () => {
    const w = mount(DataControls, { attachTo: document.body });
    await button(w, 'Hapus Seluruh').trigger('click');
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(mocks.save).not.toHaveBeenCalled();
    (
      Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Batal',
      ) as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(document.querySelector('[role=dialog]')).toBeNull();
    w.unmount();
  });
  it('exports a raw recovery envelope without writing to storage', async () => {
    mocks.readRawSnapshot.mockResolvedValue({ version: 99, original: 'preserve' });
    const w = mount(DataControls, { props: { recovery: true } });
    await button(w, 'Ekspor Data Mentah').trigger('click');
    await flushPromises();
    expect(JSON.parse(mocks.download.mock.calls[0]![0])).toMatchObject({
      format: 'inventra-raw-recovery',
      snapshot: { version: 99, original: 'preserve' },
    });
    expect(mocks.save).not.toHaveBeenCalled();
    w.unmount();
  });
  it('shows import validation failures without replacing old data', async () => {
    mocks.readFile.mockRejectedValue(new Error('Saldo tidak sesuai histori'));
    const w = mount(DataControls);
    const input = w.find('input[type=file]');
    Object.defineProperty(input.element, 'files', { value: [new File(['{}'], 'bad.json')] });
    await input.trigger('change');
    await flushPromises();
    expect(w.get('[role=alert]').text()).toContain('Saldo tidak sesuai');
    expect(mocks.save).not.toHaveBeenCalled();
    w.unmount();
  });
  it('validates import before asking confirmation, then commits only after confirmation', async () => {
    const data = emptyInventory();
    mocks.readFile.mockResolvedValue(data);
    const w = mount(DataControls, { attachTo: document.body });
    const input = w.find('input[type=file]');
    Object.defineProperty(input.element, 'files', { value: [new File(['{}'], 'valid.json')] });
    await input.trigger('change');
    await flushPromises();
    expect(mocks.save).not.toHaveBeenCalled();
    (
      Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Ya, Lanjutkan'),
      ) as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(mocks.save).toHaveBeenCalledTimes(1);
    expect(mocks.save.mock.calls[0]![0]({ broken: true })).toEqual(data);
    w.unmount();
  });
  it('keeps a failed replacement open and reports the failure', async () => {
    mocks.save.mockRejectedValue(new Error('Quota penuh'));
    const w = mount(DataControls, { attachTo: document.body });
    await button(w, 'Reset Data Contoh').trigger('click');
    (
      Array.from(document.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Ya, Lanjutkan'),
      ) as HTMLButtonElement
    ).click();
    await flushPromises();
    expect(document.querySelector('[role=dialog]')).not.toBeNull();
    expect(document.querySelector('[role=alert]')?.textContent).toContain('Quota penuh');
    w.unmount();
  });
});

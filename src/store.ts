import { computed, reactive } from 'vue';
import { emptyInventory, type Inventory } from './domain/inventory';
import { IndexedDBRepository } from './data/repository';
const repo = new IndexedDBRepository();
export const state = reactive({
  data: emptyInventory(),
  loading: true,
  busy: false,
  error: '',
  toast: '',
});
let timer: ReturnType<typeof setTimeout>;
export function notify(message: string) {
  state.toast = message;
  clearTimeout(timer);
  timer = setTimeout(() => (state.toast = ''), 4500);
}
export async function load() {
  state.loading = true;
  state.error = '';
  try {
    state.data = await repo.read();
  } catch (e) {
    state.error = e instanceof Error ? e.message : 'Gagal memuat data.';
  } finally {
    state.loading = false;
  }
}
export async function save(
  change: (d: Inventory) => Inventory,
  message = 'Perubahan berhasil disimpan',
) {
  if (state.busy) throw new Error('Penyimpanan sedang berjalan.');
  state.busy = true;
  try {
    state.data = await repo.update(change);
    state.error = '';
    notify(message);
    try {
      channel?.postMessage('updated');
    } catch {
      /* The committed local write remains successful. */
    }
  } finally {
    state.busy = false;
  }
}
export const activeProducts = computed(() => state.data.products.filter((p) => !p.archived));
export const readRawSnapshot = () => repo.readRaw();
const channel = (() => {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('inventra-sync') : null;
  } catch {
    return null;
  }
})();
if (channel)
  channel.onmessage = async () => {
    try {
      state.data = await repo.read();
      state.error = '';
    } catch {
      notify('Gagal menyinkronkan data. Muat ulang halaman.');
    }
  };

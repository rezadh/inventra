import { assertBackupSize, type Inventory } from '../domain/inventory';
/** Parsing and validation run outside the UI thread. No network request is made. */
export function readBackupFile(file: File): Promise<Inventory> {
  assertBackupSize(file.size);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../data/backup.worker.ts', import.meta.url), {
      type: 'module',
    });
    const finish = () => {
      clearTimeout(timeout);
      worker.terminate();
    };
    const timeout = setTimeout(() => {
      finish();
      reject(new Error('Backup terlalu lama diproses. Coba file yang lebih kecil.'));
    }, 60000);
    worker.onmessage = (event: MessageEvent<{ data?: Inventory; error?: string }>) => {
      finish();
      if (event.data.data) resolve(event.data.data);
      else reject(new Error(event.data.error || 'Backup tidak valid.'));
    };
    worker.onerror = () => {
      finish();
      reject(new Error('Backup gagal diproses. Periksa file dan coba lagi.'));
    };
    worker.postMessage(file);
  });
}

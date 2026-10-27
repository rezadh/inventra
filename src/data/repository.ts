import { type Inventory, type InventoryRepository, parseBackup } from '../domain/inventory';
import { createSeed } from './seed';
const STORE = 'inventory';
export class IndexedDBRepository implements InventoryRepository {
  private db: Promise<IDBDatabase>;
  constructor(name = 'inventra-demo') {
    this.db = new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 1);
      request.onupgradeneeded = () => {
        // Future schema upgrades belong here, inside the versionchange transaction.
        const store = request.result.createObjectStore(STORE);
        store.put(createSeed(), 'snapshot');
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = () =>
        reject(new Error('Penyimpanan lokal tidak dapat dibuka. Periksa izin browser.'));
      request.onblocked = () =>
        reject(new Error('Tutup tab INVENTRA lain untuk memperbarui database.'));
    });
  }
  async read(): Promise<Inventory> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get('snapshot');
      request.onsuccess = () => {
        try {
          resolve(parseBackup(request.result));
        } catch (e) {
          reject(e);
        }
      };
      request.onerror = () => reject(new Error('Data lokal gagal dibaca.'));
    });
  }
  async update(change: (data: Inventory) => Inventory): Promise<Inventory> {
    const db = await this.db;
    return new Promise((resolve, reject) => {
      // Read-modify-write stays inside one serialized readwrite transaction, including across tabs.
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.get('snapshot');
      let result: Inventory;
      let failure: unknown;
      request.onsuccess = () => {
        try {
          result = parseBackup(change(structuredClone(request.result)));
          store.put(result, 'snapshot');
        } catch (e) {
          failure = e;
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () =>
        reject(
          failure ||
            new Error('Penyimpanan gagal. Ruang browser mungkin penuh; perubahan belum disimpan.'),
        );
    });
  }
}

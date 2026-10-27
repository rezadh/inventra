import { type Inventory, type InventoryRepository, parseBackup } from '../domain/inventory';
import { createSeed } from './seed';
const STORE = 'inventory';
const DATABASE_VERSION = 1;
export class IndexedDBRepository implements InventoryRepository {
  private db?: Promise<IDBDatabase>;
  constructor(private name = 'inventra-demo') {}
  private connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    const opening = new Promise<IDBDatabase>((resolve, reject) => {
      let abandoned = false;
      const request = indexedDB.open(this.name, DATABASE_VERSION);
      request.onupgradeneeded = (event) => {
        // Seed only a new database. Add explicit oldVersion migrations here for v2+.
        if (event.oldVersion === 0)
          request.result.createObjectStore(STORE).put(createSeed(), 'snapshot');
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = () => {
          db.close();
          this.db = undefined;
        };
        db.onclose = () => {
          this.db = undefined;
        };
        resolve(db);
      };
      request.onerror = () =>
        reject(
          new Error(
            request.error?.name === 'VersionError'
              ? 'Versi database lebih baru. Muat ulang aplikasi versi terbaru.'
              : 'Penyimpanan lokal tidak dapat dibuka. Periksa izin browser, lalu coba lagi.',
          ),
        );
      request.onblocked = () => {
        abandoned = true;
        reject(new Error('Tutup tab INVENTRA lain untuk memperbarui database, lalu coba lagi.'));
      };
    });
    this.db = opening;
    void opening.catch(() => {
      if (this.db === opening) this.db = undefined;
    });
    return opening;
  }
  async readRaw(): Promise<unknown> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get('snapshot');
      let result: unknown;
      request.onsuccess = () => {
        result = request.result;
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = tx.onerror = () =>
        reject(new Error('Data lokal gagal dibaca. Coba lagi atau periksa izin browser.'));
    });
  }
  async read(): Promise<Inventory> {
    return parseBackup(await this.readRaw());
  }
  async update(change: (data: Inventory) => Inventory): Promise<Inventory> {
    const db = await this.connect();
    return new Promise((resolve, reject) => {
      // IndexedDB serializes read-modify-write across connections/tabs.
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

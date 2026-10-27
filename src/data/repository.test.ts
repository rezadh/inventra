import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { IndexedDBRepository } from './repository';
import { addMovement, emptyInventory, id, today, validateProduct } from '../domain/inventory';
describe('IndexedDB repository', () => {
  it('seeds only on database creation and persists across instances', async () => {
    const name = id(),
      a = new IndexedDBRepository(name);
    expect((await a.read()).products.length).toBeGreaterThan(0);
    await a.update(() => emptyInventory());
    const b = new IndexedDBRepository(name);
    expect(await b.read()).toEqual(emptyInventory());
  });
  it('persists product creation, edit and archival with history intact', async () => {
    const r = new IndexedDBRepository(id());
    const before = await r.read();
    const p = { ...before.products[0]!, id: id(), code: 'NEW-001', stock: 0 };
    await r.update((d) => {
      validateProduct(p, d);
      d.products.push(p);
      return d;
    });
    await r.update((d) => {
      d.products.find((x) => x.id === p.id)!.name = 'Updated';
      return d;
    });
    await r.update((d) => {
      d.products.find((x) => x.id === p.id)!.archived = true;
      return d;
    });
    const after = await r.read();
    expect(after.products.find((x) => x.id === p.id)).toMatchObject({
      name: 'Updated',
      archived: true,
    });
    expect(after.movements).toEqual(before.movements);
  });
  it('commits mutation and stock together', async () => {
    const r = new IndexedDBRepository(id()),
      d = await r.read(),
      p = d.products[0]!;
    await r.update((x) =>
      addMovement(x, { productId: p.id, type: 'in', quantity: 5, date: today(), note: 'test' }),
    );
    const after = await r.read();
    expect(after.products[0]!.stock).toBe(p.stock + 5);
    expect(after.movements.length).toBe(d.movements.length + 1);
  });
  it('rolls back invalid mutations and failed writes', async () => {
    const r = new IndexedDBRepository(id()),
      before = await r.read();
    await expect(
      r.update((d) => {
        d.products[0]!.stock = -1;
        return d;
      }),
    ).rejects.toThrow();
    expect(await r.read()).toEqual(before);
    await expect(
      r.update(() => {
        throw new Error('Injected failure');
      }),
    ).rejects.toThrow('Injected failure');
    expect(await r.read()).toEqual(before);
  });
  it('serializes concurrent updates across repository instances', async () => {
    const name = id(),
      a = new IndexedDBRepository(name),
      b = new IndexedDBRepository(name),
      before = await a.read(),
      p = before.products[0]!;
    await Promise.all([
      a.update((d) =>
        addMovement(d, { productId: p.id, type: 'in', quantity: 2, date: today(), note: 'A' }),
      ),
      b.update((d) =>
        addMovement(d, { productId: p.id, type: 'in', quantity: 3, date: today(), note: 'B' }),
      ),
    ]);
    expect((await a.read()).products[0]!.stock).toBe(p.stock + 5);
  });
  it('replaces inventory with validated backup and survives reopening', async () => {
    const name = id(),
      r = new IndexedDBRepository(name),
      backup = await r.read();
    await r.update(() => emptyInventory());
    await r.update(() => backup);
    expect(await new IndexedDBRepository(name).read()).toEqual(backup);
  });
});

import { vi } from 'vitest';
describe('audit recovery regressions', () => {
  it('reopens after an initial access failure without replacing the repository', async () => {
    const r = new IndexedDBRepository(id());
    const spy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    await expect(r.read()).rejects.toThrow();
    spy.mockRestore();
    expect((await r.read()).products.length).toBeGreaterThan(0);
  });
  it('exports raw corrupt data without modifying it and allows an explicit replacement', async () => {
    const name = id(),
      r = new IndexedDBRepository(name);
    await r.read();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const q = indexedDB.open(name, 1);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    const corrupt = { version: 99, important: 'preserve original' };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('inventory', 'readwrite');
      tx.objectStore('inventory').put(corrupt, 'snapshot');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    await expect(r.read()).rejects.toThrow(/Versi/);
    expect(await r.readRaw()).toEqual(corrupt);
    await expect(r.read()).rejects.toThrow();
    await r.update(() => emptyInventory());
    expect(await r.read()).toEqual(emptyInventory());
  });
  it('rolls back stock and history if put fails with a quota error', async () => {
    const r = new IndexedDBRepository(id()),
      before = await r.read();
    const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    try {
      await expect(
        r.update((d) =>
          addMovement(d, {
            productId: d.products[0]!.id,
            type: 'in',
            quantity: 1,
            date: today(),
            note: '',
          }),
        ),
      ).rejects.toThrow();
    } finally {
      spy.mockRestore();
    }
    expect(await r.read()).toEqual(before);
  });
  it('permits only one of two concurrent withdrawals when both cannot be fulfilled', async () => {
    const name = id(),
      a = new IndexedDBRepository(name),
      b = new IndexedDBRepository(name),
      before = await a.read(),
      p = before.products[0]!;
    const results = await Promise.allSettled(
      [a, b].map((r) =>
        r.update((d) =>
          addMovement(d, {
            productId: p.id,
            type: 'out',
            quantity: p.stock,
            date: today(),
            note: '',
          }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await a.read()).products[0]!.stock).toBe(0);
    expect((await a.read()).movements.length).toBe(before.movements.length + 1);
  });
});

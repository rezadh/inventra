import { describe, expect, it, vi } from 'vitest';
import {
  addMovement,
  assertBackupSize,
  emptyInventory,
  MAX_BACKUP_BYTES,
  parseBackup,
  saveCategory,
  saveProduct,
  serializeBackup,
  today,
} from './inventory';
const fresh = () => {
  const d = saveCategory(emptyInventory(), { name: 'Audit', color: '#123456' });
  return saveProduct(d, {
    code: 'AUD-001',
    name: 'Audit item',
    categoryId: d.categories[0]!.id,
    unit: 'pcs',
    cost: '1000',
    minimum: 2,
    initial: 10,
  });
};
describe('audit regressions', () => {
  it('keeps stored history readable after a clock rollback while rejecting new future movements', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-27T12:00:00'));
      const d = fresh();
      vi.setSystemTime(new Date('2026-10-26T12:00:00'));
      expect(parseBackup(d)).toEqual(d);
      expect(() =>
        addMovement(d, {
          productId: d.products[0]!.id,
          type: 'in',
          quantity: 1,
          date: '2026-10-27',
          note: '',
        }),
      ).toThrow(/masa depan/);
    } finally {
      vi.useRealTimers();
    }
  });
  it('prevents unit changes on products with history, but allows renaming and repricing', () => {
    const d = fresh(),
      p = d.products[0]!;
    const input = {
      code: p.code,
      name: 'Renamed',
      categoryId: p.categoryId,
      unit: 'rim',
      cost: '2500',
      minimum: 2,
      initial: 0,
    };
    expect(() => saveProduct(d, input, p.id)).toThrow(/Satuan tidak dapat/);
    const changed = saveProduct(d, { ...input, unit: 'pcs' }, p.id);
    expect(changed.products[0]).toMatchObject({ name: 'Renamed', cost: 2500, stock: 10 });
    expect(changed.movements).toEqual(d.movements);
  });
  it('allows a unit change before the first movement', () => {
    const d = fresh();
    d.movements = [];
    d.products[0]!.stock = 0;
    const p = d.products[0]!;
    expect(
      saveProduct(
        d,
        {
          code: p.code,
          name: p.name,
          categoryId: p.categoryId,
          unit: 'rim',
          cost: '',
          minimum: 0,
          initial: 0,
        },
        p.id,
      ).products[0]!.unit,
    ).toBe('rim');
  });
  it('rejects negative historical balance hidden by timestamp offsets', () => {
    const d = fresh(),
      productId = d.products[0]!.id;
    d.products[0]!.stock = 0;
    d.movements = [
      {
        id: 'in',
        productId,
        type: 'in',
        quantity: 1,
        date: '2026-01-01',
        note: '',
        createdAt: '2026-01-01T01:00:00+00:00',
      },
      {
        id: 'out',
        productId,
        type: 'out',
        quantity: 1,
        date: '2026-01-01',
        note: '',
        createdAt: '2026-01-01T02:00:00+02:00',
      },
    ];
    expect(() => parseBackup(d)).toThrow(/Histori/);
  });
  it('normalizes timestamps and discards unknown imported fields', () => {
    const d = fresh();
    d.movements[0]!.createdAt = '2026-01-01T08:00:00+08:00';
    const n = parseBackup({
      ...d,
      unexpected: 'discarded',
      products: d.products.map((p) => ({ ...p, unexpected: 'discarded' })),
    });
    expect(n.movements[0]!.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(n).not.toHaveProperty('unexpected');
    expect(n.products[0]).not.toHaveProperty('unexpected');
  });
  it('roundtrips a legitimate backup larger than the old 10 MiB import limit', () => {
    const d = fresh(),
      productId = d.products[0]!.id;
    for (let i = 0; i < 18000; i++)
      d.movements.push({
        id: `large-${i}`,
        productId,
        type: 'in',
        quantity: 1,
        date: today(),
        note: 'a'.repeat(500),
        createdAt: new Date().toISOString(),
      });
    d.products[0]!.stock += 18000;
    const text = serializeBackup(d);
    expect(new TextEncoder().encode(text).byteLength).toBeGreaterThan(10 * 1024 * 1024);
    expect(parseBackup(JSON.parse(text))).toEqual(d);
  });
  it('uses one explicit byte budget with safe boundaries', () => {
    expect(() => assertBackupSize(MAX_BACKUP_BYTES)).not.toThrow();
    expect(() => assertBackupSize(MAX_BACKUP_BYTES + 1)).toThrow(/64 MiB/);
  });
  it.each([null, 1, 'text', [], { id: null }])(
    'rejects malformed array members with a domain error: %j',
    (item) => {
      expect(() =>
        parseBackup({ version: 1, products: [item], categories: [], movements: [] }),
      ).toThrow(/ID backup/);
    },
  );
});

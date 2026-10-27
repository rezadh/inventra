import { type Inventory, type Movement, today } from '../domain/inventory';
export function createSeed(): Inventory {
  const categories = [
    { id: 'cat-1', name: 'Elektronik', color: '#5575dd' },
    { id: 'cat-2', name: 'Perlengkapan Kantor', color: '#b07a40' },
    { id: 'cat-3', name: 'Furnitur', color: '#9b69c6' },
    { id: 'cat-4', name: 'Aksesori', color: '#299e8c' },
  ];
  const rows: [string, string, string, string, number, number, number][] = [
    ['ELK-001', 'Laptop ASUS ExpertBook', 'cat-1', 'unit', 8500000, 5, 24],
    ['ELK-002', 'Monitor Dell 24 inci', 'cat-1', 'unit', 2300000, 5, 18],
    ['AKS-001', 'Keyboard Wireless Logitech', 'cat-4', 'pcs', 325000, 10, 8],
    ['AKS-002', 'Mouse Wireless Logitech', 'cat-4', 'pcs', 175000, 10, 42],
    ['ATK-001', 'Kertas A4 80 gsm', 'cat-2', 'rim', 58000, 20, 64],
    ['ATK-002', 'Tinta Printer Epson Black', 'cat-2', 'botol', 95000, 10, 4],
    ['FRN-001', 'Kursi Kerja Ergonomis', 'cat-3', 'unit', 1250000, 5, 12],
    ['FRN-002', 'Meja Kerja Minimalis', 'cat-3', 'unit', 1850000, 3, 0],
    ['ELK-003', 'Printer Epson EcoTank', 'cat-1', 'unit', 2750000, 3, 7],
    ['AKS-003', 'USB-C Hub 6-in-1', 'cat-4', 'pcs', 450000, 8, 6],
    ['ATK-003', 'Buku Catatan A5', 'cat-2', 'pcs', 35000, 15, 35],
    ['AKS-004', 'Kabel HDMI 2 Meter', 'cat-4', 'pcs', 85000, 10, 0],
  ];
  const day = (ago: number) => {
    const d = new Date(`${today()}T12:00:00`);
    d.setDate(d.getDate() - ago);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const products = rows.map((r, i) => ({
    id: `prd-${i + 1}`,
    code: r[0],
    name: r[1],
    categoryId: r[2],
    unit: r[3],
    cost: r[4],
    minimum: r[5],
    stock: r[6],
    archived: false,
    createdAt: `${day(30)}T00:00:00.000Z`,
  }));
  const movements: Movement[] = products.map((p, i) => ({
    id: `seed-in-${i}`,
    productId: p.id,
    type: 'in',
    quantity: p.stock + 15,
    date: day(30),
    note: 'Saldo awal inventaris demo',
    createdAt: `${day(30)}T00:00:00.000Z`,
  }));
  products.forEach((p, i) => {
    for (let j = 0; j < 5; j++)
      movements.push({
        id: `seed-out-${i}-${j}`,
        productId: p.id,
        type: 'out',
        quantity: 3,
        date: day(25 - j * 5 - (i % 3)),
        note: ['Kebutuhan operasional', 'Pengiriman pesanan', 'Pemakaian tim'][i % 3]!,
        createdAt: `${day(25 - j * 5 - (i % 3))}T08:${String(i).padStart(2, '0')}:00.000Z`,
      });
  });
  // Recent paired movements keep balances intact and provide useful chart detail.
  products.slice(0, 6).forEach((p, i) => {
    movements.push(
      {
        id: `recent-in-${i}`,
        productId: p.id,
        type: 'in',
        quantity: 5 + i,
        date: day(i),
        note: 'Penerimaan dari pemasok',
        createdAt: `${day(i)}T08:00:00.000Z`,
      },
      {
        id: `recent-out-${i}`,
        productId: p.id,
        type: 'out',
        quantity: 5 + i,
        date: day(i),
        note: 'Distribusi ke tim operasional',
        createdAt: `${day(i)}T09:00:00.000Z`,
      },
    );
  });
  return { version: 1, products, categories, movements };
}

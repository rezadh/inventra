export interface Category { id: string; name: string; color: string }
export interface Product { id: string; code: string; name: string; categoryId: string; unit: string; cost: number | null; minimum: number; stock: number; archived: boolean; createdAt: string }
export interface Movement { id: string; productId: string; type: 'in' | 'out'; quantity: number; date: string; note: string; createdAt: string }
export interface Inventory { version: 1; products: Product[]; categories: Category[]; movements: Movement[] }
export interface InventoryRepository { read(): Promise<Inventory>; update(change: (data: Inventory) => Inventory): Promise<Inventory> }
export const id = () => crypto.randomUUID()
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
export const emptyInventory = (): Inventory => ({version:1, products:[],categories:[],movements:[]})
export function validateProduct(p: Product, data: Inventory) {
  if (!p.name.trim() || p.name.length > 120) throw new Error('Nama barang wajib diisi, maksimal 120 karakter.')
  if (!/^[A-Z0-9_-]{2,30}$/.test(p.code)) throw new Error('Kode terdiri dari 2–30 huruf kapital, angka, - atau _.')
  if (data.products.some(x => x.code.toLowerCase() === p.code.toLowerCase() && x.id !== p.id)) throw new Error('Kode barang sudah digunakan.')
  if (!data.categories.some(c => c.id === p.categoryId)) throw new Error('Pilih kategori yang tersedia.')
  if (!p.unit.trim() || p.unit.length > 20) throw new Error('Satuan wajib diisi, maksimal 20 karakter.')
  if (!Number.isSafeInteger(p.minimum) || p.minimum < 0) throw new Error('Minimum stok harus berupa bilangan bulat positif atau nol.')
  if (p.cost !== null && (!Number.isFinite(p.cost) || p.cost < 0 || p.cost > 1e12)) throw new Error('Harga modal tidak valid.')
}
export function addMovement(data: Inventory, input: Omit<Movement,'id'|'createdAt'>): Inventory {
  const product = data.products.find(p => p.id === input.productId && !p.archived)
  if (!product) throw new Error('Barang tidak tersedia atau sudah diarsipkan.')
  if (input.type !== 'in' && input.type !== 'out') throw new Error('Jenis transaksi tidak valid.')
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error('Jumlah harus berupa bilangan bulat lebih dari nol.')
  if (!validDate(input.date) || input.date > today()) throw new Error('Tanggal transaksi tidak valid atau berada di masa depan.')
  if (input.note.length > 500) throw new Error('Catatan maksimal 500 karakter.')
  const movement: Movement = {...input,id:id(),createdAt:new Date().toISOString()}
  const next = structuredClone(data)
  next.movements.push(movement)
  const target = next.products.find(p => p.id === product.id)!
  target.stock += input.type === 'in' ? input.quantity : -input.quantity
  if (!Number.isSafeInteger(target.stock) || target.stock < 0) throw new Error('Stok tidak cukup untuk transaksi keluar.')
  validateLedger(next)
  return next
}
function validDate(value: string) { return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value }
export function validateLedger(data: Inventory) {
  for (const p of data.products) {
    let balance = 0
    const history = data.movements.filter(m => m.productId === p.id).sort((a,b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    for (const m of history) { balance += m.type === 'in' ? m.quantity : -m.quantity; if (!Number.isSafeInteger(balance) || balance < 0) throw new Error(`Histori ${p.code} akan menghasilkan stok negatif. Periksa tanggal transaksi.`) }
    if (balance !== p.stock) throw new Error(`Saldo ${p.code} tidak sesuai histori transaksi.`)
  }
}
export function parseBackup(value: unknown): Inventory {
  // Import is an untrusted boundary: reject incomplete, oversized, or inconsistent snapshots.
  if (!value || typeof value !== 'object') throw new Error('Format backup tidak valid.')
  const d = value as Inventory
  if (d.version !== 1 || !Array.isArray(d.products) || !Array.isArray(d.categories) || !Array.isArray(d.movements)) throw new Error('Versi atau struktur backup tidak didukung.')
  if (d.products.length > 10000 || d.categories.length > 1000 || d.movements.length > 100000) throw new Error('Backup melebihi kapasitas demo.')
  const unique = (items: {id:string}[]) => items.every(x => typeof x.id === 'string' && x.id.length > 0 && x.id.length < 100) && new Set(items.map(x=>x.id)).size === items.length
  if (!unique(d.products) || !unique(d.categories) || !unique(d.movements)) throw new Error('ID backup tidak valid atau duplikat.')
  for (const c of d.categories) if (typeof c.name !== 'string' || !c.name.trim() || c.name.length > 60 || typeof c.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(c.color)) throw new Error('Kategori backup tidak valid.')
  if (new Set(d.categories.map(c=>c.name.trim().toLowerCase())).size !== d.categories.length) throw new Error('Nama kategori duplikat.')
  for (const p of d.products) {
    if (typeof p.name !== 'string' || typeof p.code !== 'string' || typeof p.unit !== 'string' || typeof p.archived !== 'boolean' || !Number.isSafeInteger(p.stock) || p.stock < 0 || typeof p.createdAt !== 'string' || !Number.isFinite(Date.parse(p.createdAt))) throw new Error('Barang backup tidak valid.')
    validateProduct(p,d)
  }
  for (const m of d.movements) if (!d.products.some(p=>p.id===m.productId) || !['in','out'].includes(m.type) || !Number.isSafeInteger(m.quantity) || m.quantity <= 0 || typeof m.date !== 'string' || !validDate(m.date) || m.date > today() || typeof m.note !== 'string' || m.note.length > 500 || typeof m.createdAt !== 'string' || !Number.isFinite(Date.parse(m.createdAt))) throw new Error('Transaksi backup tidak valid.')
  validateLedger(d)
  return structuredClone(d)
}

export interface ProductInput { code:string; name:string; categoryId:string; unit:string; cost:string; minimum:number; initial:number }
export function saveProduct(data:Inventory, input:ProductInput, productId=''):Inventory {
  const d=structuredClone(data), old=d.products.find(p=>p.id===productId)
  if(productId&&!old)throw new Error('Barang sudah tidak tersedia. Muat ulang halaman.')
  if(!Number.isSafeInteger(input.initial)||input.initial<0)throw new Error('Stok awal harus berupa bilangan bulat positif atau nol.')
  const p:Product={id:old?.id||id(),name:input.name.trim(),code:input.code.trim().toUpperCase(),categoryId:input.categoryId,unit:input.unit.trim(),cost:input.cost===''?null:Number(input.cost),minimum:input.minimum,stock:old?.stock||0,archived:old?.archived||false,createdAt:old?.createdAt||new Date().toISOString()}
  validateProduct(p,d)
  if(old)d.products[d.products.findIndex(x=>x.id===old.id)]=p;else d.products.push(p)
  return !old&&input.initial?addMovement(d,{productId:p.id,type:'in',quantity:input.initial,date:today(),note:'Saldo awal barang'}):d
}
export function saveCategory(data:Inventory,input:{name:string;color:string},categoryId=''):Inventory {
  const d=structuredClone(data),name=input.name.trim()
  if(!name||name.length>60)throw new Error('Nama kategori wajib diisi, maksimal 60 karakter.')
  if(!/^#[0-9a-f]{6}$/i.test(input.color))throw new Error('Warna kategori tidak valid.')
  if(d.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!==categoryId))throw new Error('Nama kategori sudah digunakan.')
  if(categoryId){const c=d.categories.find(c=>c.id===categoryId);if(!c)throw new Error('Kategori tidak tersedia.');c.name=name;c.color=input.color}else d.categories.push({id:id(),name,color:input.color})
  return d
}
export function deleteCategory(data:Inventory,categoryId:string):Inventory {
  const d=structuredClone(data)
  if(d.products.some(p=>p.categoryId===categoryId))throw new Error('Kategori masih digunakan barang. Pindahkan kategori barang terlebih dahulu.')
  d.categories=d.categories.filter(c=>c.id!==categoryId);return d
}
export function toggleArchive(data:Inventory,productId:string):Inventory {
  const d=structuredClone(data),target=d.products.find(x=>x.id===productId)
  if(!target)throw new Error('Barang tidak ditemukan.')
  target.archived=!target.archived;return d
}

import { describe, it, expect } from 'vitest'
import { addMovement, parseBackup, today, validateProduct, validateLedger } from './inventory'
import { createSeed } from '../data/seed'
describe('inventory business rules',()=>{
 it('initial seed has consistent balances and unique movement IDs',()=>{const d=createSeed();expect(()=>validateLedger(d)).not.toThrow();expect(new Set(d.movements.map(m=>m.id)).size).toBe(d.movements.length);expect(parseBackup(d)).toEqual(d)})
 it('incoming mutation updates balance and immutable history',()=>{const d=createSeed(),p=d.products[0]!;const n=addMovement(d,{productId:p.id,type:'in',quantity:10,date:today(),note:'Restock'});expect(n.products[0]!.stock).toBe(p.stock+10);expect(d.products[0]!.stock).toBe(p.stock);expect(n.movements).toHaveLength(d.movements.length+1);expect(n.movements.at(-1)!.id).toBeTruthy()})
 it('outgoing mutation reduces stock to zero',()=>{const d=createSeed(),p=d.products[0]!;const n=addMovement(d,{productId:p.id,type:'out',quantity:p.stock,date:today(),note:''});expect(n.products[0]!.stock).toBe(0)})
 it('rejects negative stock without modifying input',()=>{const d=createSeed(),before=structuredClone(d);expect(()=>addMovement(d,{productId:d.products[0]!.id,type:'out',quantity:999,date:today(),note:''})).toThrow(/cukup/);expect(d).toEqual(before)})
 it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects invalid quantity %s',quantity=>{const d=createSeed();expect(()=>addMovement(d,{productId:d.products[0]!.id,type:'in',quantity,date:today(),note:''})).toThrow()})
 it('rejects future and malformed dates',()=>{const d=createSeed();for(const date of ['2099-01-01','2026-02-30','bad'])expect(()=>addMovement(d,{productId:d.products[0]!.id,type:'in',quantity:1,date,note:''})).toThrow()})
 it('rejects backdating that breaks historical balance',()=>{const d=createSeed();expect(()=>addMovement(d,{productId:d.products[0]!.id,type:'out',quantity:1,date:'2020-01-01',note:''})).toThrow(/Histori/)})
 it('rejects mutations for archived or missing products',()=>{const d=createSeed();d.products[0]!.archived=true;for(const productId of [d.products[0]!.id,'missing'])expect(()=>addMovement(d,{productId,type:'in',quantity:1,date:today(),note:''})).toThrow()})
 it('validates required fields, unique codes, category, minimum and price',()=>{const d=createSeed(),p=structuredClone(d.products[0]!);expect(()=>validateProduct(p,d)).not.toThrow();for(const change of [{name:''},{code:d.products[1]!.code},{categoryId:'missing'},{minimum:-1},{minimum:1.5},{cost:-1},{unit:''}])expect(()=>validateProduct({...p,...change},d)).toThrow()})
 it('rejects corrupt backups and unknown versions',()=>{const d=createSeed();expect(()=>parseBackup({...d,version:2})).toThrow();d.products[0]!.stock++;expect(()=>parseBackup(d)).toThrow(/Saldo/)})
 it('rejects orphan movements, duplicate IDs and bad structures',()=>{const a=createSeed();a.movements[0]!.productId='unknown';expect(()=>parseBackup(a)).toThrow();const b=createSeed();b.products[1]!.id=b.products[0]!.id;expect(()=>parseBackup(b)).toThrow(/ID/);for(const v of [null,{},'x',[],{version:1,products:[]}])expect(()=>parseBackup(v)).toThrow()})
 it('backup JSON roundtrip preserves complete inventory',()=>{const d=createSeed();expect(parseBackup(JSON.parse(JSON.stringify(d)))).toEqual(d)})
})

describe('product and category use cases',()=>{
 it('creates with opening balance, edits without changing history, and archives',async()=>{
  const {saveProduct,toggleArchive}=await import('./inventory');const d=createSeed();const input={name:'New item',code:'NEW-100',categoryId:d.categories[0]!.id,unit:'pcs',cost:'500',minimum:2,initial:10};const created=saveProduct(d,input);const p=created.products.at(-1)!;expect(p.stock).toBe(10);expect(created.movements.at(-1)!.productId).toBe(p.id);expect(d.products.length).toBe(12);const edited=saveProduct(created,{...input,name:'Edited item',initial:0},p.id);expect(edited.products.at(-1)!.name).toBe('Edited item');expect(edited.movements).toEqual(created.movements);const archived=toggleArchive(edited,p.id);expect(archived.products.at(-1)!.archived).toBe(true);expect(archived.movements).toEqual(created.movements);expect(toggleArchive(archived,p.id).products.at(-1)!.archived).toBe(false)
 })
 it('creates, edits, deletes categories and prevents deleting used categories',async()=>{
  const {saveCategory,deleteCategory}=await import('./inventory');const d=createSeed();const n=saveCategory(d,{name:'New category',color:'#123456'});const c=n.categories.at(-1)!;const edited=saveCategory(n,{name:'Updated',color:'#654321'},c.id);expect(edited.categories.at(-1)!.name).toBe('Updated');expect(deleteCategory(edited,c.id).categories).toEqual(d.categories);expect(()=>deleteCategory(d,d.products[0]!.categoryId)).toThrow(/digunakan/);expect(()=>saveCategory(d,{name:d.categories[0]!.name.toUpperCase(),color:'#123456'})).toThrow(/digunakan/)
 })
})

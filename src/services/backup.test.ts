import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readBackupFile } from './backup';
import { MAX_BACKUP_BYTES, emptyInventory } from '../domain/inventory';
const instances: FakeWorker[] = [];
class FakeWorker {
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    instances.push(this);
  }
}
beforeEach(() => {
  instances.length = 0;
  vi.stubGlobal('Worker', FakeWorker);
});
describe('backup worker lifecycle', () => {
  it('rejects oversized input before starting a worker', () => {
    expect(() => readBackupFile({ size: MAX_BACKUP_BYTES + 1 } as File)).toThrow(/64 MiB/);
    expect(instances).toHaveLength(0);
  });
  it('returns validated data and terminates the worker', async () => {
    const file = { size: 10 } as File;
    const pending = readBackupFile(file),
      worker = instances[0]!;
    expect(worker.postMessage).toHaveBeenCalledWith(file);
    worker.onmessage!({ data: { data: emptyInventory() } });
    expect(await pending).toEqual(emptyInventory());
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('propagates validation failure and terminates the worker', async () => {
    const pending = readBackupFile({ size: 10 } as File),
      worker = instances[0]!;
    worker.onmessage!({ data: { error: 'Backup tidak valid' } });
    await expect(pending).rejects.toThrow('Backup tidak valid');
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});

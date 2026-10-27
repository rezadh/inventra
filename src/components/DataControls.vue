<script setup lang="ts">
import { ref } from 'vue';
import { Download, Upload, RotateCcw, Trash2 } from 'lucide-vue-next';
import Modal from './Modal.vue';
import { state, save, readRawSnapshot, notify } from '../store';
import { emptyInventory, serializeBackup, today } from '../domain/inventory';
import { createSeed } from '../data/seed';
import { downloadFile } from '../services/files';
import { readBackupFile } from '../services/backup';
defineProps<{ recovery?: boolean }>();
const processing = ref(false),
  error = ref(''),
  confirmation = ref<{ title: string; text: string; action: () => Promise<void> } | null>(null);
async function run(action: () => void | Promise<void>) {
  if (processing.value || state.busy) return;
  processing.value = true;
  error.value = '';
  try {
    await action();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Operasi gagal. Data lama tidak diubah.';
  } finally {
    processing.value = false;
  }
}
function exportBackup() {
  void run(() => {
    downloadFile(
      serializeBackup(state.data),
      `inventra-backup-${today()}.json`,
      'application/json',
    );
    notify('Backup JSON berhasil diekspor');
  });
}
function exportRaw() {
  void run(async () => {
    const snapshot = await readRawSnapshot();
    downloadFile(
      JSON.stringify({
        format: 'inventra-raw-recovery',
        exportedAt: new Date().toISOString(),
        snapshot,
      }),
      `inventra-pemulihan-mentah-${today()}.json`,
      'application/json',
    );
    notify('Salinan data mentah diekspor. Simpan sebelum melakukan pemulihan.');
  });
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  await run(async () => {
    const data = await readBackupFile(file);
    confirmation.value = {
      title: 'Pulihkan backup?',
      text: `Backup berisi ${data.products.length} barang dan ${data.movements.length} transaksi. Seluruh data lokal akan diganti. Ekspor backup atau data mentah terlebih dahulu.`,
      action: () => save(() => data, 'Backup berhasil dipulihkan'),
    };
  });
  input.value = '';
}
function reset(clear: boolean) {
  error.value = '';
  confirmation.value = {
    title: clear ? 'Hapus seluruh data lokal?' : 'Reset ke data contoh?',
    text: 'Seluruh data lokal akan diganti. Tindakan ini tidak dapat dibatalkan. Simpan backup atau ekspor data mentah terlebih dahulu.',
    action: () =>
      save(
        () => (clear ? emptyInventory() : createSeed()),
        clear ? 'Data lokal berhasil dihapus' : 'Data contoh berhasil dipulihkan',
      ),
  };
}
async function confirm() {
  const action = confirmation.value?.action;
  if (!action) return;
  await run(async () => {
    await action();
    confirmation.value = null;
  });
}
</script>
<template>
  <div class="settings-actions">
    <section class="panel settings-panel">
      <h2>{{ recovery ? 'Pemulihan data lokal' : 'Backup & pemulihan' }}</h2>
      <p v-if="recovery">
        Data belum dapat dibuka. Coba lagi setelah izin storage tersedia. Jika data rusak, ekspor
        data mentah sebelum menggantinya. File pemulihan mentah adalah salinan untuk pemeriksaan,
        bukan backup siap impor.
      </p>
      <p v-else>
        Ekspor seluruh inventaris sebagai backup JSON. Impor maksimum 64 MiB diproses di perangkat
        ini dan mengganti data setelah validasi serta konfirmasi.
      </p>
      <div class="heading-actions">
        <button
          v-if="recovery"
          class="button"
          :disabled="processing || state.busy"
          @click="exportRaw"
        >
          <Download :size="16" />Ekspor Data Mentah
        </button>
        <button v-else class="button" :disabled="processing || state.busy" @click="exportBackup">
          <Download :size="16" />Ekspor Backup
        </button>
        <label class="button upload-button"
          ><Upload :size="16" />{{ processing ? 'Memproses…' : 'Impor Backup'
          }}<input
            type="file"
            accept=".json,application/json"
            aria-label="Impor backup JSON"
            :disabled="processing || state.busy"
            @change="importFile"
        /></label>
      </div>
      <p v-if="processing" role="status" class="form-hint">Memproses data, mohon tunggu…</p>
      <p v-if="error && !confirmation" class="form-error" role="alert">{{ error }}</p>
    </section>
    <section class="panel settings-panel">
      <h2>Mulai dari awal</h2>
      <p>Data tidak berubah sebelum Anda menyetujui konfirmasi. Ekspor salinan terlebih dahulu.</p>
      <div class="heading-actions">
        <button class="button" :disabled="processing || state.busy" @click="reset(false)">
          <RotateCcw :size="16" />Reset Data Contoh</button
        ><button
          class="button danger-button"
          :disabled="processing || state.busy"
          @click="reset(true)"
        >
          <Trash2 :size="16" />Hapus Seluruh Data
        </button>
      </div>
    </section>
  </div>
  <Modal
    v-if="confirmation"
    :title="confirmation.title"
    @close="!processing && (confirmation = null)"
    ><p class="confirm-text">{{ confirmation.text }}</p>
    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <div class="modal-footer">
      <button class="button" :disabled="processing" @click="confirmation = null">Batal</button
      ><button class="button primary" :disabled="processing || state.busy" @click="confirm">
        {{ processing ? 'Memproses…' : 'Ya, Lanjutkan' }}
      </button>
    </div></Modal
  >
</template>

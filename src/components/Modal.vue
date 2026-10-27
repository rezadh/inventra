<script setup lang="ts">
import { ref } from 'vue';
import { X } from 'lucide-vue-next';
import { useDialogFocus } from '../composables/useDialogFocus';
defineProps<{ title: string; subtitle?: string }>();
const emit = defineEmits<{ close: [] }>();
const dialog = ref<HTMLElement>();
useDialogFocus(dialog, ref(true), () => emit('close'));
</script>
<template>
  <Teleport to="body"
    ><div class="modal-overlay" @mousedown.self="emit('close')">
      <section
        ref="dialog"
        tabindex="-1"
        class="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div class="modal-heading">
          <div>
            <h2 id="modal-title">{{ title }}</h2>
            <p v-if="subtitle">{{ subtitle }}</p>
          </div>
          <button class="icon-button" aria-label="Tutup dialog" @click="emit('close')">
            <X :size="20" />
          </button>
        </div>
        <slot />
      </section></div
  ></Teleport>
</template>

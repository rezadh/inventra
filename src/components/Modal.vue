<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
defineProps<{ title:string; subtitle?:string }>()
const emit=defineEmits<{close:[]}>(); const dialog=ref<HTMLElement>();let previous:HTMLElement|null=null
function keydown(e:KeyboardEvent) { if(e.key==='Escape')emit('close');if(e.key==='Tab'){const els=dialog.value?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');if(!els?.length)return;const first=els[0]!,last=els[els.length-1]!;if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}} }
onMounted(async()=>{previous=document.activeElement as HTMLElement;document.body.style.overflow='hidden';document.addEventListener('keydown',keydown);await nextTick();dialog.value?.querySelector<HTMLElement>('input,select,button')?.focus()})
onUnmounted(()=>{document.body.style.overflow='';document.removeEventListener('keydown',keydown);previous?.focus()})
</script>
<template><Teleport to="body"><div class="modal-overlay" @mousedown.self="emit('close')"><section ref="dialog" class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-heading"><div><h2 id="modal-title">{{title}}</h2><p v-if="subtitle">{{subtitle}}</p></div><button class="icon-button" aria-label="Tutup dialog" @click="emit('close')"><X :size="20"/></button></div><slot/></section></div></Teleport></template>

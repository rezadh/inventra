import { computed, ref, watch, type ComputedRef } from 'vue';
export function usePagination<T>(source: ComputedRef<T[]>, size: number) {
  const page = ref(1);
  const totalPages = computed(() => Math.max(1, Math.ceil(source.value.length / size)));
  watch(
    [totalPages, page],
    () => {
      page.value = Math.min(Math.max(1, page.value), totalPages.value);
    },
    { flush: 'sync' },
  );
  const items = computed(() => source.value.slice((page.value - 1) * size, page.value * size));
  return { page, totalPages, items };
}

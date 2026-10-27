import { computed, effectScope, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { usePagination } from './usePagination';
describe('pagination after mutations and cross-tab replacement', () => {
  it('clamps a now-empty last page after archiving and handles an empty dataset', () => {
    const scope = effectScope();
    scope.run(() => {
      const rows = ref(Array.from({ length: 12 }, (_, i) => i));
      const pagination = usePagination(
        computed(() => rows.value),
        8,
      );
      pagination.page.value = 2;
      expect(pagination.items.value).toEqual([8, 9, 10, 11]);
      rows.value = rows.value.slice(0, 8);
      expect(pagination.page.value).toBe(1);
      expect(pagination.items.value).toHaveLength(8);
      rows.value = [];
      expect(pagination.page.value).toBe(1);
      expect(pagination.totalPages.value).toBe(1);
      expect(pagination.items.value).toEqual([]);
    });
    scope.stop();
  });
});

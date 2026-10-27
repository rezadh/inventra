import { nextTick, onUnmounted, watch, type Ref } from 'vue';
export function useDialogFocus(
  element: Ref<HTMLElement | undefined>,
  active: Ref<boolean>,
  onClose: () => void,
) {
  let previous: HTMLElement | null = null,
    oldOverflow = '';
  const controls = () =>
    Array.from(
      element.value?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ) || [],
    ).filter((el) => !el.closest('[inert]') && el.getClientRects().length > 0);
  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const els = controls(),
      first = els[0],
      last = els.at(-1);
    if (!first || !last) {
      event.preventDefault();
      element.value?.focus();
      return;
    }
    if (
      event.shiftKey &&
      (document.activeElement === first || !element.value?.contains(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || !element.value?.contains(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  }
  function stop() {
    document.removeEventListener('keydown', keydown);
    document.body.style.overflow = oldOverflow;
    const target = previous;
    previous = null;
    void nextTick(() => {
      if (target?.isConnected) target.focus();
    });
  }
  watch(
    active,
    async (value) => {
      if (!value) {
        if (previous) stop();
        return;
      }
      previous = document.activeElement as HTMLElement;
      oldOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', keydown);
      await nextTick();
      if (active.value) (controls()[0] || element.value)?.focus();
    },
    { immediate: true },
  );
  onUnmounted(() => {
    if (previous) stop();
  });
}

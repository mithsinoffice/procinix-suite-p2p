import { useEffect } from 'react';

export function useFormKeyboardSave(onSave: (() => void) | undefined) {
  useEffect(() => {
    if (!onSave) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave]);
}

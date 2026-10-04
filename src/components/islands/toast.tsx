import { useEffect, useState } from 'preact/hooks';

export function useTimedToast(ms = 2000) {
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), ms);
    return () => window.clearTimeout(id);
  }, [ms, toast]);
  return [toast, setToast] as const;
}

export function Toast({ message }: { message: string }) {
  return (
    <p
      role="status"
      class="border-border bg-surface text-text fixed bottom-6 left-1/2 z-60 -translate-x-1/2 rounded-md border px-3 py-2 font-mono text-xs"
    >
      {message}
    </p>
  );
}

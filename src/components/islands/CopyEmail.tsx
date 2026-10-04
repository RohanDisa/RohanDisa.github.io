import { copyEmail } from '../../lib/copyEmail';
import { Toast, useTimedToast } from './toast';

export default function CopyEmail({ email }: { email: string }) {
  const [toast, setToast] = useTimedToast();

  return (
    <>
      <button
        type="button"
        class="border-border text-muted hover:text-text hidden rounded-md border px-2 py-0.5 font-mono text-xs [html.js_&]:inline-flex"
        onClick={() => {
          void copyEmail(email).then(setToast);
        }}
      >
        Copy email
      </button>
      {toast && <Toast message={toast} />}
    </>
  );
}

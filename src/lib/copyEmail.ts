export const EMAIL_COPIED = 'Email copied';

export async function copyEmail(email: string): Promise<string> {
  try {
    await navigator.clipboard.writeText(email);
  } catch {
    // Clipboard can be denied; still report the same toast.
  }
  return EMAIL_COPIED;
}

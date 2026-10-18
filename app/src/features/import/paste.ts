import { router } from 'expo-router';
import { showSnack } from '@/components';
import { markClipboardHandled, PASTE_TEXT, readClipboard } from './clipboard';

/** Opens the import flow (spec §10) with text the user pasted or copied. */
export function openImport(text: string) {
  const t = text.trim();
  if (!t) return showSnack({ text: PASTE_TEXT.empty });
  markClipboardHandled();
  router.push({ pathname: '/import', params: { text: t } });
}

/** "Paste a message": reads the clipboard (the browser may ask) and opens the import flow. */
export async function pasteMessage() {
  markClipboardHandled();
  const text = await readClipboard().catch(() => '');
  openImport(text);
}

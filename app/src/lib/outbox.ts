import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { supabase } from './supabase';
import { storage } from './storage';
import { isOnline, startNetWatch } from './net';
import { draftPlaceName, isDraftPlace, saveDraft, useDrafts } from './drafts';
import { queryClient } from './queryClient';

/**
 * Offline outbox (spec §13, §26.5): a FIFO queue in MMKV for the writes that work offline. Each op is the RPC name
 * and its arguments, so sending it is one `supabase.rpc`. Ids are made on the device, so every op is safe to resend.
 * - Online with nothing queued: the write goes straight through and errors show as before.
 * - Offline, or something is already queued: it is queued (order matters) and the caller shows "Saved · will sync".
 * - Flushing sends one op at a time: network trouble or a 5xx stops and retries with backoff (2 s → 5 min);
 *   a rule error marks the op failed for F6, and later ops continue.
 */
export type OpKind = 'save_visit' | 'delete_visit' | 'save_saved_entry' | 'delete_saved_entry' | 'set_wishlist' | 'add_friend_name' | 'rename_friend_name';
export type Op = {
  opId: string; kind: OpKind; args: Record<string, unknown>; label: string;
  createdAt: string; attempts: number; state: 'queued' | 'failed'; error?: string;
};

const KEY = 'outbox';
const load = (): Op[] => { try { return JSON.parse(storage.getString(KEY) ?? '[]'); } catch { return []; } };

export const useOutbox = create<{ ops: Op[] }>(() => ({ ops: load() }));
const save = (ops: Op[]) => { storage.set(KEY, JSON.stringify(ops)); useOutbox.setState({ ops }); };

/** Everything a synced write can change on screen. */
const KEYS = [['feed'], ['place'], ['placePage'], ['entry'], ['myCounts'], ['myWishlist'], ['mySaved'], ['friendNames'], ['companionNames'], ['userVisits'], ['map']];

type Sent = { ok: true; data: unknown } | { ok: false; transient: boolean; message: string };
async function send(kind: OpKind, args: Record<string, unknown>): Promise<Sent> {
  try {
    const { data, error, status } = await supabase.rpc(kind, args);
    if (!error) return { ok: true, data };
    const transient = !status || status >= 500 || /network|fetch|timeout/i.test(error.message);
    return { ok: false, transient, message: error.message };
  } catch (e) {
    return { ok: false, transient: true, message: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Runs an offline-capable write. Resolves with `{ queued: false, data }` when it went straight through, or
 * `{ queued: true }` when it waits in the outbox. Throws only for rule errors while online (same as before).
 */
export async function runWrite<T = unknown>(kind: OpKind, args: Record<string, unknown>, label: string): Promise<{ queued: boolean; draft?: boolean; data?: T }> {
  // An entry with a stand-in place made offline stays a draft on this device until F6 gives it a real place (§13).
  const p = args.p as { id?: string; place_id?: string } | undefined;
  if ((kind === 'save_visit' || kind === 'save_saved_entry') && p?.id && isDraftPlace(p.place_id)) {
    saveDraft({ id: p.id, kind, args, placeName: draftPlaceName(p.place_id!), label });
    return { queued: true, draft: true };
  }
  const waiting = useOutbox.getState().ops.some((o) => o.state === 'queued');
  if (isOnline() && !waiting) {
    const r = await send(kind, args);
    if (r.ok) return { queued: false, data: r.data as T };
    if (!r.transient) throw new Error(r.message);
  }
  save([...useOutbox.getState().ops, { opId: randomUUID(), kind, args, label, createdAt: new Date().toISOString(), attempts: 0, state: 'queued' }]);
  void flush();
  return { queued: true };
}

let running: Promise<void> | null = null;
let again = false;
let backoff = 2000;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Sends queued ops in order. Safe to call any time (NetInfo back online, app foreground, after each enqueue).
 * A call during a flush waits for it and makes it take one more pass, so nothing queued meanwhile is missed.
 */
export function flush(): Promise<void> {
  if (running) { again = true; return running; }
  if (!isOnline()) return Promise.resolve();
  running = (async () => {
    try { do { again = false; if (!(await pass())) break; } while (again); }
    finally { running = null; }
  })();
  return running;
}

/** One pass over the queue. Returns false if it stopped on network trouble (a retry is scheduled). */
async function pass(): Promise<boolean> {
  let sentAny = false;
  try {
    for (const op of useOutbox.getState().ops.filter((o) => o.state === 'queued')) {
      const r = await send(op.kind, op.args);
      const ops = useOutbox.getState().ops;
      if (r.ok) {
        save(ops.filter((o) => o.opId !== op.opId));
        sentAny = true;
        backoff = 2000;
      } else if (r.transient) {
        save(ops.map((o) => (o.opId === op.opId ? { ...o, attempts: o.attempts + 1 } : o)));
        clearTimeout(timer);
        timer = setTimeout(() => void flush(), backoff);
        backoff = Math.min(backoff * 2, 5 * 60_000);
        return false;
      } else {
        save(ops.map((o) => (o.opId === op.opId ? { ...o, state: 'failed' as const, attempts: o.attempts + 1, error: r.message } : o)));
      }
    }
  } finally {
    if (sentAny) await Promise.all(KEYS.map((k) => queryClient.invalidateQueries({ queryKey: k })));
  }
  return true;
}

/** F6: try a failed op again, or drop it. */
export function retryOp(opId: string) {
  save(useOutbox.getState().ops.map((o) => (o.opId === opId ? { ...o, state: 'queued' as const, error: undefined } : o)));
  void flush();
}
export function dropOp(opId: string) {
  save(useOutbox.getState().ops.filter((o) => o.opId !== opId));
}

/** The F2 badge (spec §26.5): failures + drafts + pending shares. */
export function useDraftCount() {
  const failed = useOutbox((s) => s.ops.filter((o) => o.state === 'failed').length);
  const n = useDrafts((s) => s.drafts.length + s.shares.length);
  return failed + n;
}

/** Sign-out (spec §26.3): nothing of the old account stays queued on the device. */
export function clearOutbox() { clearTimeout(timer); save([]); }

/** Mounted once in the root layout: flush when back online, when the app comes to the front, and on start. */
export function startOutbox() {
  startNetWatch(() => void flush());
  AppState.addEventListener('change', (s) => { if (s === 'active') void flush(); });
  void flush();
}

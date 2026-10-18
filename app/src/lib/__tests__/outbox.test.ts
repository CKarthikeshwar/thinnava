/// <reference types="jest" />
// Outbox ordering and retry (spec §21 "Pure TS": outbox ordering and retry; §26.5).
const mockCalls: string[] = [];
const mockBehaviour: Record<string, 'ok' | 'down' | 'rule'> = {};
const setBehaviour = (b: Record<string, 'ok' | 'down' | 'rule'>) => { for (const k of Object.keys(mockBehaviour)) delete mockBehaviour[k]; Object.assign(mockBehaviour, b); };

jest.mock('../storage', () => {
  const m = new Map<string, string>();
  return { storage: { getString: (k: string) => m.get(k), set: (k: string, v: string) => m.set(k, v), remove: (k: string) => m.delete(k) } };
});
jest.mock('../supabase', () => ({
  supabase: {
    rpc: async (kind: string, args: { p_id?: string }) => {
      const id = args.p_id ?? '?';
      mockCalls.push(`${kind}:${id}`);
      const b = mockBehaviour[id] ?? 'ok';
      if (b === 'ok') return { data: null, error: null, status: 200 };
      if (b === 'down') return { data: null, error: { message: 'TypeError: Network request failed' }, status: 0 };
      return { data: null, error: { message: 'not_found' }, status: 400 };
    },
  },
}));
jest.mock('../queryClient', () => ({ queryClient: { invalidateQueries: async () => {} } }));
jest.mock('../net', () => {
  const state = { online: true };
  return { isOnline: () => state.online, startNetWatch: () => {}, __state: state };
});
jest.mock('expo-crypto', () => ({ randomUUID: () => Math.random().toString(36).slice(2) }));

import { flush, runWrite, useOutbox, retryOp, clearOutbox } from '../outbox';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const net = require('../net').__state as { online: boolean };

beforeEach(() => { mockCalls.length = 0; setBehaviour({}); clearOutbox(); net.online = true; jest.useRealTimers(); });

test('online with nothing queued: goes straight through', async () => {
  const r = await runWrite('delete_visit', { p_id: 'a' }, 'A');
  expect(r.queued).toBe(false);
  expect(useOutbox.getState().ops).toHaveLength(0);
});

test('offline: queued in order, then sent in order when back online', async () => {
  net.online = false;
  for (const id of ['a', 'b', 'c']) expect((await runWrite('delete_visit', { p_id: id }, id)).queued).toBe(true);
  expect(mockCalls).toEqual([]);
  net.online = true;
  await flush();
  expect(mockCalls).toEqual(['delete_visit:a', 'delete_visit:b', 'delete_visit:c']);
  expect(useOutbox.getState().ops).toHaveLength(0);
});

test('a network failure stops the flush and keeps the order', async () => {
  net.online = false;
  for (const id of ['a', 'b']) await runWrite('delete_visit', { p_id: id }, id);
  net.online = true;
  setBehaviour({ a: 'down' });
  jest.useFakeTimers();
  await flush();
  expect(mockCalls).toEqual(['delete_visit:a']); // b waits behind a
  expect(useOutbox.getState().ops.map((o) => [o.args.p_id, o.state, o.attempts])).toEqual([['a', 'queued', 1], ['b', 'queued', 0]]);
});

test('a rule error marks that op failed and later ops continue; retry re-sends it', async () => {
  net.online = false;
  for (const id of ['a', 'b']) await runWrite('delete_visit', { p_id: id }, id);
  net.online = true;
  setBehaviour({ a: 'rule' });
  await flush();
  expect(mockCalls).toEqual(['delete_visit:a', 'delete_visit:b']);
  expect(useOutbox.getState().ops.map((o) => [o.args.p_id, o.state, o.error])).toEqual([['a', 'failed', 'not_found']]);
  setBehaviour({});
  retryOp(useOutbox.getState().ops[0].opId);
  await flush();
  expect(useOutbox.getState().ops).toHaveLength(0);
});

test('something already queued: new writes queue behind it even when online', async () => {
  net.online = false;
  await runWrite('delete_visit', { p_id: 'a' }, 'a');
  net.online = true;
  setBehaviour({ a: 'down' });
  jest.useFakeTimers();
  const r = await runWrite('delete_visit', { p_id: 'b' }, 'b');
  expect(r.queued).toBe(true);
});

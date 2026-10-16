import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Error from an Edge Function, carrying its { code } (spec §23), e.g. 'quota_paused'. */
export class FnError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

/** Calls an Edge Function and unwraps its { ok, data } / { ok:false, error } envelope. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null);
      if (payload?.error) throw new FnError(payload.error.code, payload.error.message);
    }
    throw new FnError('network', "Couldn't reach Thinnava. Check your internet and try again.");
  }
  if (!data?.ok) throw new FnError(data?.error?.code ?? 'unknown', data?.error?.message ?? 'Something went wrong.');
  return data.data as T;
}

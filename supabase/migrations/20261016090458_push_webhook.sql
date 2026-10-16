-- M7: push delivery (spec §12, §23, §26.9). Every notifications INSERT calls the `push` Edge Function through pg_net.
-- The function URL and shared secret live in Supabase Vault (never in the repo). If either is missing the trigger does
-- nothing, so notifications still work in-app without push.
--   Local sandbox:   select vault.create_secret('http://host.docker.internal:54321/functions/v1/push', 'push_url');
--                    select vault.create_secret('<same as PUSH_WEBHOOK_SECRET>', 'push_webhook_secret');
--   Production:      the same two secrets, with the project's functions URL (release steps, M9).

create extension if not exists pg_net with schema extensions;

create or replace function public.push_on_notification() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare url text; secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if url is null or secret is null then return new; end if;
  perform net.http_post(
    url := url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('record', to_jsonb(new)),
    timeout_milliseconds := 5000
  );
  return new;
exception when others then
  -- Push is best effort; never block the notification itself.
  return new;
end $$;
revoke execute on function public.push_on_notification() from public, anon, authenticated;

create trigger notifications_push after insert on public.notifications
  for each row execute function public.push_on_notification();

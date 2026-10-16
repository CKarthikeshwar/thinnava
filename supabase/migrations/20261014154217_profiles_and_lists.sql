-- M2: profiles, audience lists and the social tables their privacy rules depend on.
-- Spec §20 (schema), §21 (RLS), §22.1 (profile RPCs). RPCs for connections/blocks/lists arrive in M6.

create extension if not exists citext;

create type public.list_kind as enum ('all', 'only_me', 'custom');

-- Shared updated_at trigger ---------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- People ------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     citext not null unique
               check (username::text ~ '^[a-z0-9._]{3,20}$' and username::text !~ '^[._]' and username::text !~ '[._]$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table public.profile_details (           -- connection-only fields (spec §5.2)
  user_id uuid primary key references public.profiles on delete cascade,
  bio     text check (char_length(bio) <= 150)
);

-- Needed now because privacy rules check them; their RPCs arrive in M6.
create table public.connections (                -- one row per pair, user_a < user_b
  user_a     uuid references public.profiles on delete cascade,
  user_b     uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create table public.blocks (
  blocker    uuid references public.profiles on delete cascade,
  blocked    uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

-- Audience lists ------------------------------------------------------------------
create table public.audience_lists (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid not null references public.profiles on delete cascade,
  kind       public.list_kind not null,
  name       text not null check (char_length(name) between 1 and 30),
  created_at timestamptz not null default now()
);
create unique index audience_lists_one_builtin on public.audience_lists (owner, kind) where kind <> 'custom';
create unique index audience_lists_unique_name on public.audience_lists (owner, lower(name));

create table public.list_members (
  list_id   uuid references public.audience_lists on delete cascade,
  member_id uuid references public.profiles on delete cascade,
  primary key (list_id, member_id)
);

create table public.wishlist_audience (
  owner   uuid references public.profiles on delete cascade,
  list_id uuid references public.audience_lists on delete cascade,
  primary key (owner, list_id)
);

-- Helper functions (security definer, so RLS policies can call them) -----------------
create or replace function public.is_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from connections where user_a = least(a, b) and user_b = greatest(a, b));
$$;

create or replace function public.has_blocked(p_blocker uuid, p_blocked uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where blocker = p_blocker and blocked = p_blocked);
$$;

-- New profile → built-in lists, empty details, wishlist visible to All connections ----------
create or replace function public.on_profile_created() returns trigger
language plpgsql security definer set search_path = public as $$
declare all_id uuid;
begin
  insert into profile_details (user_id) values (new.id);
  insert into audience_lists (owner, kind, name) values (new.id, 'all', 'All connections') returning id into all_id;
  insert into audience_lists (owner, kind, name) values (new.id, 'only_me', 'Only me');
  insert into wishlist_audience (owner, list_id) values (new.id, all_id);
  return new;
end $$;

create trigger profiles_after_insert after insert on public.profiles
  for each row execute function public.on_profile_created();

-- Row Level Security (spec §21.2) --------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.profile_details   enable row level security;
alter table public.connections       enable row level security;
alter table public.blocks            enable row level security;
alter table public.audience_lists    enable row level security;
alter table public.list_members      enable row level security;
alter table public.wishlist_audience enable row level security;

-- Anyone signed in sees name, username and photo, except people who have blocked them.
create policy profiles_select on public.profiles for select to authenticated
  using (not public.has_blocked(id, auth.uid()));
-- Writes go through create_profile / update_profile only.

create policy details_select on public.profile_details for select to authenticated
  using (user_id = auth.uid() or public.is_connected(auth.uid(), user_id));

create policy connections_select on public.connections for select to authenticated
  using (auth.uid() in (user_a, user_b));

create policy blocks_select on public.blocks for select to authenticated
  using (blocker = auth.uid());

-- Members never learn which lists they're in.
create policy lists_select on public.audience_lists for select to authenticated
  using (owner = auth.uid());
create policy members_select on public.list_members for select to authenticated
  using (exists (select 1 from public.audience_lists l where l.id = list_id and l.owner = auth.uid()));
create policy wishlist_audience_select on public.wishlist_audience for select to authenticated
  using (owner = auth.uid());

-- RPCs (spec §22.1). Errors are raised as P0001 with a message key the app maps to plain text. --------
create or replace function public.normalise_username(p text) returns text
language sql immutable as $$ select lower(trim(p)) $$;

create or replace function public.username_valid(p text) returns boolean
language sql immutable as $$
  select p ~ '^[a-z0-9._]{3,20}$' and p !~ '^[._]' and p !~ '[._]$'
$$;

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.username_valid(public.normalise_username(p_username))
     and not exists (
       select 1 from profiles
       where username = public.normalise_username(p_username)::citext and id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000')
     );
$$;

create or replace function public.create_profile(p_username text, p_display_name text, p_avatar_url text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  u text := public.normalise_username(p_username);
  n text := trim(p_display_name);
  me uuid := auth.uid();
  r profiles;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if exists (select 1 from profiles where id = me) then raise exception 'profile_exists'; end if;
  if not public.username_valid(u) then raise exception 'username_invalid'; end if;
  if char_length(n) not between 1 and 40 then raise exception 'name_invalid'; end if;
  if exists (select 1 from profiles where username = u::citext) then raise exception 'username_taken'; end if;
  insert into profiles (id, username, display_name, avatar_url)
  values (me, u, n, coalesce(p_avatar_url,
          (select raw_user_meta_data ->> 'avatar_url' from auth.users where id = me),
          (select raw_user_meta_data ->> 'picture' from auth.users where id = me)))
  returning * into r;
  return r;
exception when unique_violation then
  raise exception 'username_taken';
end $$;

create or replace function public.update_profile(p_username text, p_display_name text, p_bio text default null)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  u text := public.normalise_username(p_username);
  n text := trim(p_display_name);
  b text := nullif(trim(coalesce(p_bio, '')), '');
  me uuid := auth.uid();
  r profiles;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if not public.username_valid(u) then raise exception 'username_invalid'; end if;
  if char_length(n) not between 1 and 40 then raise exception 'name_invalid'; end if;
  if b is not null and char_length(b) > 150 then raise exception 'bio_too_long'; end if;
  if exists (select 1 from profiles where username = u::citext and id <> me) then raise exception 'username_taken'; end if;
  update profiles set username = u, display_name = n where id = me returning * into r;
  if r.id is null then raise exception 'no_profile'; end if;
  update profile_details set bio = b where user_id = me;
  return r;
exception when unique_violation then
  raise exception 'username_taken';
end $$;

-- My own profile with bio (bio is connection-only, so it isn't on profiles).
create or replace function public.my_profile()
returns table (id uuid, username text, display_name text, avatar_url text, bio text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username::text, p.display_name, p.avatar_url, d.bio
  from profiles p left join profile_details d on d.user_id = p.id
  where p.id = auth.uid();
$$;

-- Only signed-in users can call these; the helpers are internal.
revoke execute on function public.username_available(text) from anon;
revoke execute on function public.create_profile(text, text, text) from anon;
revoke execute on function public.update_profile(text, text, text) from anon;
revoke execute on function public.my_profile() from anon;
revoke execute on function public.on_profile_created() from anon, authenticated;

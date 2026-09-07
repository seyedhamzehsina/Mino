-- Mino — phase 1 (accounts & sync) schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run.

-- 1) Profiles (kept in sync with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  display_name text,
  created_at timestamptz not null default now()
);

-- 2) Todos
create table if not exists public.todos (
  id uuid primary key,
  user_id uuid not null references auth.users on delete cascade,
  date_key date not null,               -- 'YYYY-MM-DD' (local date on the user's device)
  text text not null default '',
  done boolean not null default false,
  deleted boolean not null default false,
  assigned_to uuid references auth.users on delete set null, -- phase 2
  updated_at timestamptz not null default now()
);
create index if not exists todos_user_updated_idx on public.todos (user_id, updated_at);
create index if not exists todos_assigned_idx on public.todos (assigned_to, updated_at);

-- 3) User settings (theme, clock, name, ...) as a JSON blob
create table if not exists public.settings (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 4) Row Level Security — each user only ever sees their own rows
alter table public.profiles enable row level security;
alter table public.todos    enable row level security;
alter table public.settings enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own todos" on public.todos;
create policy "own todos" on public.todos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5) Auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

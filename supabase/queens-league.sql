-- Mino Queens League — run once in Supabase SQL Editor.
alter table public.profiles add column if not exists queens_username text;
create unique index if not exists profiles_queens_username_unique
  on public.profiles (lower(queens_username))
  where queens_username is not null;

create table if not exists public.queens_scores (
  day_key date not null,
  user_id uuid not null references auth.users on delete cascade,
  username text not null check (username ~ '^[a-z0-9_]{3,16}$'),
  duration_seconds integer not null check (duration_seconds >= 0 and duration_seconds <= 86400),
  moves integer not null check (moves >= 5 and moves <= 500),
  created_at timestamptz not null default now(),
  primary key (day_key, user_id)
);
drop index if exists public.queens_scores_daily_rank_idx;
create index queens_scores_daily_rank_idx
  on public.queens_scores (day_key, (duration_seconds + moves * 10), duration_seconds, moves);

alter table public.queens_scores enable row level security;

drop policy if exists "read Queens league" on public.queens_scores;
drop policy if exists "read own Queens scores" on public.queens_scores;
create policy "read own Queens scores" on public.queens_scores
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "write own Queens score" on public.queens_scores;
create policy "write own Queens score" on public.queens_scores
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "update own Queens score" on public.queens_scores;
create policy "update own Queens score" on public.queens_scores
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace view public.queens_leaderboard as
  select day_key, username, duration_seconds, moves,
    (duration_seconds + moves * 10) as performance_score,
    greatest(1, 1000 - (duration_seconds + moves * 10)) as league_points
  from public.queens_scores;
grant select on public.queens_leaderboard to authenticated;

create or replace view public.queens_weekly_leaderboard as
  select date_trunc('week', day_key)::date as week_start, username,
    count(*)::integer as days_played,
    sum(greatest(1, 1000 - (duration_seconds + moves * 10)))::integer as league_points,
    sum(duration_seconds + moves * 10)::integer as total_performance_score
  from public.queens_scores
  group by date_trunc('week', day_key)::date, username;
grant select on public.queens_weekly_leaderboard to authenticated;

create or replace view public.queens_all_time_leaderboard as
  select username, count(*)::integer as days_played,
    sum(greatest(1, 1000 - (duration_seconds + moves * 10)))::integer as league_points,
    sum(duration_seconds + moves * 10)::integer as total_performance_score
  from public.queens_scores
  group by username;
grant select on public.queens_all_time_leaderboard to authenticated;

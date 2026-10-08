-- Plan: kullanıcının takvimi. Randevu, toplantı, arama, görev ve notlar; isteğe bağlı olarak takipteki bir firmaya bağlanır.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.
-- Erişim modeli diğer tablolarla aynı: tarayıcı doğrudan erişemez; yalnızca sunucu (service_role).

create table public.plan_items (
  id           uuid primary key default gen_random_uuid(),
  user_uid     text not null references public.profiles (firebase_uid) on delete cascade,

  kind         text not null check (kind in ('randevu', 'toplanti', 'arama', 'gorev', 'not')),
  title        text not null check (char_length(title) between 1 and 120),
  details      text not null default '' check (char_length(details) <= 1000),

  starts_at    timestamptz not null,
  ends_at      timestamptz,
  all_day      boolean not null default false,

  -- Takipteki firma silinirse plan kalır; kişi adı o anki hâliyle with_name'de durur.
  favorite_id  uuid references public.favorites (id) on delete set null,
  with_name    text check (char_length(with_name) <= 80),
  location     text check (char_length(location) <= 160),

  done         boolean not null default false,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  check (ends_at is null or ends_at >= starts_at)
);

create index plan_items_user_starts_idx on public.plan_items (user_uid, starts_at);
create index plan_items_favorite_idx on public.plan_items (favorite_id) where favorite_id is not null;

create trigger plan_items_set_updated_at
  before update on public.plan_items
  for each row execute function public.set_updated_at();

alter table public.plan_items enable row level security;
revoke all on table public.plan_items from anon, authenticated;
grant select, insert, update, delete on table public.plan_items to service_role;

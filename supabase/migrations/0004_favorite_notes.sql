-- Takipteki firmalar için birden fazla ayrı not (mesaj).
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

create table public.favorite_notes (
  id           uuid primary key default gen_random_uuid(),
  user_uid     text not null references public.profiles (firebase_uid) on delete cascade,
  favorite_id  uuid not null references public.favorites (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 500),
  created_at   timestamptz not null default now()
);

create index favorite_notes_favorite_idx on public.favorite_notes (favorite_id, created_at desc);

alter table public.favorite_notes enable row level security;
revoke all on table public.favorite_notes from anon, authenticated;
grant select, insert, update, delete on table public.favorite_notes to service_role;

-- Önceden tek not olarak yazılmış notlar yeni tabloya taşınır.
insert into public.favorite_notes (user_uid, favorite_id, body, created_at)
select user_uid, id, note, updated_at
from public.favorites
where char_length(btrim(note)) > 0;

-- Takipteki firmalar (favoriler). Bir firma, bulunduğu aramadan bağımsız olarak kullanıcıya aittir:
-- firma bilgileri ve skorlar, takibe alındığı andaki hâliyle kopyalanır.
-- Erişim modeli diğer tablolarla aynı: tarayıcı doğrudan erişemez; yalnızca sunucu (service_role).

create table public.favorites (
  id            uuid primary key default gen_random_uuid(),
  user_uid      text not null references public.profiles (firebase_uid) on delete cascade,
  place_id      text not null,

  name          text not null,
  category      text,
  address       text,
  city          text,
  phone         text,
  website       text,
  maps_url      text,
  rating        numeric(2, 1),
  review_count  integer,

  lead_score    smallint check (lead_score between 0 and 100),
  digital_need  smallint check (digital_need between 0 and 100),
  reachability  smallint check (reachability between 0 and 100),
  priority      smallint check (priority between 0 and 100),
  source        text,                                  -- örn. "Diş kliniği · Kadıköy, İstanbul"

  status        text not null default 'takipte'
                check (status in ('takipte', 'iletisim', 'teklif', 'kazanildi', 'kaybedildi')),
  note          text not null default '' check (char_length(note) <= 500),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (user_uid, place_id)
);

create index favorites_user_created_idx on public.favorites (user_uid, created_at desc);

create trigger favorites_set_updated_at
  before update on public.favorites
  for each row execute function public.set_updated_at();

alter table public.favorites enable row level security;
revoke all on table public.favorites from anon, authenticated;
grant select, insert, update, delete on table public.favorites to service_role;

-- Adspine: ilk şema
-- Erişim modeli: tarayıcı Supabase'e DOĞRUDAN erişmez. Tüm okuma/yazma sunucudan,
-- service_role anahtarıyla yapılır ve her sorgu oturumdaki kullanıcıya (user_uid) göre filtrelenir.
-- Bu yüzden RLS açık, hiçbir politika yok ve anon/authenticated rollerinden tüm yetkiler alındı.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── profiles: onboarding'de toplanan hedef bilgileri ───────────────────────
create table public.profiles (
  firebase_uid           text primary key,
  email                  text,
  display_name           text,
  business_name          text,
  work_type              text,
  services               text[]      not null default '{}',
  target_sectors         text[]      not null default '{}',
  target_cities          text[]      not null default '{}',
  target_size            text,
  deal_value             text,
  extra                  jsonb       not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── lead_searches: bir "Müşteri Bul" araması ───────────────────────────────
create table public.lead_searches (
  id               uuid primary key default gen_random_uuid(),
  user_uid         text not null references public.profiles (firebase_uid) on delete cascade,
  query            text not null,
  location         text not null,
  max_results      integer not null default 50 check (max_results between 1 and 500),
  status           text not null default 'pending'
                   check (status in ('pending', 'scraping', 'scoring', 'done', 'failed')),
  apify_run_id     text,
  apify_dataset_id text,
  total_found      integer not null default 0,
  total_scored     integer not null default 0,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index lead_searches_user_created_idx on public.lead_searches (user_uid, created_at desc);
create index lead_searches_apify_run_idx on public.lead_searches (apify_run_id);

create trigger lead_searches_set_updated_at
  before update on public.lead_searches
  for each row execute function public.set_updated_at();

-- ─── leads: bulunan firmalar + skorları ─────────────────────────────────────
create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  search_id     uuid not null references public.lead_searches (id) on delete cascade,
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

  raw           jsonb not null default '{}'::jsonb,   -- Apify'dan gelen ham kayıt
  jev           jsonb,                                -- JEV'in ham cevabı (puanlar + güven)
  jev_confidence real,

  -- Filtrelenip sıralanan skorlar (0-100). Backend, JEV çıktısından hesaplar.
  sector_fit         smallint check (sector_fit between 0 and 100),
  company_size       smallint check (company_size between 0 and 100),
  audience_fit       smallint check (audience_fit between 0 and 100),
  digital_need       smallint check (digital_need between 0 and 100),
  purchase_potential smallint check (purchase_potential between 0 and 100),
  reachability       smallint check (reachability between 0 and 100),
  priority           smallint check (priority between 0 and 100),
  lead_score         smallint check (lead_score between 0 and 100),

  scored_at     timestamptz,
  created_at    timestamptz not null default now(),

  unique (search_id, place_id)
);

create index leads_user_score_idx on public.leads (user_uid, lead_score desc);
create index leads_search_score_idx on public.leads (search_id, lead_score desc);
create index leads_user_digital_need_idx on public.leads (user_uid, digital_need desc);

-- ─── Güvenlik ───────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.lead_searches  enable row level security;
alter table public.leads          enable row level security;

revoke all on table public.profiles      from anon, authenticated;
revoke all on table public.lead_searches from anon, authenticated;
revoke all on table public.leads         from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

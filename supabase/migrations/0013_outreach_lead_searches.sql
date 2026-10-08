-- Kişi bul v2: önce listele (kredi harcamadan), sonra seçilenleri ekle (kredi düşer). Ayrıca kayıtlı aramalar.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

create table public.outreach_lead_searches (
  id            uuid primary key default gen_random_uuid(),
  user_uid      text not null references public.profiles (firebase_uid) on delete cascade,
  -- Kayıtlı aramada ad dolu ve saved = true; oturum aramalarında ad boştur ve 7 gün sonra silinir.
  name          text check (char_length(name) <= 80),
  saved         boolean not null default false,
  query         jsonb not null,
  status        text not null default 'calisiyor' check (status in ('calisiyor', 'hazir', 'hata')),
  size          integer not null default 25 check (size between 5 and 200),
  found         integer not null default 0,
  -- Sağlayıcı kayıtları (e-posta dahil). Yalnızca sunucu okur; istemciye gizlenmiş hâli gider.
  items         jsonb,
  apify_run_id  text,
  error         text check (char_length(error) <= 300),
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index outreach_lead_searches_user_idx on public.outreach_lead_searches (user_uid, created_at desc);
create index outreach_lead_searches_saved_idx on public.outreach_lead_searches (user_uid) where saved;

alter table public.outreach_lead_searches enable row level security;
revoke all on table public.outreach_lead_searches from anon, authenticated;
grant select, insert, update, delete on table public.outreach_lead_searches to service_role;

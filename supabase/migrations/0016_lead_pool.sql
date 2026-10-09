-- Ortak kişi havuzu (docs/veri-havuzu-tasarimi.md, aşama A+B): bir kullanıcı bir kişiyi kaydettiğinde (Spine Kredi ile açtığında) kayıt buraya da
-- yazılır; başka bir aramada aynı kişi sağlayıcıya yeniden ödeme yapılmadan listeye gelir. E-posta şifreli saklanır, yalnızca sunucu okur.
-- Kapatmak için ortam değişkeni: LEAD_POOL=0.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

create table public.lead_pool (
  email_hash    text primary key,
  email_enc     text not null,
  first_name    text,
  last_name     text,
  title         text,
  org_name      text,
  org_domain    text,
  org_website   text,
  city          text,
  state         text,
  country       text,
  -- Arama için Türkçe/aksan duyarsız anahtarlar (fold).
  city_key      text,
  country_key   text,
  linkedin_url  text,
  -- Kaydı bulduran aramanın filtreleri (sağlayıcı bu kaydı bu sektör/büyüklük/kelimelerle eşleştirdi).
  industries    text[] not null default '{}',
  sizes         text[] not null default '{}',
  keywords      text[] not null default '{}',
  status        text not null default 'gecerli' check (status in ('gecerli', 'riskli', 'gecersiz', 'silindi')),
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index lead_pool_country_idx on public.lead_pool (country_key, last_seen_at desc);
create index lead_pool_city_idx on public.lead_pool (city_key);

-- Silme talebinde bulunan kişilerin e-posta özetleri: havuza yeniden eklenmez ve hiç döndürülmez.
create table public.lead_pool_optout (
  email_hash text primary key,
  created_at timestamptz not null default now()
);

alter table public.lead_pool enable row level security;
alter table public.lead_pool_optout enable row level security;
revoke all on table public.lead_pool, public.lead_pool_optout from anon, authenticated;
grant select, insert, update, delete on table public.lead_pool, public.lead_pool_optout to service_role;

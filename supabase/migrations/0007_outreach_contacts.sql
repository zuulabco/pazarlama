-- Otomasyon (1/…): kişiler (e-postası bulunan ya da aranan firmalar), listeler ve kara liste.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.
-- Erişim modeli diğer tablolarla aynı: tarayıcı doğrudan erişemez; yalnızca sunucu (service_role).

create table public.outreach_contacts (
  id               uuid primary key default gen_random_uuid(),
  user_uid         text not null references public.profiles (firebase_uid) on delete cascade,

  name             text check (char_length(name) <= 120),
  company          text check (char_length(company) <= 160),
  email            text check (char_length(email) <= 254),
  -- yok: henüz bulunamadı · bulundu: sitesinden okundu, MX var · elle: kullanıcı yazdı/CSV ·
  -- riskli: doğrulama tamamlanamadı · gecersiz: sözdizimi/MX hatalı ya da hard bounce
  email_status     text not null default 'yok' check (email_status in ('yok', 'bulundu', 'elle', 'riskli', 'gecersiz')),
  -- is: kendi alan adında · rol: info@ gibi ortak adres · kisisel: gmail/hotmail gibi
  email_kind       text check (email_kind in ('is', 'rol', 'kisisel')),

  phone            text check (char_length(phone) <= 40),
  website          text check (char_length(website) <= 300),
  city             text check (char_length(city) <= 80),

  source           text not null default 'elle' check (source in ('elle', 'csv', 'takip', 'arama')),
  source_url       text check (char_length(source_url) <= 500),
  favorite_id      uuid references public.favorites (id) on delete set null,
  found_at         timestamptz,
  discovery_note   text check (char_length(discovery_note) <= 200),
  discovered_at    timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index outreach_contacts_user_email_idx on public.outreach_contacts (user_uid, lower(email)) where email is not null;
create unique index outreach_contacts_user_favorite_idx on public.outreach_contacts (user_uid, favorite_id) where favorite_id is not null;
create index outreach_contacts_user_created_idx on public.outreach_contacts (user_uid, created_at desc);

create trigger outreach_contacts_set_updated_at
  before update on public.outreach_contacts
  for each row execute function public.set_updated_at();

create table public.outreach_lists (
  id          uuid primary key default gen_random_uuid(),
  user_uid    text not null references public.profiles (firebase_uid) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (user_uid, name)
);

create table public.outreach_list_members (
  list_id     uuid not null references public.outreach_lists (id) on delete cascade,
  contact_id  uuid not null references public.outreach_contacts (id) on delete cascade,
  user_uid    text not null references public.profiles (firebase_uid) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (list_id, contact_id)
);

create index outreach_list_members_contact_idx on public.outreach_list_members (contact_id);

-- Kara liste: kullanıcı başına e-posta ya da alan adı. Abonelikten çıkanlar, hard bounce'lar, şikâyetler ve elle eklenenler.
create table public.outreach_suppressions (
  id          uuid primary key default gen_random_uuid(),
  user_uid    text not null references public.profiles (firebase_uid) on delete cascade,
  email       text check (char_length(email) <= 254),
  domain      text check (char_length(domain) <= 253),
  reason      text not null check (reason in ('abonelik', 'bounce', 'sikayet', 'elle')),
  created_at  timestamptz not null default now(),
  check ((email is not null) <> (domain is not null))
);

create unique index outreach_suppressions_email_idx on public.outreach_suppressions (user_uid, lower(email)) where email is not null;
create unique index outreach_suppressions_domain_idx on public.outreach_suppressions (user_uid, lower(domain)) where domain is not null;

alter table public.outreach_contacts enable row level security;
alter table public.outreach_lists enable row level security;
alter table public.outreach_list_members enable row level security;
alter table public.outreach_suppressions enable row level security;

revoke all on table public.outreach_contacts, public.outreach_lists, public.outreach_list_members, public.outreach_suppressions from anon, authenticated;
grant select, insert, update, delete on table public.outreach_contacts, public.outreach_lists, public.outreach_list_members, public.outreach_suppressions to service_role;

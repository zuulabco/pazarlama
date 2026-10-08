-- Otomasyon (2/…): kullanıcının kendi posta kutuları (SMTP/IMAP) ve alan adı sağlığı.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.
-- Şifreler AES-256-GCM ile şifrelenmiş saklanır (uygulama anahtarı OUTREACH_ENC_KEY); tarayıcıya asla gönderilmez.

create table public.outreach_mailboxes (
  id                 uuid primary key default gen_random_uuid(),
  user_uid           text not null references public.profiles (firebase_uid) on delete cascade,

  email              text not null check (char_length(email) <= 254),
  from_name          text check (char_length(from_name) <= 80),
  signature          text not null default '' check (char_length(signature) <= 1000),
  provider           text not null default 'ozel' check (provider in ('gmail', 'outlook', 'ozel')),

  smtp_host          text not null,
  smtp_port          integer not null check (smtp_port in (25, 465, 587, 2525)),
  smtp_secure        boolean not null default true,
  imap_host          text not null,
  imap_port          integer not null check (imap_port in (143, 993)),
  imap_secure        boolean not null default true,
  username           text not null,
  secret_enc         text not null,

  status             text not null default 'bagli' check (status in ('bagli', 'hata', 'duraklatildi')),
  last_error         text check (char_length(last_error) <= 300),
  consent_at         timestamptz not null default now(),

  daily_limit        integer not null default 20 check (daily_limit between 1 and 500),
  hourly_limit       integer not null default 6 check (hourly_limit between 1 and 100),

  -- Isınma (4. aşama)
  warmup_enabled     boolean not null default false,
  warmup_started_at  timestamptz,
  warmup_score       smallint check (warmup_score between 0 and 100),

  -- Alan adı sağlığı: son SPF/DKIM/DMARC denetimi
  dns_check          jsonb,
  dns_checked_at     timestamptz,

  -- Gelen kutusu okuma (yanıt/bounce) için son okunan IMAP uid
  imap_uidvalidity   bigint,
  imap_last_uid      bigint not null default 0,
  imap_checked_at    timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create unique index outreach_mailboxes_user_email_idx on public.outreach_mailboxes (user_uid, lower(email));

create trigger outreach_mailboxes_set_updated_at
  before update on public.outreach_mailboxes
  for each row execute function public.set_updated_at();

alter table public.outreach_mailboxes enable row level security;
revoke all on table public.outreach_mailboxes from anon, authenticated;
grant select, insert, update, delete on table public.outreach_mailboxes to service_role;

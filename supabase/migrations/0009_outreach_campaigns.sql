-- Otomasyon (3/…): kampanyalar (e-posta dizileri), adımlar, kişi kayıtları, gönderim günlüğü ve olaylar.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.
-- Önce 0007 ve 0008 çalıştırılmış olmalı.

create table public.outreach_sequences (
  id             uuid primary key default gen_random_uuid(),
  user_uid       text not null references public.profiles (firebase_uid) on delete cascade,
  name           text not null check (char_length(name) between 1 and 80),
  description    text not null default '' check (char_length(description) <= 300),
  status         text not null default 'taslak' check (status in ('taslak', 'aktif', 'duraklatildi', 'arsiv')),
  paused_reason  text check (char_length(paused_reason) <= 300),
  -- {"tz":"Europe/Istanbul","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}
  schedule       jsonb not null default '{"tz":"Europe/Istanbul","days":[1,2,3,4,5],"start":"09:00","end":"18:00"}'::jsonb,
  settings       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index outreach_sequences_user_idx on public.outreach_sequences (user_uid, created_at desc);
create trigger outreach_sequences_set_updated_at before update on public.outreach_sequences for each row execute function public.set_updated_at();

create table public.outreach_steps (
  id             uuid primary key default gen_random_uuid(),
  sequence_id    uuid not null references public.outreach_sequences (id) on delete cascade,
  user_uid       text not null references public.profiles (firebase_uid) on delete cascade,
  position       integer not null check (position >= 0),
  kind           text not null check (kind in ('email', 'manual_email', 'arama', 'gorev', 'whatsapp')),
  delay_minutes  integer not null default 0 check (delay_minutes between 0 and 86400),
  enabled        boolean not null default true,
  -- [{"key":"A","mode":"sablon","subject":"…","body":"…","ai":{…},"opener":false}, …]
  variants       jsonb not null default '[]'::jsonb,
  task           jsonb not null default '{"title":"","notes":""}'::jsonb,
  unique (sequence_id, position) deferrable initially deferred
);

create table public.outreach_enrollments (
  id              uuid primary key default gen_random_uuid(),
  user_uid        text not null references public.profiles (firebase_uid) on delete cascade,
  sequence_id     uuid not null references public.outreach_sequences (id) on delete cascade,
  contact_id      uuid not null references public.outreach_contacts (id) on delete cascade,

  status          text not null default 'aktif' check (status in ('aktif', 'bitti', 'duraklatildi', 'hata')),
  finish_reason   text check (finish_reason in ('tamamlandi', 'yanit', 'abonelik', 'bounce', 'sikayet', 'tiklama', 'yanitsiz', 'elle', 'gecersiz', 'kara_liste')),
  -- Sıradaki adımın indeksi (0'dan); adım sayısına ulaşınca bitti
  current_step    integer not null default 0,
  next_run_at     timestamptz,
  mailbox_id      uuid references public.outreach_mailboxes (id) on delete set null,
  thread_root     text,
  last_message_id text,
  root_subject    text,
  -- Adım kimliği → kişiye özel yapay zekâ açılış cümlesi
  personalization jsonb not null default '{}'::jsonb,

  attempts        integer not null default 0,
  last_error      text check (char_length(last_error) <= 300),
  claimed_until   timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (sequence_id, contact_id)
);

create index outreach_enrollments_due_idx on public.outreach_enrollments (next_run_at) where status = 'aktif';
create index outreach_enrollments_contact_idx on public.outreach_enrollments (contact_id);
create index outreach_enrollments_user_idx on public.outreach_enrollments (user_uid, sequence_id);
create trigger outreach_enrollments_set_updated_at before update on public.outreach_enrollments for each row execute function public.set_updated_at();

create table public.outreach_messages (
  id             uuid primary key default gen_random_uuid(),
  user_uid       text not null references public.profiles (firebase_uid) on delete cascade,
  sequence_id    uuid references public.outreach_sequences (id) on delete set null,
  step_id        uuid references public.outreach_steps (id) on delete set null,
  enrollment_id  uuid references public.outreach_enrollments (id) on delete set null,
  contact_id     uuid references public.outreach_contacts (id) on delete set null,
  mailbox_id     uuid references public.outreach_mailboxes (id) on delete set null,
  variant_key    text not null default 'A',

  message_id     text not null unique,
  in_reply_to    text,
  to_email       text not null,
  subject        text not null,
  body_text      text not null,
  status         text not null default 'gonderildi' check (status in ('gonderildi', 'hata', 'bounce')),
  error          text check (char_length(error) <= 300),

  sent_at        timestamptz not null default now(),
  open_count     integer not null default 0,
  opened_at      timestamptz,
  click_count    integer not null default 0,
  clicked_at     timestamptz,
  replied_at     timestamptz,
  bounced_at     timestamptz,
  created_at     timestamptz not null default now()
);

create index outreach_messages_user_sent_idx on public.outreach_messages (user_uid, sent_at desc);
create index outreach_messages_mailbox_sent_idx on public.outreach_messages (mailbox_id, sent_at desc);
create index outreach_messages_enrollment_idx on public.outreach_messages (enrollment_id);
create index outreach_messages_sequence_idx on public.outreach_messages (sequence_id, sent_at desc);

create table public.outreach_events (
  id             uuid primary key default gen_random_uuid(),
  user_uid       text not null references public.profiles (firebase_uid) on delete cascade,
  sequence_id    uuid references public.outreach_sequences (id) on delete set null,
  enrollment_id  uuid references public.outreach_enrollments (id) on delete set null,
  message_row_id uuid references public.outreach_messages (id) on delete set null,
  contact_id     uuid references public.outreach_contacts (id) on delete set null,
  kind           text not null check (kind in ('gonderildi', 'acildi', 'tiklandi', 'yanit', 'otomatik_yanit', 'bounce', 'abonelik', 'sikayet', 'gorev', 'bitti', 'hata')),
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index outreach_events_user_idx on public.outreach_events (user_uid, created_at desc);
create index outreach_events_sequence_idx on public.outreach_events (sequence_id, kind);

-- Göndericinin işleyeceği kayıtları atomik olarak "kilitler": aynı kayıt iki kez gönderilmesin (skip locked + kısa kira).
create or replace function public.claim_outreach_enrollments(batch integer, lease_seconds integer default 90)
returns setof public.outreach_enrollments
language sql
as $$
  update public.outreach_enrollments e
  set claimed_until = now() + make_interval(secs => lease_seconds)
  where e.id in (
    select en.id
    from public.outreach_enrollments en
    join public.outreach_sequences s on s.id = en.sequence_id and s.status = 'aktif'
    where en.status = 'aktif'
      and en.next_run_at <= now()
      and (en.claimed_until is null or en.claimed_until < now())
    order by en.next_run_at
    limit batch
    for update of en skip locked
  )
  returning e.*;
$$;

revoke all on function public.claim_outreach_enrollments(integer, integer) from public, anon, authenticated;
grant execute on function public.claim_outreach_enrollments(integer, integer) to service_role;

alter table public.outreach_sequences enable row level security;
alter table public.outreach_steps enable row level security;
alter table public.outreach_enrollments enable row level security;
alter table public.outreach_messages enable row level security;
alter table public.outreach_events enable row level security;

revoke all on table public.outreach_sequences, public.outreach_steps, public.outreach_enrollments, public.outreach_messages, public.outreach_events from anon, authenticated;
grant select, insert, update, delete on table public.outreach_sequences, public.outreach_steps, public.outreach_enrollments, public.outreach_messages, public.outreach_events to service_role;

-- Gelen kutusu (Unibox): kampanya e-postalarına gelen yanıtların saklanması, kişi başına durum etiketi ve okundu bilgisi.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

create table public.outreach_replies (
  id             uuid primary key default gen_random_uuid(),
  user_uid       text not null references public.profiles (firebase_uid) on delete cascade,
  mailbox_id     uuid references public.outreach_mailboxes (id) on delete set null,
  sequence_id    uuid references public.outreach_sequences (id) on delete set null,
  enrollment_id  uuid not null references public.outreach_enrollments (id) on delete cascade,
  contact_id     uuid references public.outreach_contacts (id) on delete set null,

  message_id     text not null,
  in_reply_to    text,
  from_email     text not null,
  from_name      text check (char_length(from_name) <= 160),
  subject        text not null default '' check (char_length(subject) <= 300),
  body_text      text not null default '' check (char_length(body_text) <= 30000),
  -- yanit: kişinin yanıtı · ooo: ofis dışı otomatik yanıt
  kind           text not null check (kind in ('yanit', 'ooo')),
  received_at    timestamptz not null default now(),
  unique (user_uid, message_id)
);

create index outreach_replies_enrollment_idx on public.outreach_replies (enrollment_id, received_at);
create index outreach_replies_user_idx on public.outreach_replies (user_uid, received_at desc);

alter table public.outreach_replies enable row level security;
revoke all on table public.outreach_replies from anon, authenticated;
grant select, insert, update, delete on table public.outreach_replies to service_role;

-- Kişi (kayıt) başına durum etiketi ve son yanıt/okundu zamanı.
alter table public.outreach_enrollments
  add column if not exists lead_status text not null default 'lead'
    check (lead_status in ('lead', 'ilgili', 'toplanti', 'toplanti_yapildi', 'kazanildi', 'ofis_disi', 'yanlis_kisi', 'ilgisiz', 'kaybedildi')),
  add column if not exists last_reply_at timestamptz,
  add column if not exists read_at timestamptz;

create index if not exists outreach_enrollments_inbox_idx on public.outreach_enrollments (user_uid, last_reply_at desc) where last_reply_at is not null;

-- Isındırma (warm-up): gönderici adresleri havuzda birbirine doğal kısa e-postalar gönderir; alıcı tarafta e-postanın gelen kutusuna
-- mı spam'e mi düştüğü ölçülür, spam'e düşen (mümkünse) gelen kutusuna taşınır ve yanıtlanır. Sonuç, adresin ısınma skorunu verir.
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

alter table public.outreach_mailboxes add column if not exists warmup_consent_at timestamptz;

create table public.outreach_warmup_messages (
  id                  uuid primary key default gen_random_uuid(),
  sender_mailbox_id   uuid not null references public.outreach_mailboxes (id) on delete cascade,
  receiver_mailbox_id uuid references public.outreach_mailboxes (id) on delete set null,
  -- Alıcı tarafın iletiyi tanıması için X-Adspine-Warmup başlığında taşınan rastgele jeton.
  token               text not null unique,
  message_id          text not null,
  subject             text not null,
  -- gonderildi: yolda · gelen_kutusu: ulaştı · spam: spam klasörüne düştü · yanitlandi: ulaştı ve yanıtlandı · kayip: hiç ulaşmadı
  status              text not null default 'gonderildi' check (status in ('gonderildi', 'gelen_kutusu', 'spam', 'yanitlandi', 'kayip')),
  sent_at             timestamptz not null default now(),
  delivered_at        timestamptz,
  replied_at          timestamptz
);

create index outreach_warmup_sender_idx on public.outreach_warmup_messages (sender_mailbox_id, sent_at desc);
create index outreach_warmup_receiver_idx on public.outreach_warmup_messages (receiver_mailbox_id, status);

alter table public.outreach_warmup_messages enable row level security;
revoke all on table public.outreach_warmup_messages from anon, authenticated;
grant select, insert, update, delete on table public.outreach_warmup_messages to service_role;

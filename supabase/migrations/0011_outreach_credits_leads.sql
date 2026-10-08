-- Otomasyon: paket, kredi ve "Kişi bul" (lead veritabanı araması).
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

-- Kullanıcının paketi ve kalan kredisi. Kredi ay başında pakete göre yenilenir (devretmez).
create table public.outreach_accounts (
  user_uid     text primary key references public.profiles (firebase_uid) on delete cascade,
  plan         text not null default 'ucretsiz' check (plan in ('ucretsiz', 'baslangic', 'buyume', 'ajans')),
  credits      integer not null default 0 check (credits >= 0),
  period_start timestamptz not null default date_trunc('month', now()),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger outreach_accounts_set_updated_at
  before update on public.outreach_accounts
  for each row execute function public.set_updated_at();

-- Kredi hareketleri (denetim izi): aylık yenileme, arama, iade, elle düzeltme.
create table public.outreach_credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_uid    text not null references public.profiles (firebase_uid) on delete cascade,
  delta       integer not null,
  balance     integer not null,
  reason      text not null check (reason in ('aylik', 'arama', 'iade', 'elle')),
  ref         text,
  created_at  timestamptz not null default now()
);

create index outreach_credit_ledger_user_idx on public.outreach_credit_ledger (user_uid, created_at desc);

-- Kişi bulma işleri: Apify koşusu başlar, bitince sonuçlar Kişiler'e aktarılır, kullanılmayan kredi iade edilir.
create table public.outreach_lead_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_uid      text not null references public.profiles (firebase_uid) on delete cascade,
  status        text not null default 'calisiyor' check (status in ('calisiyor', 'aktariliyor', 'bitti', 'hata')),
  query         jsonb not null,
  requested     integer not null check (requested between 1 and 500),
  found         integer not null default 0,
  added         integer not null default 0,
  refunded      integer not null default 0,
  skipped       jsonb not null default '{}'::jsonb,
  list_name     text check (char_length(list_name) <= 120),
  apify_run_id  text,
  error         text check (char_length(error) <= 300),
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

create index outreach_lead_jobs_user_idx on public.outreach_lead_jobs (user_uid, created_at desc);
create index outreach_lead_jobs_open_idx on public.outreach_lead_jobs (status) where status in ('calisiyor', 'aktariliyor');

alter table public.outreach_accounts enable row level security;
alter table public.outreach_credit_ledger enable row level security;
alter table public.outreach_lead_jobs enable row level security;
revoke all on table public.outreach_accounts, public.outreach_credit_ledger, public.outreach_lead_jobs from anon, authenticated;
grant select, insert, update, delete on table public.outreach_accounts, public.outreach_credit_ledger, public.outreach_lead_jobs to service_role;

-- Kişilere unvan ve LinkedIn adresi; yeni kaynak türü "kisi_bul".
alter table public.outreach_contacts add column if not exists job_title text check (char_length(job_title) <= 160);
alter table public.outreach_contacts add column if not exists linkedin_url text check (char_length(linkedin_url) <= 300);

alter table public.outreach_contacts drop constraint if exists outreach_contacts_source_check;

alter table public.outreach_contacts
  add constraint outreach_contacts_source_check check (source in ('elle', 'csv', 'takip', 'arama', 'kisi_bul'));

-- Hesabı oluşturur ve ay değiştiyse krediyi yeniler. Kalan krediyi döndürür.
create or replace function public.outreach_account_touch(p_uid text, p_monthly integer)
returns table (out_plan text, out_credits integer, out_period_start timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  month_start timestamptz := date_trunc('month', now());
  acc public.outreach_accounts;
  old_credits integer;
begin
  insert into public.outreach_accounts (user_uid, credits, period_start) values (p_uid, p_monthly, month_start)
  on conflict (user_uid) do nothing;
  if found then
    insert into public.outreach_credit_ledger (user_uid, delta, balance, reason) values (p_uid, p_monthly, p_monthly, 'aylik');
  end if;

  select * into acc from public.outreach_accounts where user_uid = p_uid for update;
  if acc.period_start < month_start then
    old_credits := acc.credits;
    update public.outreach_accounts set credits = p_monthly, period_start = month_start where user_uid = p_uid returning * into acc;
    insert into public.outreach_credit_ledger (user_uid, delta, balance, reason) values (p_uid, p_monthly - old_credits, p_monthly, 'aylik');
  end if;
  return query select acc.plan, acc.credits, acc.period_start;
end $$;

-- Atomik kredi değişimi: bakiye eksiye düşecekse hiçbir şey yapmaz ve null döndürür.
create or replace function public.outreach_credit_change(p_uid text, p_delta integer, p_reason text, p_ref text)
returns integer
language plpgsql security definer set search_path = public as $$
declare new_balance integer;
begin
  update public.outreach_accounts set credits = credits + p_delta
   where user_uid = p_uid and credits + p_delta >= 0
   returning credits into new_balance;
  if new_balance is null then return null; end if;
  insert into public.outreach_credit_ledger (user_uid, delta, balance, reason, ref) values (p_uid, p_delta, new_balance, p_reason, p_ref);
  return new_balance;
end $$;

revoke all on function public.outreach_account_touch(text, integer), public.outreach_credit_change(text, integer, text, text) from public, anon, authenticated;
grant execute on function public.outreach_account_touch(text, integer), public.outreach_credit_change(text, integer, text, text) to service_role;

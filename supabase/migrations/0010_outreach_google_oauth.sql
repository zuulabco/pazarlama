-- "Google ile bağlan": posta kutusu uygulama şifresi yerine Google OAuth ile bağlanabilir.
-- Bu durumda secret_enc alanında şifreli yenileme jetonu (refresh token) saklanır; SMTP/IMAP alanları kullanılmaz.
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.outreach_mailboxes'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%provider%';
  if c is not null then execute format('alter table public.outreach_mailboxes drop constraint %I', c); end if;
end $$;

alter table public.outreach_mailboxes
  add constraint outreach_mailboxes_provider_check check (provider in ('gmail', 'outlook', 'ozel', 'google'));

-- Gmail API ile gelen kutusunu artımlı okumak için son işlenen geçmiş kimliği.
alter table public.outreach_mailboxes add column if not exists gmail_history_id text;

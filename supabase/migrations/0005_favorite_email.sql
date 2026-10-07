-- Takipteki firmaya e-posta adresi (kullanıcı ekler; e-posta taslağı bu adrese hazırlanır).
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

alter table public.favorites
  add column email text check (email is null or char_length(email) <= 254);

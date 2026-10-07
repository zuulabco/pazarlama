-- Takipteki firma kaydına e-posta adresi (varsa 'İletişim kur' e-posta taslağı bu adrese açılır).
-- Çalıştırma: Supabase → SQL Editor → New query → bu dosyanın içeriğini yapıştırıp Run.

alter table public.favorites
  add column email text check (email is null or char_length(email) <= 254);

-- Kampanya: aynı şirketten biri yanıt verince diğer kişilerin dizisini durdurma ("sirket" bitiş nedeni).
alter table public.outreach_enrollments drop constraint if exists outreach_enrollments_finish_reason_check;

alter table public.outreach_enrollments
  add constraint outreach_enrollments_finish_reason_check
  check (finish_reason in ('tamamlandi', 'yanit', 'abonelik', 'bounce', 'sikayet', 'tiklama', 'yanitsiz', 'elle', 'gecersiz', 'kara_liste', 'sirket'));

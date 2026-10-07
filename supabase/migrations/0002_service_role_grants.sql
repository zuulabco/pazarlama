-- Sunucu (service_role) tablolara erişebilsin. anon ve authenticated rolleri bilerek yetkisiz kalır.
grant usage on schema public to service_role;
grant select, insert, update, delete on table public.profiles      to service_role;
grant select, insert, update, delete on table public.lead_searches to service_role;
grant select, insert, update, delete on table public.leads         to service_role;

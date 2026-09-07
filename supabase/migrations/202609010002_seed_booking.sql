insert into public.stores (name, timezone, address, phone, active)
select 'Honey Collection İstanbul', 'Europe/Istanbul', 'İstanbul', '+90 212 000 00 00', true
where not exists (select 1 from public.stores where active);

insert into public.services (name, duration_minutes, buffer_minutes, capacity, active)
select seed.name, seed.duration_minutes, 15, 1, true
from (values
  ('Abiye kiralama', 60),
  ('Abiye satın alma', 60),
  ('Özel dikim görüşmesi', 75),
  ('Ölçü alımı', 45),
  ('Prova', 45),
  ('Teslim / iade', 30)
) as seed(name, duration_minutes)
where not exists (select 1 from public.services s where s.name = seed.name);

insert into public.working_hours (store_id, weekday, opens_at, closes_at)
select s.id, d.weekday, time '10:00', time '19:00'
from public.stores s
cross join (values (1),(2),(3),(4),(5),(6)) as d(weekday)
where s.active
on conflict (store_id, weekday) do nothing;

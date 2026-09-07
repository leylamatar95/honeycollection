create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(), name text not null, email text not null,
  phone text, message text not null, status text not null default 'new', created_at timestamptz not null default now()
);
alter table public.appointments add column if not exists reminder_sent_at timestamptz;

alter table public.notifications enable row level security;
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.services enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "admin notifications" on public.notifications;
create policy "admin notifications" on public.notifications for select to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
drop policy if exists "admin profiles" on public.profiles;
create policy "admin profiles" on public.profiles for select to authenticated using(id=auth.uid() or public.has_role(array['super_admin']::public.app_role[]));
drop policy if exists "admin stores" on public.stores;
create policy "admin stores" on public.stores for all to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[])) with check(public.has_role(array['super_admin']::public.app_role[]));
drop policy if exists "admin services" on public.services;
create policy "admin services" on public.services for all to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[])) with check(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
drop policy if exists "admin working hours" on public.working_hours;
create policy "admin working hours" on public.working_hours for all to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[])) with check(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
drop policy if exists "admin blocked times" on public.blocked_times;
create policy "admin blocked times" on public.blocked_times for all to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[])) with check(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
drop policy if exists "admin contact messages" on public.contact_messages;
create policy "admin contact messages" on public.contact_messages for all to authenticated using(public.has_role(array['super_admin','appointment_staff']::public.app_role[])) with check(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));

revoke all on public.notifications, public.profiles, public.stores, public.services, public.working_hours, public.blocked_times, public.contact_messages from anon;

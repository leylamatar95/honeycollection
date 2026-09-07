alter table public.products add column if not exists rental_enabled boolean default true;
alter table public.products add column if not exists sale_enabled boolean default false;
alter table public.products add column if not exists sizes text[] default '{}';
alter table public.products add column if not exists colors text[] default '{}';
alter table public.products add column if not exists stock_quantity int default 0;
alter table public.products add column if not exists seo_title text;
alter table public.products add column if not exists seo_description text;
alter table public.products add column if not exists view_count int default 0;
alter table public.products add column if not exists appointment_count int default 0;

create table if not exists public.staff(
  id uuid primary key default gen_random_uuid(), full_name text not null,
  email text, phone text, active boolean default true, created_at timestamptz default now()
);
alter table public.appointments add column if not exists staff_id uuid references public.staff;
alter table public.appointments add column if not exists interested_product_ids uuid[] default '{}';

create table if not exists public.site_content(
  id uuid primary key default gen_random_uuid(), section text unique not null,
  content jsonb not null default '{}', updated_at timestamptz default now(), updated_by uuid
);
create table if not exists public.site_settings(
  key text primary key, value jsonb not null default '{}', updated_at timestamptz default now(), updated_by uuid
);
create table if not exists public.notification_templates(
  id uuid primary key default gen_random_uuid(), name text unique not null,
  channel text not null check(channel in ('email','sms','whatsapp','internal')),
  subject text, body text not null, active boolean default true, updated_at timestamptz default now()
);

create or replace function public.has_role(required_roles public.app_role[])
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid() and role=any(required_roles));
$$;
revoke all on function public.has_role(public.app_role[]) from public;
grant execute on function public.has_role(public.app_role[]) to authenticated;

alter table public.staff enable row level security;
alter table public.site_content enable row level security;
alter table public.site_settings enable row level security;
alter table public.notification_templates enable row level security;
alter table public.audit_logs enable row level security;

create policy "admin read appointments" on public.appointments for select to authenticated
using(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create policy "admin manage appointments" on public.appointments for all to authenticated
using(public.has_role(array['super_admin','appointment_staff']::public.app_role[]))
with check(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create policy "admin read customers" on public.customers for select to authenticated
using(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create policy "product managers" on public.products for all to authenticated
using(public.has_role(array['super_admin','product_manager']::public.app_role[]))
with check(public.has_role(array['super_admin','product_manager']::public.app_role[]));
create policy "content managers" on public.site_content for all to authenticated
using(public.has_role(array['super_admin','content_manager']::public.app_role[]))
with check(public.has_role(array['super_admin','content_manager']::public.app_role[]));
create policy "super admins settings" on public.site_settings for all to authenticated
using(public.has_role(array['super_admin']::public.app_role[]))
with check(public.has_role(array['super_admin']::public.app_role[]));
create policy "staff visible to admins" on public.staff for select to authenticated
using(public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create policy "staff managed by super admins" on public.staff for all to authenticated
using(public.has_role(array['super_admin']::public.app_role[]))
with check(public.has_role(array['super_admin']::public.app_role[]));
create policy "audit visible to super admins" on public.audit_logs for select to authenticated
using(public.has_role(array['super_admin']::public.app_role[]));

create or replace function public.audit_admin_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into audit_logs(actor_id,action,entity,entity_id,metadata)
  values(auth.uid(),tg_op,lower(tg_table_name),coalesce(new.id,old.id),jsonb_build_object('old',to_jsonb(old),'new',to_jsonb(new)));
  return coalesce(new,old);
end $$;
drop trigger if exists audit_appointments on public.appointments;
create trigger audit_appointments after insert or update on public.appointments for each row execute function public.audit_admin_change();
drop trigger if exists audit_products on public.products;
create trigger audit_products after insert or update on public.products for each row execute function public.audit_admin_change();

alter publication supabase_realtime add table public.audit_logs;

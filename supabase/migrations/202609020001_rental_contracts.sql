create table if not exists public.rental_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_code text unique not null default ('HCS-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
  appointment_id uuid references public.appointments(id),
  customer_name text not null,
  phone text not null,
  email text not null,
  product_name text not null,
  rental_start date not null,
  rental_end date not null,
  deposit_note text,
  contract_version text not null default '1.0',
  contract_text text not null,
  signature_data_url text not null,
  pdf_path text,
  consent_at timestamptz not null default now(),
  status text not null default 'signed' check (status in ('draft','sent','signed','cancelled')),
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

alter table public.rental_contracts enable row level security;
create policy "admins read rental contracts" on public.rental_contracts for select to authenticated
using (public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create policy "admins manage rental contracts" on public.rental_contracts for all to authenticated
using (public.has_role(array['super_admin','appointment_staff']::public.app_role[]))
with check (public.has_role(array['super_admin','appointment_staff']::public.app_role[]));
create index if not exists rental_contracts_created_idx on public.rental_contracts(created_at desc);

drop trigger if exists audit_rental_contracts on public.rental_contracts;
create trigger audit_rental_contracts after insert or update on public.rental_contracts
for each row execute function public.audit_admin_change();

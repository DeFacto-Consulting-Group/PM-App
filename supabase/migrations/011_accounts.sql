-- Accounts table: stores companies / firms that DFCG works with.
create table if not exists public.accounts (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  billing_address text not null default '',
  main_phone  text not null default '',
  account_type text not null default ''
    check (account_type in ('', 'lead', 'customer', 'owner_insured', 'other')),
  account_status text not null default ''
    check (account_status in ('', 'active', 'not_active')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.accounts enable row level security;

create policy "Authenticated users can read accounts"
  on public.accounts for select
  to authenticated
  using (true);

create policy "Admin / PIC can manage accounts"
  on public.accounts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'pic')
    )
  );

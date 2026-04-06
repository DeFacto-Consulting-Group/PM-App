-- Contacts table: people associated with an account.
create table if not exists public.contacts (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  full_name   text not null,
  title       text not null default '',
  email       text not null default '',
  phone       text not null default '',
  address     text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index contacts_account_id_idx on public.contacts(account_id);

alter table public.contacts enable row level security;

create policy "Authenticated users can read contacts"
  on public.contacts for select
  to authenticated
  using (true);

create policy "Admin / PIC can manage contacts"
  on public.contacts for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'pic')
    )
  );

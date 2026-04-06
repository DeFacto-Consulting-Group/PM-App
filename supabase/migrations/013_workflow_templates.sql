-- Workflow templates: stores editable workflow drafts (e.g. status lifecycle)
create table if not exists public.workflow_templates (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  draft       jsonb not null,
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists workflow_templates_key_idx on public.workflow_templates(key);

alter table public.workflow_templates enable row level security;

create policy "Authenticated users can read workflow templates"
  on public.workflow_templates for select
  to authenticated
  using (true);

create policy "Admin / PIC can manage workflow templates"
  on public.workflow_templates for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'pic')
    )
  );


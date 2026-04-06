# Diary follow-up notifications

## Behavior

- Runs **daily at midnight CST** (America/Chicago).
- Sends:
  - **Due today**: one email listing all diary entries whose `follow_up_date` is today (CST).
  - **Reminder**: one email listing all diary entries whose `follow_up_date` is tomorrow (CST).
- Recipients are the union of:
  - the **creator** of each diary entry (`created_by`)
  - **any tagged users** in the notes markup (react-mentions format `@[Name](user_id)`).
- If a follow-up date is edited, it will be included in the next run for the new date (no “sent” tracking).
- The UI prevents selecting past follow-up dates.

## Required environment variables

- `RESEND_API_KEY`
- `DIARY_NOTIFICATION_FROM_EMAIL` (example: `DFCG <notifications@yourdomain.com>`)
- `CRON_SECRET` (used as `x-cron-secret` header on the cron request)

## API endpoint (cron target)

- `POST /api/diary/send-followups`
- Header: `x-cron-secret: <CRON_SECRET>`

## Suggested database table

Create `diary_entries` (Supabase/Postgres):

```sql
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  created_by uuid not null references public.profiles(id),
  linked_project text not null,
  follow_up_date date not null,
  notes text null
);

create index if not exists diary_entries_follow_up_date_idx
  on public.diary_entries (follow_up_date);
```

## Cron scheduling

Schedule a daily cron job for **00:00 America/Chicago** that calls the endpoint above.


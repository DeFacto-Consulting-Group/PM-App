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
- `CRON_SECRET` — set in Vercel project settings. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically. For manual testing you can also send `x-cron-secret: <CRON_SECRET>`.

## API endpoint (cron target)

- `GET` or `POST /api/diary/send-followups`
- Auth: `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) or `x-cron-secret: <CRON_SECRET>` (manual)

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

## Cron scheduling (Vercel)

The repo includes `vercel.json` with a cron on **`/api/diary/send-followups`**. Schedules are **UTC**. The default is **`0 6 * * *`** (06:00 UTC), which is **midnight Central Standard Time (CST)**. During daylight saving (CDT), that run is **01:00 local** — adjust the cron expression in `vercel.json` if you need midnight local year-round (e.g. use `0 5 * * *` during CDT months, or accept one hour offset).

After deploy, confirm **Cron Jobs** in the Vercel project and that `CRON_SECRET` is set so invocations are authorized.


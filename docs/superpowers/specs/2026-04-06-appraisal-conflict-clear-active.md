## Goal

Update the status-change workflow so **Appraisal** projects can move **immediately to `active`** once conflicts are cleared, without being gated by “Authorization Received”. Non-appraisal projects keep the existing `pending_ea_retainer_auth` gate behavior (EA + Retainer tasks).

## Current behavior (before change)

- Conflict cleared transitions (`pending_conflict` → / `conflict_review` →) land on `pending_ea_retainer_auth`.
- For **Appraisal** templates, moving from `pending_ea_retainer_auth` → `active` requires task **“Authorization Received”** to be completed.
- For non-appraisal templates, moving from `pending_ea_retainer_auth` → `active` requires **“Engagement Agreement”** and **“Retainer Invoice?”** to be completed.

## Desired behavior (Option A)

### Conflict cleared → new status

- **Appraisal** projects:
  - `pending_conflict` → `active` when email check returns all-clear
  - `conflict_review` → `active` when cleared in app
- **Non-appraisal** projects (unchanged):
  - `pending_conflict` / `conflict_review` → `pending_ea_retainer_auth`

### Gate tasks / task templates

- Keep the pending engagement + retainer tasks and their gate for non-appraisals (unchanged).
- Keep the **“Authorization Received”** task visible for Appraisals **but it must not block activation** (because Appraisals skip `pending_ea_retainer_auth` entirely).

## UX / Reporting expectations

- Audit/logging should reflect “conflict cleared → active” for Appraisals (no intermediate Pending EA status).
- Workflow diagram should reflect the new conflict transition destination for Appraisals.

## Non-goals

- Renaming statuses or adding new statuses.
- Removing the “Authorization Received” task from templates (explicitly keep it for now).


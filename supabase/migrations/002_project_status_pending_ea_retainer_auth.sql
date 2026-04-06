-- Add status between conflict resolution and Approved (EA / retainer / auth gate).
-- Re-run safe: if the value already exists, apply manually or ignore the error.

ALTER TYPE project_status ADD VALUE 'pending_ea_retainer_auth';

-- ============================================================================
-- DFCG Project Management App — Initial Schema Migration
-- ============================================================================

-- =========================
-- 1. ENUMS
-- =========================

CREATE TYPE user_role AS ENUM (
  'admin',
  'pic',
  'project_manager',
  'guest'
);

CREATE TYPE engagement_type AS ENUM (
  'appraisal',
  'building_consulting',
  'cost_estimating',
  'litigation_support',
  'pca_cost_segregation',
  'adr_umpire',
  'other'
);

CREATE TYPE project_status AS ENUM (
  'pending_conflict',
  'conflict_review',
  'approved',
  'active',
  'report_issued',
  'billing',
  'closed',
  'archived'
);

CREATE TYPE task_status AS ENUM (
  'not_started',
  'in_progress',
  'internal_review',
  'waiting',
  'completed'
);

CREATE TYPE deliverable_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected'
);

CREATE TYPE priority_level AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- =========================
-- 2. TABLES
-- =========================

-- profiles ----------------------------------------------------------------

CREATE TABLE profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  first_name text        NOT NULL,
  last_name  text        NOT NULL,
  email      text        NOT NULL UNIQUE,
  role       user_role   NOT NULL DEFAULT 'guest',
  status     text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'inactive')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- projects ----------------------------------------------------------------

CREATE TABLE projects (
  id                    uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            text            UNIQUE,
  name                  text            NOT NULL,
  client_name           text            NOT NULL,
  client_type           text            NOT NULL DEFAULT 'defense'
                          CHECK (client_type IN ('defense', 'plaintiff')),
  client_address        text            NOT NULL DEFAULT '',
  point_of_contact      text,
  representing          text,
  engagement_type       engagement_type NOT NULL,
  property_address      text            NOT NULL,
  lead_consultant       uuid            REFERENCES profiles(id),
  opposing_parties      text[]          DEFAULT '{}',
  represented_by        text,
  case_number_type      text            NOT NULL DEFAULT 'case_number'
                        CHECK (case_number_type IN ('case_number', 'cause_number')),
  case_number           text,
  date_of_loss          date,
  report_due_date       date,
  policy_number         text,
  claim_number          text,
  narrative             text,
  status                project_status  NOT NULL DEFAULT 'pending_conflict',
  sharepoint_folder_url text,
  quickbooks_link       text,
  start_date            date,
  end_date              date,
  owner_id              uuid            NOT NULL REFERENCES profiles(id),
  created_at            timestamptz     NOT NULL DEFAULT now(),
  updated_at            timestamptz     NOT NULL DEFAULT now()
);

-- tasks -------------------------------------------------------------------

CREATE TABLE tasks (
  id              uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id     uuid,
  bucket          text           NOT NULL DEFAULT 'execution'
                    CHECK (bucket IN ('project_intake', 'execution', 'milestones', 'closeout')),
  name            text           NOT NULL,
  description     text,
  assigned_to     uuid           REFERENCES profiles(id),
  status          task_status    NOT NULL DEFAULT 'not_started',
  due_date        date,
  priority        priority_level NOT NULL DEFAULT 'medium',
  sort_order      integer        NOT NULL DEFAULT 0,
  checklist_items jsonb          NOT NULL DEFAULT '[]',
  completed_date  date,
  created_at      timestamptz    NOT NULL DEFAULT now(),
  updated_at      timestamptz    NOT NULL DEFAULT now()
);

-- deliverables ------------------------------------------------------------

CREATE TABLE deliverables (
  id                uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid              NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id           uuid              REFERENCES tasks(id) ON DELETE SET NULL,
  name              text              NOT NULL,
  file_reference    text,
  deliverable_type  text,
  responsible_party uuid              REFERENCES profiles(id),
  status            deliverable_status NOT NULL DEFAULT 'draft',
  due_date          date,
  completion_date   date,
  created_at        timestamptz       NOT NULL DEFAULT now(),
  updated_at        timestamptz       NOT NULL DEFAULT now()
);

-- conflict_checks ---------------------------------------------------------

CREATE TABLE conflict_checks (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sent_to            text[]      NOT NULL,
  matched_projects   jsonb,
  total_recipients   integer     NOT NULL DEFAULT 0,
  responses_received integer     NOT NULL DEFAULT 0,
  status             text        NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'cleared', 'conflict_found')),
  sent_at            timestamptz DEFAULT now(),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- conflict_responses ------------------------------------------------------

CREATE TABLE conflict_responses (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_check_id uuid        NOT NULL REFERENCES conflict_checks(id) ON DELETE CASCADE,
  token             text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  responder_name    text        NOT NULL,
  responder_email   text        NOT NULL,
  response          text        CHECK (response IN ('no_conflict', 'possible_conflict')),
  conflict_details  text,
  responded_at      timestamptz
);

-- task_templates ----------------------------------------------------------

CREATE TABLE task_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_group  text        NOT NULL
                    CHECK (template_group IN ('appraisal', 'general')),
  bucket          text        NOT NULL DEFAULT 'execution'
                    CHECK (bucket IN ('project_intake', 'execution', 'milestones', 'closeout')),
  task_name       text        NOT NULL,
  description     text,
  checklist_items text[]      NOT NULL DEFAULT '{}',
  default_status  task_status NOT NULL DEFAULT 'not_started',
  sort_order      integer     NOT NULL DEFAULT 0
);

-- audit_logs --------------------------------------------------------------

CREATE TABLE audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     text        NOT NULL,
  entity_id       uuid        NOT NULL,
  action          text        NOT NULL,
  changed_fields  jsonb,
  previous_values jsonb,
  performed_by    uuid        NOT NULL REFERENCES profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Add FK for tasks.template_id (after task_templates table exists)
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_template
  FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE SET NULL;

-- Indexes for common lookups
CREATE INDEX idx_projects_owner        ON projects(owner_id);
CREATE INDEX idx_projects_status       ON projects(status);
CREATE INDEX idx_tasks_project         ON tasks(project_id);
CREATE INDEX idx_tasks_assigned        ON tasks(assigned_to);
CREATE INDEX idx_tasks_bucket          ON tasks(bucket);
CREATE INDEX idx_deliverables_project  ON deliverables(project_id);
CREATE INDEX idx_deliverables_task     ON deliverables(task_id);
CREATE INDEX idx_conflict_checks_proj  ON conflict_checks(project_id);
CREATE INDEX idx_conflict_resp_check   ON conflict_responses(conflict_check_id);
CREATE INDEX idx_audit_entity          ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by    ON audit_logs(performed_by);

-- =========================
-- 3. FUNCTIONS & TRIGGERS
-- =========================

-- (a) Auto-generate project_id  (DFCG-YYYY-NNN) -------------------------

CREATE OR REPLACE FUNCTION generate_project_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  next_seq     integer;
BEGIN
  current_year := to_char(now(), 'YYYY');

  SELECT coalesce(max(
    nullif(split_part(p.project_id, '-', 3), '')::integer
  ), 0) + 1
  INTO next_seq
  FROM projects p
  WHERE p.project_id LIKE 'DFCG-' || current_year || '-%';

  NEW.project_id := 'DFCG-' || current_year || '-' || lpad(next_seq::text, 3, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_generate_id
  BEFORE INSERT ON projects
  FOR EACH ROW
  WHEN (NEW.project_id IS NULL)
  EXECUTE FUNCTION generate_project_id();

-- (b) Auto-update updated_at ---------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_deliverables_updated_at
  BEFORE UPDATE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (c) Audit log trigger ---------------------------------------------------

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _entity_id     uuid;
  _action        text;
  _changed       jsonb;
  _previous      jsonb;
  _performed_by  uuid;
  _old_json      jsonb;
  _new_json      jsonb;
  _key           text;
BEGIN
  _performed_by := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  IF TG_OP = 'INSERT' THEN
    _entity_id := NEW.id;
    _action    := 'created';
    _changed   := to_jsonb(NEW);
    _previous  := NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    _entity_id := NEW.id;
    _action    := 'updated';
    _old_json  := to_jsonb(OLD);
    _new_json  := to_jsonb(NEW);
    _changed   := '{}'::jsonb;
    _previous  := '{}'::jsonb;

    FOR _key IN SELECT jsonb_object_keys(_new_json)
    LOOP
      IF _key NOT IN ('updated_at') AND
         (_new_json -> _key)::text IS DISTINCT FROM (_old_json -> _key)::text
      THEN
        _changed  := _changed  || jsonb_build_object(_key, _new_json -> _key);
        _previous := _previous || jsonb_build_object(_key, _old_json -> _key);
      END IF;
    END LOOP;

    IF _changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    _entity_id := OLD.id;
    _action    := 'deleted';
    _changed   := NULL;
    _previous  := to_jsonb(OLD);
  END IF;

  INSERT INTO audit_logs (entity_type, entity_id, action, changed_fields, previous_values, performed_by)
  VALUES (TG_TABLE_NAME, _entity_id, _action, _changed, _previous, _performed_by);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_projects_audit
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trg_tasks_audit
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER trg_deliverables_audit
  AFTER INSERT OR UPDATE OR DELETE ON deliverables
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- =========================
-- 4. SEED DATA — task_templates
-- =========================

-- =============================
-- APPRAISAL — Project Intake
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('appraisal', 'project_intake', 'Conflict Check',
    ARRAY['Create conflict check','Email Conflict check to all staff','Follow-up email to client to confirm no conflict'], 1),
  ('appraisal', 'project_intake', 'Enter into QBO', '{}', 2),
  ('appraisal', 'project_intake', 'Import project into TSheets', '{}', 3),
  ('appraisal', 'project_intake', 'Create Project email folder in Outlook', '{}', 4),
  ('appraisal', 'project_intake', 'Create Project folder in SharePoint', '{}', 5),
  ('appraisal', 'project_intake', 'Download Provided Docs', '{}', 6),
  ('appraisal', 'project_intake', 'Create Channel',
    ARRAY['Create channel in Teams','Add Project info sheet'], 7),
  ('appraisal', 'project_intake', 'Authorization Received',
    ARRAY['Authorization received from client','Assignment Acceptance email'], 8);

-- =============================
-- APPRAISAL — Execution
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('appraisal', 'execution', 'Assign PIC', '{}', 1),
  ('appraisal', 'execution', 'Assign Team Lead', '{}', 2),
  ('appraisal', 'execution', 'Sort/Date Docs',
    ARRAY['Extract and label, date docs, pdf','List in received docs spreadsheet','Upload to Dropbox; forward link to OA'], 3),
  ('appraisal', 'execution', 'Project Kickoff Meeting',
    ARRAY['DFCG''s scope of work','Scope of Repair','Work Product','Milestones','Review provided docs','Site Visit contact person'], 4),
  ('appraisal', 'execution', 'Draft Project Milestones', '{}', 5),
  ('appraisal', 'execution', 'Appraisal Tasks',
    ARRAY['Contact Opposing Appraiser','Umpire agreement','Signed DoA','Schedule Site Visit'], 6),
  ('appraisal', 'execution', 'Schedule Site Visit/Logistics',
    ARRAY['LOGISTICS - staffing, travel, flights, rentals, hotels, per diem, etc.','Tool/equipment transport'], 7),
  ('appraisal', 'execution', 'Download Aerials/Streetview',
    ARRAY['Eagleview','Google Earth','Google Streetview','Other sources'], 8),
  ('appraisal', 'execution', 'Order ACT Roof measurements', '{}', 9),
  ('appraisal', 'execution', 'Site Visit Prep meeting',
    ARRAY['Site Maps','Review equipment requirements','Staffing','Review Logistics'], 10),
  ('appraisal', 'execution', 'SITE VISIT (initial)',
    ARRAY['Drone','3D camera','Infrared Camera','Logistics','Other Equipment','Ladder(s)'], 11),
  ('appraisal', 'execution', 'Misc. Research', ARRAY['As assigned'], 12),
  ('appraisal', 'execution', 'Client Updates',
    ARRAY['Proposed $ award from both sides','Phone/email update - 1st of each month','Phone/email same day/within 1 day of Site Visit','Milestone updates (site visit scheduled, OA contacted, umpire invoked, etc)'], 13),
  ('appraisal', 'execution', 'Interim Billing',
    ARRAY['Within 5 days of the 1st of each month','Within 2 days of Report issue','Within 2 days of initial Site Visit'], 14),
  ('appraisal', 'execution', 'Compose Estimate(s)',
    ARRAY['Confirm estimate scope (source and repairs estimated)','Confirm quantity/dimension sources','Confirm unit cost sources','Appraisal Estimate'], 15),
  ('appraisal', 'execution', 'Compose Umpire Report',
    ARRAY['Create Cover/Sig page','Create Report outline','Confirm report sections (Observations, Conclusions, Estimate(s), Reviews, etc)','Create Appendix Covers'], 16),
  ('appraisal', 'execution', 'Supplemental Report/Estimate',
    ARRAY['Supplemental Research','Umpire Rebuttals/Letters','Supplemental Sort/Date Docs'], 17),
  ('appraisal', 'execution', 'Umpire SITE VISIT', '{}', 18),
  ('appraisal', 'execution', 'Download appraisal district records', '{}', 19),
  ('appraisal', 'execution', 'Exchange Positions',
    ARRAY['Estimate','Supporting docs'], 20),
  ('appraisal', 'execution', 'Impasse/Settlement',
    ARRAY['If agreement with OA, complete award form','Impasse - activate Umpire'], 21),
  ('appraisal', 'execution', 'QA/QC',
    ARRAY['QA/QC Draft reports at least 1 day prior to issue'], 22),
  ('appraisal', 'execution', 'Issue Umpire Report/Estimate', '{}', 23),
  ('appraisal', 'execution', 'Appraisal Award',
    ARRAY['Send completed award and estimate to Client within 1 day','Compose/sign/issue award'], 24);

-- =============================
-- APPRAISAL — Milestones
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, description, checklist_items, sort_order) VALUES
  ('appraisal', 'milestones', 'Project Kickoff Scheduled', 'Within 5 days of project intake', '{}', 1),
  ('appraisal', 'milestones', 'Site Visit Scheduled', 'Within 14 days of project intake', '{}', 2),
  ('appraisal', 'milestones', 'Work Product Completed for QA/QC', 'Within 14 days of Site Visit', '{}', 3),
  ('appraisal', 'milestones', 'Upload and sort photos/site data', NULL, '{}', 4),
  ('appraisal', 'milestones', 'Issue Work Product', 'Within 30 days of Project Intake', '{}', 5),
  ('appraisal', 'milestones', 'Rebuttals', 'Within 7 days of receipt', '{}', 6),
  ('appraisal', 'milestones', 'Project Closeout', 'Within 45 days of Project Intake', '{}', 7),
  ('appraisal', 'milestones', 'Legal Appearance', NULL,
    ARRAY['Deposition','Trial','Arbitration/Mediation','Expert Designation'], 8);

-- =============================
-- APPRAISAL — Closeout
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('appraisal', 'closeout', 'Final Billing', '{}', 1),
  ('appraisal', 'closeout', 'Project Post-mortem', '{}', 2),
  ('appraisal', 'closeout', 'Closeout',
    ARRAY['Confirm final billing','Sort/collate all documents in project file','Move to .Archived files in SharePoint','Leave QBO Project Status as "In Progress" until all invoices have been paid','Mark ''end date'' in QBO'], 3);

-- =============================
-- GENERAL — Project Intake
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('general', 'project_intake', 'Conflict Check',
    ARRAY['Create conflict check','Email Conflict check to all staff','Follow-up email to client to confirm no conflict'], 1),
  ('general', 'project_intake', 'Create Project in QBO', '{}', 2),
  ('general', 'project_intake', 'Import project into TSheets', '{}', 3),
  ('general', 'project_intake', 'Create Project email folder in Outlook', '{}', 4),
  ('general', 'project_intake', 'Create Project folder in SharePoint', '{}', 5),
  ('general', 'project_intake', 'Download Provided Docs', '{}', 6),
  ('general', 'project_intake', 'Create Channel',
    ARRAY['Create channel in Teams','Add Project info sheet'], 7),
  ('general', 'project_intake', 'Authorization Received',
    ARRAY['Authorization received from client','Assignment Acceptance email sent'], 8),
  ('general', 'project_intake', 'Engagement Agreement',
    ARRAY['Create EA/approval','Signed EA received','EA sent'], 9),
  ('general', 'project_intake', 'Retainer Invoice?',
    ARRAY['Create retainer invoice/approved','Retainer invoice sent','Close task when payment received','Retainer amount $$$'], 10),
  ('general', 'project_intake', 'Project Budget',
    ARRAY['Scope of assignment','Client Approval','Send budget to client'], 11);

-- =============================
-- GENERAL — Execution
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('general', 'execution', 'Assign PIC', '{}', 1),
  ('general', 'execution', 'Assign Team Lead', '{}', 2),
  ('general', 'execution', 'Sort/Date Docs',
    ARRAY['Extract and label, date docs, pdf','List in received docs spreadsheet'], 3),
  ('general', 'execution', 'Project Kickoff Meeting',
    ARRAY['DFCG''s scope of work','Scope of Repair','Work Product','Milestones','Review provided docs','Site Visit contact person'], 4),
  ('general', 'execution', 'Draft Project Milestones', '{}', 5),
  ('general', 'execution', 'Schedule Site Visit/Logistics',
    ARRAY['Site visit scheduled','LOGISTICS - staffing, travel, flights, rentals, hotels, per diem, etc.','Tool/equipment transport','Contact client'], 6),
  ('general', 'execution', 'Download Aerials/Streetview',
    ARRAY['Eagleview','Google Earth','Google Streetview','Other sources'], 7),
  ('general', 'execution', 'Order ACT Roof measurements', '{}', 8),
  ('general', 'execution', 'Site Visit Prep meeting',
    ARRAY['Site maps','Review equipment requirements','Staffing','Review Logistics'], 9),
  ('general', 'execution', 'SITE VISIT (initial)',
    ARRAY['Drone','3D camera','Infrared Camera','Logistics/Travel','Other equipment','Ladder(s)'], 10),
  ('general', 'execution', 'Misc. Research', ARRAY['As assigned'], 11),
  ('general', 'execution', 'Client Updates',
    ARRAY['Phone/email update - 1st of each month','Phone/email update - same day/within 1 day of Site Visit','Provide milestone updates (EA received, site visit scheduled, OA contacted, umpire invoked, etc)'], 12),
  ('general', 'execution', 'Interim Billing',
    ARRAY['Within 5 days of the 1st of each month','Within 2 days of Report issue','Within 2 days of initial Site Visit'], 13),
  ('general', 'execution', 'Download appraisal district records', '{}', 14),
  ('general', 'execution', 'Compose Estimate(s)',
    ARRAY['Confirm estimate scope (source and repairs estimated)','Confirm quantity/dimension sources','Confirm unit cost sources','Estimate per client Authorization','Additional Estimate(s)'], 15),
  ('general', 'execution', 'Compose report',
    ARRAY['Create Cover/Sig page','Create Report outline','Confirm report sections (Observations, Conclusions, Estimate(s), Reviews, etc)','Create Appendix Covers'], 16),
  ('general', 'execution', 'Supplemental Work',
    ARRAY['Supplemental Research','Supplemental reports/estimates','Supplemental Sort/Date Docs'], 17),
  ('general', 'execution', 'Supplemental SITE VISIT', '{}', 18),
  ('general', 'execution', 'QA/QC',
    ARRAY['QA/QC Draft reports at least 1 day prior to issue'], 19),
  ('general', 'execution', 'Issue Report/Estimate', '{}', 20),
  ('general', 'execution', 'Report Followup',
    ARRAY['Email/phone Client/Umpire within 2 days after report issue'], 21);

-- =============================
-- GENERAL — Milestones
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, description, checklist_items, sort_order) VALUES
  ('general', 'milestones', 'Project Kickoff Scheduled', 'Within 5 days of project intake', '{}', 1),
  ('general', 'milestones', 'Site Visit Scheduled', 'Within 14 days of project intake', '{}', 2),
  ('general', 'milestones', 'Work Product Completed for QA/QC', 'Within 14 days of Site Visit', '{}', 3),
  ('general', 'milestones', 'Upload and sort photos/site data', NULL, '{}', 4),
  ('general', 'milestones', 'Issue Work Product', 'Within 30 days of Project Intake', '{}', 5),
  ('general', 'milestones', 'Rebuttals', 'Within 7 days of receipt', '{}', 6),
  ('general', 'milestones', 'Project Closeout', 'Within 45 days of Project Intake', '{}', 7),
  ('general', 'milestones', 'Legal Appearance', NULL,
    ARRAY['Deposition','Trial','Arbitration/Mediation','Expert Designation'], 8);

-- =============================
-- GENERAL — Closeout
-- =============================
INSERT INTO task_templates (template_group, bucket, task_name, checklist_items, sort_order) VALUES
  ('general', 'closeout', 'Final Billing', '{}', 1),
  ('general', 'closeout', 'Project Post-mortem', '{}', 2),
  ('general', 'closeout', 'Closeout',
    ARRAY['Confirm final billing','Sort/collate all documents in project file','Move to .Archived files in SharePoint','Leave QBO Project Status as "In Progress" until all invoices have been paid','Mark ''end date'' in QBO'], 3);

-- =========================
-- 5. ROW LEVEL SECURITY
-- =========================

-- Helper: get current user's role ----------------------------------------

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Enable RLS on every table -----------------------------------------------

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_checks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflict_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs         ENABLE ROW LEVEL SECURITY;

-- profiles ----------------------------------------------------------------

CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- projects ----------------------------------------------------------------

CREATE POLICY projects_select ON projects
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY projects_insert ON projects
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY projects_update ON projects
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'))
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY projects_delete ON projects
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'));

-- tasks -------------------------------------------------------------------

CREATE POLICY tasks_select ON tasks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY tasks_insert ON tasks
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY tasks_update_admin_pic ON tasks
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'))
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY tasks_update_pm ON tasks
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'project_manager'
    AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.lead_consultant = auth.uid() OR p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'project_manager'
    AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.lead_consultant = auth.uid() OR p.owner_id = auth.uid()
    )
  );

CREATE POLICY tasks_update_guest ON tasks
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'guest'
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'guest'
    AND assigned_to = auth.uid()
  );

CREATE POLICY tasks_delete ON tasks
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'));

-- deliverables ------------------------------------------------------------

CREATE POLICY deliverables_select ON deliverables
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY deliverables_insert ON deliverables
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY deliverables_update_admin_pic ON deliverables
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'))
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY deliverables_update_pm ON deliverables
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'project_manager'
    AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.lead_consultant = auth.uid() OR p.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    get_user_role() = 'project_manager'
    AND project_id IN (
      SELECT p.id FROM projects p
      WHERE p.lead_consultant = auth.uid() OR p.owner_id = auth.uid()
    )
  );

CREATE POLICY deliverables_update_guest ON deliverables
  FOR UPDATE TO authenticated
  USING (
    get_user_role() = 'guest'
    AND responsible_party = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'guest'
    AND responsible_party = auth.uid()
  );

CREATE POLICY deliverables_delete ON deliverables
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'));

-- conflict_checks ---------------------------------------------------------

CREATE POLICY conflict_checks_select ON conflict_checks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY conflict_checks_insert ON conflict_checks
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY conflict_checks_update ON conflict_checks
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'))
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY conflict_checks_delete ON conflict_checks
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'));

-- conflict_responses ------------------------------------------------------

CREATE POLICY conflict_responses_select ON conflict_responses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY conflict_responses_insert ON conflict_responses
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY conflict_responses_update ON conflict_responses
  FOR UPDATE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'))
  WITH CHECK (get_user_role() IN ('admin', 'pic'));

CREATE POLICY conflict_responses_delete ON conflict_responses
  FOR DELETE TO authenticated
  USING (get_user_role() IN ('admin', 'pic'));

-- task_templates ----------------------------------------------------------

CREATE POLICY task_templates_select ON task_templates
  FOR SELECT TO authenticated
  USING (true);

-- audit_logs --------------------------------------------------------------

CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT TO authenticated
  USING (get_user_role() IN ('admin', 'pic', 'project_manager'));

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================


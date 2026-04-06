export type UserRole = "admin" | "pic" | "project_manager" | "guest";

export type EngagementType =
  | "appraisal"
  | "building_consulting"
  | "cost_estimating"
  | "litigation_support"
  | "pca_cost_segregation"
  | "adr_umpire"
  | "other";

export type ProjectStatus =
  | "pending_conflict"
  | "conflict_review"
  | "pending_ea_retainer_auth"
  | "active"
  | "report_issued"
  | "hold"
  | "closed"
  | "archived";

export type TaskStatus =
  | "not_started"
  | "in_progress"
  | "internal_review"
  | "waiting"
  | "completed";

export type TaskBucket =
  | "project_intake"
  | "execution"
  | "milestones"
  | "closeout";

export type DeliverableStatus = "draft" | "submitted" | "approved" | "rejected";

export type PriorityLevel = "low" | "medium" | "high" | "urgent";

export interface ChecklistItem {
  name: string;
  completed: boolean;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  status: "active" | "inactive";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Side (party) for the engagement — UI label via `CLIENT_TYPE_LABELS`. */
export const CLIENT_TYPE_OPTIONS = [
  "defense",
  "plaintiff",
  "carrier",
  "owner_insured",
  "na",
  "other",
] as const;

export type ClientType = (typeof CLIENT_TYPE_OPTIONS)[number];

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  defense: "Defense",
  plaintiff: "Plaintiff",
  carrier: "Carrier",
  owner_insured: "Owner/Insured",
  na: "N/A",
  other: "Other",
};

export const PERIL_OPTIONS = [
  "collapse",
  "construction_defects",
  "earthquake",
  "fire_smoke",
  "flood",
  "freeze",
  "hail",
  "hurricane",
  "ice_snow",
  "riot_civil",
  "sewage_backup",
  "theft_vandalism",
  "tornado",
  "vehicle",
  "water",
  "windstorm",
  "other",
] as const;

export type PerilType = (typeof PERIL_OPTIONS)[number];

export const PERIL_LABELS: Record<PerilType, string> = {
  collapse: "Collapse",
  construction_defects: "Construction Defects",
  earthquake: "Earthquake",
  fire_smoke: "Fire/Smoke",
  flood: "Flood",
  freeze: "Freeze",
  hail: "Hail",
  hurricane: "Hurricane",
  ice_snow: "Ice/Snow",
  riot_civil: "Riot/Civil",
  sewage_backup: "Sewage/Backup",
  theft_vandalism: "Theft/Vandalism",
  tornado: "Tornado",
  vehicle: "Vehicle",
  water: "Water",
  windstorm: "Windstorm",
  other: "Other",
};

export const STRUCTURE_TYPE_OPTIONS = [
  "apartment_multi_family",
  "commercial",
  "condominium",
  "industrial",
  "infrastructure",
  "institutional",
  "mixed_use",
  "residential",
  "other",
] as const;

export type StructureType = (typeof STRUCTURE_TYPE_OPTIONS)[number];

export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  apartment_multi_family: "Apartment/Multi-Family",
  commercial: "Commercial",
  condominium: "Condominium",
  industrial: "Industrial",
  infrastructure: "Infrastructure",
  institutional: "Institutional",
  mixed_use: "Mixed-Use",
  residential: "Residential",
  other: "Other",
};

/**
 * Role/Standing options for "Other Parties" (name + role + standing + notes).
 * Used for both UI dropdowns and persistence in `projects.other_parties` (jsonb).
 */
export const OTHER_PARTY_ROLE_OPTIONS = [
  "appraiser",
  "attorney",
  "carrier",
  "client",
  "client_contact",
  "contractor",
  "engineer_architect",
  "expert",
  "firm",
  "ia_tpa",
  "insured",
  "owner",
  "public_adjuster",
  "umpire_adr",
  "other",
] as const;

export type OtherPartyRole = (typeof OTHER_PARTY_ROLE_OPTIONS)[number];

export const OTHER_PARTY_ROLE_LABELS: Record<OtherPartyRole, string> = {
  appraiser: "Appraiser",
  attorney: "Attorney",
  carrier: "Carrier",
  client: "Client",
  client_contact: "Client Contact",
  contractor: "Contractor",
  engineer_architect: "Engineer/Architect",
  expert: "Expert",
  firm: "Firm",
  ia_tpa: "IA/TPA",
  insured: "Insured",
  owner: "Owner",
  public_adjuster: "Public Adjuster",
  umpire_adr: "Umpire/ADR",
  other: "Other",
};

export const OTHER_PARTY_STANDING_OPTIONS = [
  "aligned",
  "opposed",
  "neutral",
  "third_party",
  "na",
  "other",
] as const;

export type OtherPartyStanding = (typeof OTHER_PARTY_STANDING_OPTIONS)[number];

export const OTHER_PARTY_STANDING_LABELS: Record<
  OtherPartyStanding,
  string
> = {
  aligned: "Aligned",
  opposed: "Opposed",
  neutral: "Neutral",
  third_party: "Third Party",
  na: "N/A",
  other: "Other",
};

export interface OtherParty {
  /** Free text name. */
  name: string;
  role: OtherPartyRole;
  standing: OtherPartyStanding;
  /** Optional note; may include react-mentions markup for @ tags. */
  notes?: string | null;
}

export interface Project {
  id: string;
  project_id: string;
  name: string;
  client_name: string;
  client_type: ClientType;
  client_address: string;
  point_of_contact: string | null;
  point_of_contact_secondary: string | null;
  representing: string | null;
  engagement_type: EngagementType;
  /** When set, full selection; otherwise derive from `engagement_type` only. */
  engagement_types: EngagementType[] | null;
  property_address: string;
  lead_consultant: string;
  opposing_parties: string[];
  represented_by: string | null;
  other_parties: OtherParty[] | null;
  case_number_type: "case_number" | "cause_number" | null;
  case_number: string | null;
  date_of_loss: string | null;
  peril: PerilType | null;
  report_due_date: string | null;
  structure_type: StructureType | null;
  policy_number: string | null;
  /** Optional litigation / court cause number (distinct from claim #). */
  cause_number: string | null;
  claim_number: string | null;
  narrative: string;
  /** Internal notes; may contain react-mentions markup for @user tags. */
  notes: string | null;
  status: ProjectStatus;
  sharepoint_folder_url: string | null;
  quickbooks_link: string | null;
  start_date: string | null;
  end_date: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  lead_consultant_profile?: Profile;
  owner_profile?: Profile;
}

export interface Task {
  id: string;
  project_id: string;
  template_id: string | null;
  bucket: TaskBucket;
  name: string;
  description: string | null;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  priority: PriorityLevel;
  sort_order: number;
  checklist_items: ChecklistItem[];
  completed_date: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_profile?: Profile;
  project?: Pick<Project, "id" | "project_id" | "name">;
}

export interface Deliverable {
  id: string;
  project_id: string;
  task_id: string | null;
  name: string;
  file_reference: string | null;
  deliverable_type: string | null;
  responsible_party: string | null;
  status: DeliverableStatus;
  due_date: string | null;
  completion_date: string | null;
  created_at: string;
  updated_at: string;
  responsible_party_profile?: Profile;
}

export interface MatchedProject {
  project_id: string;
  name: string;
  client_name: string;
  matched_party: string;
  matching_term: string;
}

export interface ConflictCheck {
  id: string;
  project_id: string;
  sent_to: string[];
  matched_projects: MatchedProject[] | null;
  total_recipients: number;
  responses_received: number;
  status: "pending" | "cleared" | "conflict_found";
  sent_at: string;
  created_at: string;
}

export interface ConflictResponse {
  id: string;
  conflict_check_id: string;
  token: string;
  responder_name: string;
  responder_email: string;
  response: "no_conflict" | "possible_conflict" | null;
  conflict_details: string | null;
  responded_at: string | null;
}

export interface TaskTemplate {
  id: string;
  template_group: "appraisal" | "general";
  bucket: TaskBucket;
  task_name: string;
  description: string | null;
  checklist_items: string[];
  default_status: TaskStatus;
  sort_order: number;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_fields: Record<string, unknown> | null;
  previous_values: Record<string, unknown> | null;
  performed_by: string;
  created_at: string;
  performed_by_profile?: Profile;
}

export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  appraisal: "Appraisal",
  building_consulting: "Building Consulting",
  cost_estimating: "Cost Estimating",
  litigation_support: "Litigation Support",
  pca_cost_segregation: "PCA/Cost Segregation",
  adr_umpire: "ADR/Umpire",
  other: "Other",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending_conflict: "Pending Conflict",
  conflict_review: "Conflict Review",
  pending_ea_retainer_auth: "Pending EA/Retainer",
  active: "Active",
  report_issued: "Report Issued",
  hold: "Hold",
  closed: "Closed",
  archived: "Archived",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  internal_review: "Internal Review",
  waiting: "Waiting",
  completed: "Completed",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  pending_conflict: "bg-amber-100 text-amber-800 border-amber-200",
  conflict_review: "bg-red-100 text-red-800 border-red-200",
  pending_ea_retainer_auth:
    "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800",
  active: "bg-teal-100 text-teal-800 border-teal-200",
  report_issued: "bg-lime-100 text-lime-800 border-lime-200",
  hold: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/35 dark:text-orange-100 dark:border-orange-800",
  closed: "bg-gray-100 text-gray-600 border-gray-200",
  archived: "bg-gray-100 text-gray-500 border-gray-200",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  not_started: "bg-gray-100 text-gray-700 border-gray-200",
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  internal_review: "bg-purple-100 text-purple-800 border-purple-200",
  waiting: "bg-amber-100 text-amber-800 border-amber-200",
  completed: "bg-green-100 text-green-800 border-green-200",
};

export const TASK_BUCKET_LABELS: Record<TaskBucket, string> = {
  project_intake: "Project Intake",
  execution: "Execution",
  milestones: "Milestones",
  closeout: "Closeout",
};

export const TASK_BUCKET_ORDER: TaskBucket[] = [
  "project_intake",
  "execution",
  "milestones",
  "closeout",
];

export const TASK_BUCKET_COLORS: Record<TaskBucket, string> = {
  project_intake: "border-t-blue-500",
  execution: "border-t-amber-500",
  milestones: "border-t-purple-500",
  closeout: "border-t-green-500",
};

/** Task template routing: Appraisal → appraisal template; every other enum value → master (general) template. */
export function getEngagementTemplateGroup(type: EngagementType): "appraisal" | "general" {
  return type === "appraisal" ? "appraisal" : "general";
}

/* ------------------------------------------------------------------ */
/*  Accounts & Contacts                                               */
/* ------------------------------------------------------------------ */

export const ACCOUNT_TYPE_OPTIONS = ["lead", "customer", "owner_insured", "other"] as const;
export type AccountType = (typeof ACCOUNT_TYPE_OPTIONS)[number];
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  lead: "Lead",
  customer: "Customer",
  owner_insured: "Owner/Insured",
  other: "Other",
};

export const ACCOUNT_STATUS_OPTIONS = ["active", "not_active"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUS_OPTIONS)[number];
export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: "Active",
  not_active: "Not Active",
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  lead: "bg-purple-100 text-purple-800 border-purple-200",
  customer: "bg-blue-100 text-blue-800 border-blue-200",
  owner_insured: "bg-teal-100 text-teal-800 border-teal-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  active: "bg-green-100 text-green-800 border-green-200",
  not_active: "bg-gray-100 text-gray-500 border-gray-200",
};

export interface Account {
  id: string;
  name: string;
  billing_address: string;
  main_phone: string;
  account_type: AccountType | "";
  account_status: AccountStatus | "";
}

export interface Contact {
  id: string;
  account_id: string;
  full_name: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}


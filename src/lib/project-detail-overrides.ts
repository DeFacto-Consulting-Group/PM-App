import type {
  ClientType,
  OtherParty,
  PerilType,
  StructureType,
} from "@/types/index";

/** localStorage key — use for cross-tab `storage` listeners if needed. */
export const PROJECT_DETAIL_OVERRIDES_STORAGE_KEY = "dfcg-project-detail-overrides-v1";

const KEY = PROJECT_DETAIL_OVERRIDES_STORAGE_KEY;

/** Fired when project detail fields are saved from the edit page (same-tab). */
export const PROJECT_DETAIL_OVERRIDES_EVENT = "dfcg-project-detail-overrides-changed";

/** Fields we persist from Edit Project (extend as needed for the detail page). */
export interface ProjectDetailStoredFields {
  client_name?: string;
  client_type?: ClientType;
  point_of_contact?: string;
  point_of_contact_secondary?: string;
  notes?: string;
  peril?: PerilType;
  structure_type?: StructureType;
  policy_number?: string;
  cause_number?: string;
  claim_number?: string;
  other_parties?: OtherParty[];
}

function readAll(): Record<string, ProjectDetailStoredFields> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ProjectDetailStoredFields>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getProjectDetailOverrides(
  projectId: string
): ProjectDetailStoredFields | undefined {
  return readAll()[projectId];
}

export function saveProjectDetailOverrides(
  projectId: string,
  patch: ProjectDetailStoredFields
): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[projectId] = { ...all[projectId], ...patch };
  localStorage.setItem(KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(PROJECT_DETAIL_OVERRIDES_EVENT));
}

/** Merge mock project row with any user-saved overrides. */
export function mergeProjectDetailFields<
  T extends { client_name: string; client_type: ClientType },
>(base: T, projectId: string): T {
  const o = getProjectDetailOverrides(projectId);
  if (!o) return base;
  return {
    ...base,
    ...(o.client_name !== undefined ? { client_name: o.client_name } : {}),
    ...(o.client_type !== undefined ? { client_type: o.client_type } : {}),
    ...(o.point_of_contact !== undefined ? { point_of_contact: o.point_of_contact } : {}),
    ...(o.point_of_contact_secondary !== undefined
      ? { point_of_contact_secondary: o.point_of_contact_secondary }
      : {}),
    ...(o.notes !== undefined ? { notes: o.notes } : {}),
    ...(o.peril !== undefined ? { peril: o.peril } : {}),
    ...(o.structure_type !== undefined ? { structure_type: o.structure_type } : {}),
    ...(o.policy_number !== undefined ? { policy_number: o.policy_number } : {}),
    ...(o.cause_number !== undefined ? { cause_number: o.cause_number } : {}),
    ...(o.claim_number !== undefined ? { claim_number: o.claim_number } : {}),
    ...(o.other_parties !== undefined ? { other_parties: o.other_parties } : {}),
  };
}

/** Merge edit form defaults with localStorage (client-only). */
export function applyStoredProjectDetailToEditDefaults<T extends Record<string, unknown>>(
  projectId: string,
  mock: T
): T {
  const o = getProjectDetailOverrides(projectId);
  if (!o) return mock;
  return {
    ...mock,
    ...(o.client_name !== undefined ? { client_name: o.client_name } : {}),
    ...(o.client_type !== undefined ? { client_type: o.client_type } : {}),
    ...(o.point_of_contact !== undefined ? { point_of_contact: o.point_of_contact } : {}),
    ...(o.point_of_contact_secondary !== undefined
      ? { point_of_contact_secondary: o.point_of_contact_secondary }
      : {}),
    ...(o.notes !== undefined ? { notes: o.notes } : {}),
    ...(o.peril !== undefined ? { peril: o.peril } : {}),
    ...(o.structure_type !== undefined ? { structure_type: o.structure_type } : {}),
    ...(o.policy_number !== undefined ? { policy_number: o.policy_number } : {}),
    ...(o.cause_number !== undefined ? { cause_number: o.cause_number } : {}),
    ...(o.claim_number !== undefined ? { claim_number: o.claim_number } : {}),
    ...(o.other_parties !== undefined ? { other_parties: o.other_parties } : {}),
  };
}

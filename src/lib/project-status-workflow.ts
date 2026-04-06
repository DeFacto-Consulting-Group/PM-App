import type { ProjectStatus } from "@/types/index";
import { PROJECT_STATUS_LABELS } from "@/types/index";

/**
 * Documented workflow for project status — used by the workflow diagram page.
 * Changing types / DB still requires updating `ProjectStatus` in `types/index.ts`.
 */

export interface ConflictTransition {
  id: string;
  from: ProjectStatus;
  to: ProjectStatus;
  label: string;
}

/** How conflict checks move project status (see `api/conflict/respond` + project detail “clear”). */
export const DEFAULT_CONFLICT_TRANSITIONS: ConflictTransition[] = [
  {
    id: "to-review",
    from: "pending_conflict",
    to: "conflict_review",
    label: "Email check: any recipient reports possible conflict",
  },
  {
    id: "to-approved-clear-non-appraisal",
    from: "pending_conflict",
    to: "pending_ea_retainer_auth",
    label: "Email check: all recipients answered, none report conflict (non-appraisals)",
  },
  {
    id: "to-active-clear-appraisal",
    from: "pending_conflict",
    to: "active",
    label: "Email check: all recipients answered, none report conflict (appraisals)",
  },
  {
    id: "review-to-approved-non-appraisal",
    from: "conflict_review",
    to: "pending_ea_retainer_auth",
    label: "Admin/PIC clears conflict in app (non-appraisals)",
  },
  {
    id: "review-to-active-appraisal",
    from: "conflict_review",
    to: "active",
    label: "Admin/PIC clears conflict in app (appraisals)",
  },
];

/** Typical delivery pipeline after conflict resolution (editable on workflow page). */
export const DEFAULT_DELIVERY_PIPELINE: ProjectStatus[] = [
  "pending_ea_retainer_auth",
  "active",
  "report_issued",
  "hold",
  "closed",
  "archived",
];

export interface ProjectStatusWorkflowDraft {
  /** Ordered stages after conflict intake (must be valid ProjectStatus values). */
  deliveryPipeline: ProjectStatus[];
  /** Optional overrides for conflict transition labels (by id). */
  conflictLabelOverrides: Partial<Record<string, string>>;
  /** Freeform notes shown under the chart. */
  notes: string;
}

const STORAGE_KEY = "dfcg-project-status-workflow-draft-v1";

export const PROJECT_STATUS_WORKFLOW_DRAFT_EVENT = "dfcg-project-status-workflow-draft-changed";

function notifyDraftChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PROJECT_STATUS_WORKFLOW_DRAFT_EVENT));
}

export function getDefaultWorkflowDraft(): ProjectStatusWorkflowDraft {
  return {
    deliveryPipeline: [...DEFAULT_DELIVERY_PIPELINE],
    conflictLabelOverrides: {},
    notes: "",
  };
}

/** Legacy drafts may still list `approved`; merge into `active`. */
function normalizePipeline(stages: string[]): ProjectStatus[] {
  const seen = new Set<string>();
  const out: ProjectStatus[] = [];
  for (const s of stages) {
    const next = (
      s === "approved" ? "active" : s === "billing" ? "hold" : s
    ) as ProjectStatus;
    if (seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out;
}

export function loadWorkflowDraft(): ProjectStatusWorkflowDraft {
  if (typeof window === "undefined") return getDefaultWorkflowDraft();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultWorkflowDraft();
    const parsed = JSON.parse(raw) as ProjectStatusWorkflowDraft & {
      deliveryPipeline?: ProjectStatus[];
    };
    if (
      !parsed ||
      !Array.isArray(parsed.deliveryPipeline) ||
      parsed.deliveryPipeline.length === 0
    ) {
      return getDefaultWorkflowDraft();
    }
    const pipeline = normalizePipeline(parsed.deliveryPipeline as string[]);
    if (pipeline.length === 0) return getDefaultWorkflowDraft();
    return {
      deliveryPipeline: pipeline,
      conflictLabelOverrides: parsed.conflictLabelOverrides ?? {},
      notes: typeof parsed.notes === "string" ? parsed.notes : "",
    };
  } catch {
    return getDefaultWorkflowDraft();
  }
}

export function saveWorkflowDraft(draft: ProjectStatusWorkflowDraft): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  notifyDraftChanged();
}

export function clearWorkflowDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  notifyDraftChanged();
}

export function labelForStatus(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS[status];
}

/** Mermaid flowchart (TB) for docs / Notion — uses current draft pipeline when provided. */
export function buildMermaidFlowchart(draft?: ProjectStatusWorkflowDraft): string {
  const pipeline =
    draft?.deliveryPipeline?.length && draft.deliveryPipeline.length > 0
      ? draft.deliveryPipeline
      : DEFAULT_DELIVERY_PIPELINE;

  const clean: string[] = ["flowchart TB"];
  clean.push("  subgraph delivery[Delivery lifecycle]");
  for (let i = 0; i < pipeline.length; i++) {
    clean.push(`    S${i}["${labelForStatus(pipeline[i]!)}"]`);
  }
  for (let i = 0; i < pipeline.length - 1; i++) {
    clean.push(`    S${i} --> S${i + 1}`);
  }
  clean.push("  end");
  clean.push("  subgraph conflict[Conflict intake]");
  clean.push('    PC["Pending Conflict"]');
  clean.push('    CR["Conflict Review"]');
  clean.push("    PC -->|possible conflict| CR");
  const activeIndex = pipeline.indexOf("active");
  const activeNode = activeIndex >= 0 ? `S${activeIndex}` : "S0";
  clean.push(`    PC -->|all clear (non-appraisals)| S0`);
  clean.push(`    CR -->|cleared (non-appraisals)| S0`);
  clean.push(`    PC -->|all clear (appraisals)| ${activeNode}`);
  clean.push(`    CR -->|cleared (appraisals)| ${activeNode}`);
  clean.push("  end");

  return clean.join("\n");
}

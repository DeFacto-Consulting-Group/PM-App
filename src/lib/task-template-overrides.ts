import type { MockTask } from "./task-template-defaults";
import { generateAppraisalTasks, generateGeneralTasks } from "./task-template-defaults";

export type TemplateGroupId = "general" | "appraisal";

const STORAGE_KEY = "dfcg-task-template-overrides-v1";

/** Fired when overrides change so open tabs can refresh if needed. */
export const TASK_TEMPLATE_OVERRIDES_EVENT = "dfcg-task-template-overrides-changed";

export const TASK_TEMPLATE_REGISTRY: {
  id: TemplateGroupId;
  label: string;
  description: string;
}[] = [
  {
    id: "general",
    label: "Master (general)",
    description:
      "Default workflow for all non-appraisal engagements (litigation, consulting, PCA, cost segregation, ADR, etc.). New projects use this checklist when intake is not Appraisal.",
  },
  {
    id: "appraisal",
    label: "Appraisal",
    description:
      "Adds execution-phase tasks (site visit, aerials, research) and appraisal-specific milestones. Used when project engagement type is Appraisal.",
  },
];

type OverridesFile = Partial<Record<TemplateGroupId, MockTask[]>>;

function readAll(): OverridesFile {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OverridesFile;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(next: OverridesFile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(TASK_TEMPLATE_OVERRIDES_EVENT));
}

function defaultTasksForGroup(group: TemplateGroupId): MockTask[] {
  return group === "appraisal" ? generateAppraisalTasks() : generateGeneralTasks();
}

/** Tasks used when seeding a project — browser overrides or shipped defaults. SSR uses defaults only. */
export function getEffectiveTemplateTasks(group: TemplateGroupId): MockTask[] {
  if (typeof window === "undefined") {
    return defaultTasksForGroup(group);
  }
  const all = readAll();
  const custom = all[group];
  if (custom && Array.isArray(custom) && custom.length > 0) {
    return custom;
  }
  return defaultTasksForGroup(group);
}

export function saveTemplateOverride(group: TemplateGroupId, tasks: MockTask[]): void {
  const all = readAll();
  all[group] = tasks;
  writeAll(all);
}

export function clearTemplateOverride(group: TemplateGroupId): void {
  const all = readAll();
  delete all[group];
  writeAll(all);
}

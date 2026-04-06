import { getEngagementTemplateGroup, type EngagementType } from "@/types/index";

/** Master (general) template: both must be completed to advance past Pending EA/Retainer. */
export const EA_GATE_TASKS_GENERAL = ["Engagement Agreement", "Retainer Invoice?"] as const;

/** Appraisal template: this task must be completed to advance. */
export const EA_GATE_TASK_APPRAISAL = "Authorization Received";

/**
 * Returns true when project may move from `pending_ea_retainer_auth` → `active`.
 * Uses exact task names from the shipped templates (template overrides that rename tasks require code updates).
 */
export function isEaRetainerAuthGateSatisfied(
  engagementType: EngagementType,
  tasks: { name: string; status: string }[]
): boolean {
  const group = getEngagementTemplateGroup(engagementType);
  if (group === "appraisal") {
    // Appraisals should not be gated by authorization; they go Active immediately once conflicts clear.
    return true;
  }
  const [a, b] = EA_GATE_TASKS_GENERAL;
  const ea = tasks.find((x) => x.name === a);
  const ret = tasks.find((x) => x.name === b);
  return ea?.status === "completed" && ret?.status === "completed";
}

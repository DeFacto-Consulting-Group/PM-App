import type { EngagementType } from "@/types/index";
import { getEngagementTemplateGroup } from "@/types/index";
import type { SyncedTask } from "@/lib/task-sync";
import type { MockTask } from "./task-template-defaults";
import { getEffectiveTemplateTasks } from "./task-template-overrides";

export type { MockTask } from "./task-template-defaults";
export { generateAppraisalTasks, generateGeneralTasks } from "./task-template-defaults";
export {
  getEffectiveTemplateTasks,
  saveTemplateOverride,
  clearTemplateOverride,
  TASK_TEMPLATE_REGISTRY,
  TASK_TEMPLATE_OVERRIDES_EVENT,
  type TemplateGroupId,
} from "./task-template-overrides";

export function mockTasksToSyncedTasks(
  projectId: string,
  engagementType: EngagementType,
  tasks: MockTask[]
): SyncedTask[] {
  return tasks.map((t) => ({
    id: t.id,
    project_id: projectId,
    engagement_type: engagementType,
    bucket: t.bucket,
    name: t.name,
    description: t.description,
    status: t.status,
    assigned_to: t.assigned_to,
    initials: t.initials,
    due_date: t.due_date,
    completed_date: t.completed_date,
    checklist_items: t.checklist_items,
    sort_order: t.sort_order,
  }));
}

export function getInitialSyncedTasksForProject(
  projectId: string,
  engagementType: EngagementType
): SyncedTask[] {
  const templateGroup = getEngagementTemplateGroup(engagementType);
  const template = getEffectiveTemplateTasks(templateGroup);
  return mockTasksToSyncedTasks(projectId, engagementType, template);
}

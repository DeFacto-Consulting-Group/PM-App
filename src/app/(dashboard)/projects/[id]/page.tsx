"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  Building2,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ClientType,
  TaskStatus,
  TaskBucket,
  EngagementType,
  ProjectStatus,
  OtherParty,
  PerilType,
  StructureType,
} from "@/types/index";
import {
  ENGAGEMENT_TYPE_LABELS,
  CLIENT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  TASK_BUCKET_LABELS,
  TASK_BUCKET_ORDER,
  TASK_BUCKET_COLORS,
  getEngagementTemplateGroup,
  OTHER_PARTY_ROLE_LABELS,
  OTHER_PARTY_STANDING_LABELS,
  PERIL_LABELS,
  STRUCTURE_TYPE_LABELS,
} from "@/types/index";
import {
  getSyncedTasks,
  TASK_SYNC_STORAGE_EVENT,
  upsertProjectTasks,
  type SyncedTask,
} from "@/lib/task-sync";
import {
  EA_GATE_TASKS_GENERAL,
  isEaRetainerAuthGateSatisfied,
} from "@/lib/project-ea-approval-gate";
import { getStoredProjectStatus, setStoredProjectStatus } from "@/lib/project-status-local";
import {
  mergeProjectDetailFields,
  PROJECT_DETAIL_OVERRIDES_EVENT,
  PROJECT_DETAIL_OVERRIDES_STORAGE_KEY,
} from "@/lib/project-detail-overrides";
import type { MockTask } from "@/lib/project-task-templates";
import {
  generateAppraisalTasks,
  generateGeneralTasks,
  getEffectiveTemplateTasks,
  TASK_TEMPLATE_OVERRIDES_EVENT,
} from "@/lib/project-task-templates";
import { isTaskPastDue } from "@/lib/task-due";
import { cn } from "@/lib/utils";
import { formatNotesForDisplay } from "@/lib/notes-mentions-display";

// --- Mock project data ---

interface MockProjectDetail {
  project_id: string;
  name: string;
  client_name: string;
  client_type: ClientType;
  client_address: string;
  point_of_contact: string;
  /** Optional second POC when client has multiple contacts. */
  point_of_contact_secondary?: string;
  representing: string;
  /** Primary `engagement_type` column â€” drives task templates (Appraisal vs master). */
  engagement_type: EngagementType;
  /** Full multi-select; display only. Templates use `engagement_type`. */
  engagement_types: EngagementType[];
  property_address: string;
  lead_consultant: string;
  opposing_parties: string[];
  other_parties?: OtherParty[];
  represented_by: string;
  case_number: string;
  date_of_loss: string;
  peril?: PerilType;
  structure_type?: StructureType;
  report_due_date: string;
  policy_number: string;
  /** Court / litigation cause number (optional; distinct from claim #). */
  cause_number: string;
  claim_number: string;
  narrative: string;
  /** Internal notes (optional); may include @mention markup. */
  notes?: string;
  status: ProjectStatus;
  sharepoint_folder_url: string;
  start_date: string;
  conflict_example_details?: string;
}

const mockProjects: Record<string, MockProjectDetail> = {
  "0001-2026": {
    project_id: "0001-2026",
    name: "Riverside Office Complex Appraisal",
    client_name: "Meridian Properties LLC",
    client_type: "defense",
    client_address: "500 Commerce St, Dallas, TX 75201",
    point_of_contact: "Jane Doe",
    representing: "Covington Specialty Insurance Company",
    engagement_type: "appraisal",
    engagement_types: ["appraisal"],
    property_address: "1200 Riverside Dr, Austin, TX 78704",
    lead_consultant: "John Harrison",
    opposing_parties: ["Wells Fargo Bank", "CBRE Valuation"],
    represented_by: "",
    case_number: "",
    date_of_loss: "",
    report_due_date: "2026-03-30",
    policy_number: "VBA88637300",
    cause_number: "",
    claim_number: "7030181844",
    narrative:
      "Full appraisal of a Class-A office complex comprising three buildings totaling 185,000 SF.",
    status: "active",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/001",
    start_date: "2026-02-15",
  },
  "0002-2026": {
    project_id: "0002-2026",
    name: "Palomita Blanca v. Covington Ins.",
    client_name: "Cooper Montgomery, Bruce Wilkin",
    client_type: "defense",
    client_address: "200 Main St, Mission, TX 78572",
    point_of_contact: "Bruce Wilkin",
    representing: "Covington Specialty Insurance Company",
    engagement_type: "litigation_support",
    engagement_types: ["litigation_support"],
    property_address: "1352 E. 1st Street, Mission, TX 78572",
    lead_consultant: "Sarah Chen",
    opposing_parties: ["Palomita Blanca Adult Daycare"],
    represented_by: "J. Michael Moore (Moore Law Firm)",
    case_number: "CL-25-1144-F",
    date_of_loss: "2023-04-28",
    report_due_date: "2026-04-07",
    policy_number: "VBA88637300",
    cause_number: "CV-2024-00912",
    claim_number: "7030181844",
    narrative: "Storm/hail damage claim â€” need cost of estimated repairs.",
    status: "pending_conflict",
    sharepoint_folder_url: "",
    start_date: "2026-03-01",
  },
  "0003-2026": {
    project_id: "0003-2026",
    name: "Metro Plaza Cost Estimate",
    client_name: "Atlas Development Corp",
    client_type: "plaintiff",
    client_address: "1818 Main St, Chicago, IL 60601",
    point_of_contact: "Alex Bennett",
    representing: "Atlas Development Corp",
    engagement_type: "cost_estimating",
    engagement_types: ["cost_estimating"],
    property_address: "220 W Wacker Dr, Chicago, IL 60606",
    lead_consultant: "Michael Torres",
    opposing_parties: ["Monument Construction"],
    represented_by: "",
    case_number: "",
    date_of_loss: "2025-11-18",
    report_due_date: "2026-03-12",
    policy_number: "ATX229301",
    cause_number: "",
    claim_number: "CLM-882193",
    narrative:
      "Detailed repair estimate and quantity validation for mixed-use tower damages.",
    status: "report_issued",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/003",
    start_date: "2026-01-30",
  },
  "0004-2026": {
    project_id: "0004-2026",
    name: "Lakeside Tower PCA",
    client_name: "Great Lakes REIT",
    client_type: "defense",
    client_address: "1025 N Water St, Milwaukee, WI 53202",
    point_of_contact: "Olivia Price",
    representing: "Great Lakes REIT",
    engagement_type: "pca_cost_segregation",
    engagement_types: ["pca_cost_segregation"],
    property_address: "777 E Lakeshore Dr, Milwaukee, WI 53202",
    lead_consultant: "Emily Walsh",
    opposing_parties: [],
    represented_by: "",
    case_number: "",
    date_of_loss: "",
    report_due_date: "2026-03-25",
    policy_number: "",
    cause_number: "",
    claim_number: "",
    narrative:
      "Property condition assessment and reserve recommendations for financing review.",
    status: "active",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/004",
    start_date: "2026-02-10",
  },
  "0005-2026": {
    project_id: "0005-2026",
    name: "Downtown Retail ADR",
    client_name: "Pacific Mutual Insurance",
    client_type: "defense",
    client_address: "150 SW 5th Ave, Portland, OR 97204",
    point_of_contact: "Ryan Cooper",
    representing: "Pacific Mutual Insurance",
    engagement_type: "adr_umpire",
    engagement_types: ["adr_umpire"],
    property_address: "410 NW Broadway, Portland, OR 97209",
    lead_consultant: "Robert Kim",
    opposing_parties: ["Northwest Retail Group"],
    represented_by: "Sutton Cole LLP",
    case_number: "ADR-2026-044",
    date_of_loss: "2025-10-03",
    report_due_date: "",
    policy_number: "PM-44028-OR",
    cause_number: "",
    claim_number: "PM-778201",
    narrative:
      "Umpire engagement for disputed retail damage scope and valuation.",
    status: "hold",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/005",
    start_date: "2026-01-20",
  },
  "0006-2026": {
    project_id: "0006-2026",
    name: "Harborview Condo Assessment",
    client_name: "Harborview HOA",
    client_type: "plaintiff",
    client_address: "99 Alaskan Way, Seattle, WA 98101",
    point_of_contact: "Linda Morales",
    representing: "Harborview HOA",
    engagement_type: "building_consulting",
    engagement_types: ["building_consulting"],
    property_address: "1450 Harborview Ave, Seattle, WA 98121",
    lead_consultant: "John Harrison",
    opposing_parties: ["Bluebay Restoration"],
    represented_by: "Harper Finch Legal",
    case_number: "BC-2026-119",
    date_of_loss: "2025-12-09",
    report_due_date: "",
    policy_number: "HV-HOA-2025",
    cause_number: "",
    claim_number: "HV-224480",
    narrative:
      "Building envelope review and repair scope dispute requiring conflict review.",
    status: "conflict_review",
    sharepoint_folder_url: "",
    start_date: "2026-03-05",
    conflict_example_details:
      "Possible conflict reported by Sarah Chen: prior consulting relationship with Bluebay Restoration on a related property dispute.",
  },
  "0007-2026": {
    project_id: "0007-2026",
    name: "Grandview Estates Appraisal",
    client_name: "Sterling Capital Partners",
    client_type: "defense",
    client_address: "505 N Central Ave, Phoenix, AZ 85004",
    point_of_contact: "Trevor Shaw",
    representing: "Sterling Capital Partners",
    engagement_type: "appraisal",
    engagement_types: ["appraisal"],
    property_address: "2240 Grandview Blvd, Phoenix, AZ 85016",
    lead_consultant: "Emily Walsh",
    opposing_parties: ["Grandview Estates HOA"],
    represented_by: "",
    case_number: "",
    date_of_loss: "2025-09-26",
    report_due_date: "2026-04-02",
    policy_number: "STR-88109",
    cause_number: "",
    claim_number: "STR-11903",
    narrative:
      "Appraisal assignment for multi-building residential loss valuation.",
    status: "active",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/007",
    start_date: "2026-02-21",
  },
  "0008-2026": {
    project_id: "0008-2026",
    name: "Bayside Industrial Park Consulting",
    client_name: "Trident Manufacturing",
    client_type: "plaintiff",
    client_address: "790 Bayshore Dr, Tampa, FL 33602",
    point_of_contact: "Megan Parks",
    representing: "Trident Manufacturing",
    engagement_type: "building_consulting",
    engagement_types: ["building_consulting"],
    property_address: "3200 Port Access Rd, Tampa, FL 33605",
    lead_consultant: "Michael Torres",
    opposing_parties: ["Atlantic Contractors"],
    represented_by: "",
    case_number: "",
    date_of_loss: "2025-12-30",
    report_due_date: "2026-04-10",
    policy_number: "TRI-33001",
    cause_number: "",
    claim_number: "TRI-55204",
    narrative:
      "Industrial facility damage consulting with phased repair recommendations.",
    status: "active",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/008",
    start_date: "2026-02-28",
  },
  "0009-2026": {
    project_id: "0009-2026",
    name: "Oakmont Towers Cost Segregation",
    client_name: "Oakmont Investors LLC",
    client_type: "defense",
    client_address: "700 Broadway, Nashville, TN 37203",
    point_of_contact: "Chris Nolan",
    representing: "Oakmont Investors LLC",
    engagement_type: "pca_cost_segregation",
    engagement_types: ["pca_cost_segregation"],
    property_address: "1010 Oakmont Dr, Nashville, TN 37215",
    lead_consultant: "Sarah Chen",
    opposing_parties: [],
    represented_by: "",
    case_number: "",
    date_of_loss: "",
    report_due_date: "2026-03-01",
    policy_number: "",
    cause_number: "",
    claim_number: "",
    narrative:
      "Cost segregation study completed and archived after final client delivery.",
    status: "closed",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/009",
    start_date: "2025-12-15",
  },
};

const teamMembers = [
  { value: "Tim Reynolds", initials: "TR" },
  { value: "John Harrison", initials: "JH" },
  { value: "Sarah Chen", initials: "SC" },
  { value: "Michael Torres", initials: "MT" },
  { value: "Emily Walsh", initials: "EW" },
  { value: "Robert Kim", initials: "RK" },
];

function parseDateForDisplay(value: string) {
  // Prevent off-by-one rendering for date-only values (YYYY-MM-DD).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
}

function formatDateForDisplay(
  value: string,
  options: Intl.DateTimeFormatOptions
) {
  return parseDateForDisplay(value).toLocaleDateString("en-US", options);
}

const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// --- Components ---

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}</span>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggleChecklist,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
}: {
  task: MockTask;
  onToggleChecklist: (taskId: string, itemIndex: number) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assignee: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasChecklist = task.checklist_items.length > 0;
  const completedCount = task.checklist_items.filter((c) => c.completed).length;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card",
        isTaskPastDue(task.due_date, task.status) && "border-2 border-red-600"
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left cursor-pointer hover:bg-muted/50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                task.status === "completed"
                  ? "text-muted-foreground line-through"
                  : ""
              }`}
            >
              {task.name}
            </span>
            {hasChecklist && (
              <span className="text-xs text-muted-foreground">
                {completedCount}/{task.checklist_items.length}
              </span>
            )}
          </div>
          {task.description && (
            <p className="text-xs text-muted-foreground">{task.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {task.assigned_to && task.initials && (
            <Avatar size="sm">
              <AvatarFallback className="text-[10px]">
                {task.initials}
              </AvatarFallback>
            </Avatar>
          )}
          {task.due_date && (
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {formatDateForDisplay(task.due_date, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          <Badge
            className={`${TASK_STATUS_COLORS[task.status]} text-[10px] px-1.5 py-0`}
            variant="outline"
          >
            {TASK_STATUS_LABELS[task.status]}
          </Badge>
        </div>
      </button>

      {expanded && (
        <div className="border-t px-3 py-3 pl-9 space-y-3">
          {/* Editable fields row */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </span>
              <Select
                value={task.status}
                onValueChange={(v) =>
                  onStatusChange(task.id, (v ?? task.status) as TaskStatus)
                }
              >
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue>{TASK_STATUS_LABELS[task.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TASK_STATUS_LABELS) as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Assigned To
              </span>
              <Select
                value={task.assigned_to ?? "__unassigned__"}
                onValueChange={(v) =>
                  onAssigneeChange(
                    task.id,
                    v === "__unassigned__" ? null : (v ?? null)
                  )
                }
              >
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__unassigned__">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Due Date
              </span>
              <Input
                type="date"
                className="h-8 w-36 text-xs"
                value={task.due_date ?? ""}
                onChange={(e) =>
                  onDueDateChange(task.id, e.target.value || null)
                }
              />
            </div>
            {task.completed_date && (
              <div className="space-y-1">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Completed
                </span>
                <div className="flex h-8 items-center rounded-md border bg-muted/50 px-2.5 text-xs text-muted-foreground">
                  {formatDateForDisplay(task.completed_date, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Checklist items */}
          {hasChecklist && (
            <div className="space-y-1.5">
              {task.checklist_items.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => onToggleChecklist(task.id, idx)}
                  />
                  <span
                    className={
                      item.completed
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BucketSection({
  bucket,
  tasks,
  onToggleChecklist,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
}: {
  bucket: TaskBucket;
  tasks: MockTask[];
  onToggleChecklist: (taskId: string, itemIndex: number) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onAssigneeChange: (taskId: string, assignee: string | null) => void;
  onDueDateChange: (taskId: string, dueDate: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const hasOverdueInBucket = tasks.some((t) =>
    isTaskPastDue(t.due_date, t.status)
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className={`flex w-full items-center gap-2 rounded-t-lg border-t-3 px-3 py-2 ${TASK_BUCKET_COLORS[bucket]} bg-muted/50 hover:bg-muted/80`}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-semibold">
          {TASK_BUCKET_LABELS[bucket]}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          {hasOverdueInBucket && (
            <span
              className="inline-flex shrink-0"
              title="Overdue tasks in this bucket"
            >
              <AlertTriangle
                className="h-3.5 w-3.5 text-amber-600 dark:text-amber-500"
                aria-hidden
              />
              <span className="sr-only">Overdue tasks in this bucket</span>
            </span>
          )}
          <span>
            {completedTasks}/{tasks.length} done
          </span>
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-1.5 py-2">
          {tasks
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggleChecklist={onToggleChecklist}
                onStatusChange={onStatusChange}
                onAssigneeChange={onAssigneeChange}
                onDueDateChange={onDueDateChange}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export default function ProjectDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const projectId =
    typeof params?.id === "string" ? params.id : "0001-2026";

  const baseProject = useMemo(
    () => mockProjects[projectId] ?? mockProjects["0001-2026"]!,
    [projectId]
  );

  const [project, setProject] = useState<MockProjectDetail>(() => baseProject);

  useLayoutEffect(() => {
    setProject(mergeProjectDetailFields(baseProject, projectId));
  }, [baseProject, projectId]);

  useEffect(() => {
    const onOverrides = () => {
      setProject(mergeProjectDetailFields(baseProject, projectId));
    };
    window.addEventListener(PROJECT_DETAIL_OVERRIDES_EVENT, onOverrides);
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROJECT_DETAIL_OVERRIDES_STORAGE_KEY) onOverrides();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PROJECT_DETAIL_OVERRIDES_EVENT, onOverrides);
      window.removeEventListener("storage", onStorage);
    };
  }, [baseProject, projectId]);

  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    () => baseProject.status
  );

  const persistProjectStatus = useCallback(
    (next: ProjectStatus) => {
      setProjectStatus(next);
      setStoredProjectStatus(projectId, next);
    },
    [projectId]
  );

  const templateGroup = getEngagementTemplateGroup(baseProject.engagement_type);

  // Must not read localStorage in this initializer: server has no storage ([]) but the client does,
  // which caused hydration mismatches on task counts (e.g. completedTasks/totalTasks).
  const [tasks, setTasks] = useState<MockTask[]>(() =>
    templateGroup === "appraisal" ? generateAppraisalTasks() : generateGeneralTasks()
  );

  const reloadTasksFromStorage = useCallback(() => {
    const storedProjectTasks = getSyncedTasks().filter(
      (task) => task.project_id === projectId
    );
    if (storedProjectTasks.length === 0) {
      setTasks(getEffectiveTemplateTasks(templateGroup));
      return;
    }
    setTasks(
      storedProjectTasks.map((task) => ({
        id: task.id,
        bucket: task.bucket,
        name: task.name,
        description: task.description,
        status: task.status,
        assigned_to: task.assigned_to,
        initials: task.initials,
        due_date: task.due_date,
        completed_date: task.completed_date,
        checklist_items: task.checklist_items,
        sort_order: task.sort_order,
      }))
    );
  }, [projectId, templateGroup]);

  useLayoutEffect(() => {
    const stored = getStoredProjectStatus(projectId);
    if (stored) setProjectStatus(stored);
  }, [projectId]);

  useLayoutEffect(() => {
    if (!pathname.startsWith(`/projects/${projectId}`)) return;
    if (pathname.includes("/edit")) return;
    reloadTasksFromStorage();
  }, [projectId, pathname, reloadTasksFromStorage]);

  useEffect(() => {
    const onStorage = () => reloadTasksFromStorage();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reloadTasksFromStorage]);

  useEffect(() => {
    const onSync = () => reloadTasksFromStorage();
    window.addEventListener(TASK_SYNC_STORAGE_EVENT, onSync);
    return () => window.removeEventListener(TASK_SYNC_STORAGE_EVENT, onSync);
  }, [reloadTasksFromStorage]);

  /** Auto-advance to Active when EA / retainer / auth gate tasks are completed. */
  useEffect(() => {
    if (projectStatus !== "pending_ea_retainer_auth") return;
    if (isEaRetainerAuthGateSatisfied(baseProject.engagement_type, tasks)) {
      persistProjectStatus("active");
    }
  }, [projectStatus, tasks, baseProject.engagement_type, persistProjectStatus]);

  useEffect(() => {
    const onTemplateSaved = () => reloadTasksFromStorage();
    window.addEventListener(TASK_TEMPLATE_OVERRIDES_EVENT, onTemplateSaved);
    return () => window.removeEventListener(TASK_TEMPLATE_OVERRIDES_EVENT, onTemplateSaved);
  }, [reloadTasksFromStorage]);

  useEffect(() => {
    const syncedTasks: SyncedTask[] = tasks.map((task) => ({
      id: task.id,
      project_id: projectId,
      engagement_type: baseProject.engagement_type,
      bucket: task.bucket,
      name: task.name,
      description: task.description,
      status: task.status,
      assigned_to: task.assigned_to,
      initials: task.initials,
      due_date: task.due_date,
      completed_date: task.completed_date,
      checklist_items: task.checklist_items,
      sort_order: task.sort_order,
    }));
    upsertProjectTasks(projectId, syncedTasks);
  }, [tasks, projectId, baseProject.engagement_type]);

  const tasksByBucket = useMemo(() => {
    const grouped: Record<TaskBucket, MockTask[]> = {
      project_intake: [],
      execution: [],
      milestones: [],
      closeout: [],
    };
    tasks.forEach((t) => grouped[t.bucket].push(t));
    return grouped;
  }, [tasks]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  async function persistTaskUpdate(task: MockTask) {
    if (!isSupabaseConfigured || !UUID_REGEX.test(task.id)) {
      return;
    }

    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        status: task.status,
        due_date: task.due_date,
        completed_date: task.completed_date,
        checklist_items: task.checklist_items,
      }),
    });
  }

  function handleToggleChecklist(taskId: string, itemIndex: number) {
    let updatedTask: MockTask | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newItems = [...t.checklist_items];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          completed: !newItems[itemIndex].completed,
        };
        updatedTask = { ...t, checklist_items: newItems };
        return updatedTask;
      })
    );
    if (updatedTask) void persistTaskUpdate(updatedTask);
  }

  function handleStatusChange(taskId: string, status: TaskStatus) {
    let updatedTask: MockTask | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        updatedTask = {
          ...t,
          status,
          completed_date:
            status === "completed"
              ? new Date().toISOString().split("T")[0]
              : null,
        };
        return updatedTask;
      })
    );
    if (updatedTask) void persistTaskUpdate(updatedTask);
  }

  function handleAssigneeChange(taskId: string, assignee: string | null) {
    let updatedTask: MockTask | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const member = teamMembers.find((m) => m.value === assignee);
        updatedTask = {
          ...t,
          assigned_to: assignee,
          initials: member?.initials ?? null,
        };
        return updatedTask;
      })
    );
    if (updatedTask) void persistTaskUpdate(updatedTask);
  }

  function handleDueDateChange(taskId: string, dueDate: string | null) {
    let updatedTask: MockTask | null = null;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        updatedTask = { ...t, due_date: dueDate };
        return updatedTask;
      })
    );
    if (updatedTask) void persistTaskUpdate(updatedTask);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/projects/${projectId}/edit`} />}
          nativeButton={false}
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit Project
        </Button>
      </div>

      {/* Title bar */}
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
              {project.name}
            </h1>
            <Badge
              className={PROJECT_STATUS_COLORS[projectStatus]}
              variant="outline"
            >
              {PROJECT_STATUS_LABELS[projectStatus]}
            </Badge>
          </div>
          <p className="font-mono text-sm text-muted-foreground">
            {project.project_id}
          </p>
        </div>
      </div>

      {/* Conflict Check Notification */}
      {projectStatus === "conflict_review" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                Conflict Check
              </CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  persistProjectStatus(
                    templateGroup === "appraisal" ? "active" : "pending_ea_retainer_auth"
                  )
                }
              >
                Clear Conflict(s)
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-amber-900">
            <p className="font-medium">Status: Conflict Review</p>
            <p>
              {project.conflict_example_details ??
                "Possible conflict identified. Review required by Admin/PIC before approval."}
            </p>
          </CardContent>
        </Card>
      )}

      {projectStatus === "pending_ea_retainer_auth" && (
        <Card className="border-indigo-200 bg-indigo-50/70 dark:border-indigo-800 dark:bg-indigo-950/35">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-indigo-900 dark:text-indigo-100">
              <FileText className="h-4 w-4" />
              Pending EA / Retainer / Authorization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-indigo-950 dark:text-indigo-100">
            <p>
              Complete the required intake tasks for this engagement.               The project moves to{" "}
              <strong>Active</strong> automatically when the gate is satisfied.
            </p>
            <ul className="list-inside list-disc space-y-1">
              {templateGroup === "appraisal" ? (
                <li>
                  Appraisals do not require authorization to activate; once conflicts are cleared,
                  they move directly to <strong>Active</strong>.
                </li>
              ) : (
                <>
                  <li>
                    Mark <strong>{EA_GATE_TASKS_GENERAL[0]}</strong> as completed
                  </li>
                  <li>
                    Mark <strong>{EA_GATE_TASKS_GENERAL[1]}</strong> as completed (both required)
                  </li>
                </>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Side-by-side: Project Info (left) + Details (right) */}
      <div className="flex flex-col gap-5 lg:flex-row">
        {/* LEFT â€” Client Information + Other Parties */}
        <div className="w-full shrink-0 space-y-4 lg:w-[380px]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <InfoRow
                icon={User}
                label="Client Name"
                value={project.client_name}
              />
              <InfoRow
                icon={User}
                label="Side"
                value={CLIENT_TYPE_LABELS[project.client_type]}
              />
              <InfoRow
                icon={MapPin}
                label="Client Address"
                value={project.client_address}
              />
              <InfoRow
                icon={User}
                label="Point of Contact"
                value={project.point_of_contact}
              />
              {project.point_of_contact_secondary?.trim() ? (
                <InfoRow
                  icon={User}
                  label="2nd Point of Contact"
                  value={project.point_of_contact_secondary.trim()}
                />
              ) : null}
              {project.representing && (
                <InfoRow
                  icon={Building2}
                  label="Representing"
                  value={project.representing}
                />
              )}
              {project.start_date && (
                <InfoRow
                  icon={Calendar}
                  label="Input Date"
                  value={formatDateForDisplay(project.start_date, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                />
              )}
              {project.sharepoint_folder_url && (
                <>
                  <Separator />
                  <a
                    href={project.sharepoint_folder_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-[#0d9488] hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open SharePoint Folder
                  </a>
                </>
              )}
            </CardContent>
          </Card>

          {/* Other Parties */}
          {(project.opposing_parties.length > 0 ||
            (project.other_parties?.length ?? 0) > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Other Parties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.opposing_parties.length > 0 && (
                  <div className="space-y-2">
                    {project.opposing_parties.map((party) => (
                      <div
                        key={party}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="font-medium leading-tight">
                          {party}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          Opposed
                        </span>
                      </div>
                    ))}
                    {project.represented_by && (
                      <div className="pt-1 text-sm">
                        <span className="text-muted-foreground">
                          Represented by:{" "}
                        </span>
                        <span className="font-medium">
                          {project.represented_by}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {(project.other_parties?.length ?? 0) > 0 && (
                  <div
                    className={cn(
                      "pt-1 space-y-2",
                      project.opposing_parties.length > 0 &&
                        "mt-2 border-t border-border pt-3"
                    )}
                  >
                    {project.other_parties!.map((p, idx) => (
                      <div
                        key={`${p.name}-${idx}`}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <span className="font-medium leading-tight">
                          {p.name}
                        </span>
                        <span className="shrink-0 text-right text-muted-foreground">
                          {OTHER_PARTY_ROLE_LABELS[p.role]} -{" "}
                          {OTHER_PARTY_STANDING_LABELS[p.standing]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT â€” Project Details, Narrative, Notes */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Project Details */}
          {(project.engagement_types.length > 0 ||
            project.property_address ||
            project.lead_consultant ||
            project.report_due_date ||
            project.date_of_loss ||
            project.peril ||
            project.structure_type ||
            project.policy_number ||
            project.cause_number ||
            project.claim_number) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Engagement Type: </span>
                  <span className="font-medium">
                    {project.engagement_types
                      .map((t) => ENGAGEMENT_TYPE_LABELS[t])
                      .join(", ")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Property Address: </span>
                  <span className="font-medium">{project.property_address}</span>
                </div>
                {project.lead_consultant && (
                  <div>
                    <span className="text-muted-foreground">
                      Professional in Charge:{" "}
                    </span>
                    <span className="font-medium">{project.lead_consultant}</span>
                  </div>
                )}
                {project.report_due_date && (
                  <div>
                    <span className="text-muted-foreground">
                      Report Due Date:{" "}
                    </span>
                    <span className="font-medium">
                      {formatDateForDisplay(project.report_due_date, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {project.date_of_loss && (
                  <div>
                    <span className="text-muted-foreground">
                      Date of Loss:{" "}
                    </span>
                    <span className="font-medium">
                      {formatDateForDisplay(project.date_of_loss, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {project.peril && (
                  <div>
                    <span className="text-muted-foreground">Peril: </span>
                    <span className="font-medium">
                      {PERIL_LABELS[project.peril]}
                    </span>
                  </div>
                )}
                {project.structure_type && (
                  <div>
                    <span className="text-muted-foreground">
                      Structure Type:{" "}
                    </span>
                    <span className="font-medium">
                      {STRUCTURE_TYPE_LABELS[project.structure_type]}
                    </span>
                  </div>
                )}
                {project.policy_number && (
                  <div>
                    <span className="text-muted-foreground">Policy #: </span>
                    <span className="font-mono font-medium">
                      {project.policy_number}
                    </span>
                  </div>
                )}
                {project.cause_number && (
                  <div>
                    <span className="text-muted-foreground">
                      Cause Number:{" "}
                    </span>
                    <span className="font-mono font-medium">
                      {project.cause_number}
                    </span>
                  </div>
                )}
                {project.claim_number && (
                  <div>
                    <span className="text-muted-foreground">Claim #: </span>
                    <span className="font-mono font-medium">
                      {project.claim_number}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Narrative */}
          {project.narrative && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Narrative</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{project.narrative}</p>
              </CardContent>
            </Card>
          )}

          {project.notes?.trim() ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {formatNotesForDisplay(project.notes)}
                </p>
              </CardContent>
            </Card>
          ) : null}

        </div>
      </div>

      {/* Tasks Panel â€” Full Width Below */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Tasks
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({completedTasks}/{totalTasks})
              </span>
            </CardTitle>
            <span className="text-sm font-semibold text-[#0d9488]">
              {progressPercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#0d9488] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {TASK_BUCKET_ORDER.map((bucket) => {
            const bucketTasks = tasksByBucket[bucket];
            if (bucketTasks.length === 0) return null;
            return (
              <BucketSection
                    key={bucket}
                    bucket={bucket}
                    tasks={bucketTasks}
                    onToggleChecklist={handleToggleChecklist}
                    onStatusChange={handleStatusChange}
                    onAssigneeChange={handleAssigneeChange}
                    onDueDateChange={handleDueDateChange}
                  />
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

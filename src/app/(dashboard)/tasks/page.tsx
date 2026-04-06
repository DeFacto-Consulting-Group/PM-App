"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  User,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type {
  TaskStatus,
  TaskBucket,
  EngagementType,
  ChecklistItem,
} from "@/types/index";
import {
  TASK_STATUS_LABELS,
  TASK_BUCKET_LABELS,
  ENGAGEMENT_TYPE_LABELS,
  TASK_BUCKET_ORDER,
} from "@/types/index";
import {
  getSyncedTasks,
  upsertProjectTasks,
  TASK_SYNC_STORAGE_EVENT,
  type SyncedTask,
} from "@/lib/task-sync";
import { getInitialSyncedTasksForProject } from "@/lib/project-task-templates";
import { applyKanbanTaskToSyncedStorage } from "@/lib/kanban-task-storage";
import {
  type KanbanTask,
  projectDisplayName,
  toKanbanTask,
  hydrateTaskForEdit,
} from "@/lib/kanban-task";
import { TaskEditDialog } from "@/components/tasks/task-edit-dialog";
import { isTaskPastDue } from "@/lib/task-due";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

function engagementTypeForProject(
  projectId: string,
  tasks: KanbanTask[]
): EngagementType {
  const t = tasks.find((x) => x.project_id === projectId);
  return (t?.engagement_type as EngagementType) ?? "appraisal";
}

function newDashboardTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task-${Date.now()}`;
}

const mockTasksRaw: Omit<KanbanTask, "project_name" | "checklist_items">[] = [
  // 0001-2026 (Appraisal - Active) — some tasks in progress
  { id: "t1", name: "Download Provided Docs", project_id: "0001-2026", bucket: "project_intake", assignee: "John Harrison", initials: "JH", due_date: "2026-02-18", status: "in_progress", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t2", name: "Authorization Received", project_id: "0001-2026", bucket: "project_intake", assignee: "John Harrison", initials: "JH", due_date: "2026-02-20", status: "in_progress", engagement_type: "appraisal", checklist_total: 2, checklist_done: 1 },
  { id: "t3", name: "Sort/Date Docs", project_id: "0001-2026", bucket: "execution", assignee: "Sarah Chen", initials: "SC", due_date: "2026-02-22", status: "in_progress", engagement_type: "appraisal", checklist_total: 3, checklist_done: 1 },
  { id: "t4", name: "Project Kickoff Meeting", project_id: "0001-2026", bucket: "execution", assignee: "John Harrison", initials: "JH", due_date: "2026-02-20", status: "not_started", engagement_type: "appraisal", checklist_total: 6, checklist_done: 0 },
  { id: "t5", name: "Draft Project Milestones", project_id: "0001-2026", bucket: "execution", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t6", name: "Appraisal Tasks", project_id: "0001-2026", bucket: "execution", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "appraisal", checklist_total: 4, checklist_done: 0 },
  { id: "t7", name: "Schedule Site Visit/Logistics", project_id: "0001-2026", bucket: "execution", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "appraisal", checklist_total: 2, checklist_done: 0 },
  { id: "t8", name: "Project Kickoff Scheduled", project_id: "0001-2026", bucket: "milestones", assignee: null, initials: null, due_date: "2026-02-20", status: "not_started", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t9", name: "Site Visit Scheduled", project_id: "0001-2026", bucket: "milestones", assignee: null, initials: null, due_date: "2026-03-01", status: "not_started", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t10", name: "Conflict Check", project_id: "0001-2026", bucket: "project_intake", assignee: "Tim Reynolds", initials: "TR", due_date: "2026-02-15", status: "completed", engagement_type: "appraisal", checklist_total: 3, checklist_done: 3 },
  { id: "t11", name: "Enter into QBO", project_id: "0001-2026", bucket: "project_intake", assignee: "Tim Reynolds", initials: "TR", due_date: "2026-02-15", status: "completed", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t12", name: "Create Channel", project_id: "0001-2026", bucket: "project_intake", assignee: "Tim Reynolds", initials: "TR", due_date: "2026-02-16", status: "completed", engagement_type: "appraisal", checklist_total: 2, checklist_done: 2 },
  { id: "t13", name: "Assign PIC", project_id: "0001-2026", bucket: "execution", assignee: "Tim Reynolds", initials: "TR", due_date: "2026-02-17", status: "completed", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },
  { id: "t14", name: "Assign Team Lead", project_id: "0001-2026", bucket: "execution", assignee: "Tim Reynolds", initials: "TR", due_date: "2026-02-17", status: "completed", engagement_type: "appraisal", checklist_total: 0, checklist_done: 0 },

  // 0002-2026 (Litigation Support - Pending Conflict)
  { id: "t15", name: "Conflict Check", project_id: "0002-2026", bucket: "project_intake", assignee: "Sarah Chen", initials: "SC", due_date: "2026-03-02", status: "in_progress", engagement_type: "litigation_support", checklist_total: 3, checklist_done: 1 },
  { id: "t16", name: "Create Project in QBO", project_id: "0002-2026", bucket: "project_intake", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "litigation_support", checklist_total: 0, checklist_done: 0 },
  { id: "t17", name: "Engagement Agreement", project_id: "0002-2026", bucket: "project_intake", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "litigation_support", checklist_total: 3, checklist_done: 0 },

  // 0003-2026 (Cost Estimating - Report Issued)
  { id: "t18", name: "QA/QC", project_id: "0003-2026", bucket: "execution", assignee: "Michael Torres", initials: "MT", due_date: "2026-03-08", status: "completed", engagement_type: "cost_estimating", checklist_total: 1, checklist_done: 1 },
  { id: "t19", name: "Issue Report/Estimate", project_id: "0003-2026", bucket: "execution", assignee: "Michael Torres", initials: "MT", due_date: "2026-03-10", status: "completed", engagement_type: "cost_estimating", checklist_total: 0, checklist_done: 0 },
  { id: "t20", name: "Report Followup", project_id: "0003-2026", bucket: "execution", assignee: "Michael Torres", initials: "MT", due_date: "2026-03-12", status: "in_progress", engagement_type: "cost_estimating", checklist_total: 1, checklist_done: 0 },
  { id: "t21", name: "Final Billing", project_id: "0003-2026", bucket: "closeout", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "cost_estimating", checklist_total: 0, checklist_done: 0 },

  // 0004-2026 (PCA - Approved)
  { id: "t22", name: "Compose report", project_id: "0004-2026", bucket: "execution", assignee: "Emily Walsh", initials: "EW", due_date: "2026-03-20", status: "in_progress", engagement_type: "pca_cost_segregation", checklist_total: 4, checklist_done: 2 },
  { id: "t23", name: "Compose Estimate(s)", project_id: "0004-2026", bucket: "execution", assignee: "Emily Walsh", initials: "EW", due_date: "2026-03-22", status: "not_started", engagement_type: "pca_cost_segregation", checklist_total: 5, checklist_done: 0 },
  { id: "t24", name: "Work Product Completed for QA/QC", project_id: "0004-2026", bucket: "milestones", assignee: null, initials: null, due_date: "2026-03-25", status: "not_started", engagement_type: "pca_cost_segregation", checklist_total: 0, checklist_done: 0 },

  // 0005-2026 (ADR - Billing)
  { id: "t25", name: "Final Billing", project_id: "0005-2026", bucket: "closeout", assignee: "Robert Kim", initials: "RK", due_date: "2026-03-15", status: "in_progress", engagement_type: "adr_umpire", checklist_total: 0, checklist_done: 0 },
  { id: "t26", name: "Project Post-mortem", project_id: "0005-2026", bucket: "closeout", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "adr_umpire", checklist_total: 0, checklist_done: 0 },
  { id: "t27", name: "Closeout", project_id: "0005-2026", bucket: "closeout", assignee: null, initials: null, due_date: null, status: "not_started", engagement_type: "adr_umpire", checklist_total: 5, checklist_done: 0 },
];

const mockTasks: KanbanTask[] = mockTasksRaw.map((t) => ({
  ...t,
  project_name: projectDisplayName(t.project_id),
  checklist_items: [] as ChecklistItem[],
}));

const columns: TaskStatus[] = [
  "not_started",
  "in_progress",
  "internal_review",
  "waiting",
  "completed",
];

const columnHeaderColors: Record<TaskStatus, string> = {
  not_started: "border-t-gray-400",
  in_progress: "border-t-blue-500",
  internal_review: "border-t-purple-500",
  waiting: "border-t-amber-500",
  completed: "border-t-green-500",
};

const ALL_PROJECTS = "All Projects";
const ALL_TYPES = "All Types";
const ALL_PHASES = "All Phases";
const isSupabaseConfigured =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http") ?? false;

const teamMembers = [
  { value: "Tim Reynolds", initials: "TR" },
  { value: "John Harrison", initials: "JH" },
  { value: "Sarah Chen", initials: "SC" },
  { value: "Michael Torres", initials: "MT" },
  { value: "Emily Walsh", initials: "EW" },
  { value: "Robert Kim", initials: "RK" },
];

const UUID_REGEX = /^[0-9a-fA-F-]{36}$/;

function taskDragId(task: Pick<KanbanTask, "project_id" | "id">): string {
  return `${task.project_id}::${task.id}`;
}

function reorderList<T>(list: T[], startIndex: number, endIndex: number): T[] {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
}

function filterVisibleTasks(
  tasks: KanbanTask[],
  search: string,
  projectFilter: string,
  typeFilter: string,
  bucketFilter: string,
  myTasksOnly: boolean,
  currentUser: string
): KanbanTask[] {
  return tasks.filter((t) => {
    const matchesSearch =
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.project_id.toLowerCase().includes(search.toLowerCase()) ||
      t.project_name.toLowerCase().includes(search.toLowerCase());
    const matchesProject =
      projectFilter === ALL_PROJECTS || t.project_id === projectFilter;
    const matchesType =
      typeFilter === ALL_TYPES || t.engagement_type === typeFilter;
    const matchesBucket =
      bucketFilter === ALL_PHASES || t.bucket === bucketFilter;
    const matchesMy = !myTasksOnly || t.assignee === currentUser;
    return (
      matchesSearch &&
      matchesProject &&
      matchesType &&
      matchesBucket &&
      matchesMy
    );
  });
}

/** Replace visible tasks in a column with a new order (rest of list unchanged). */
function mergeColumnReorder(
  tasksData: KanbanTask[],
  columnTasks: KanbanTask[],
  reordered: KanbanTask[]
): KanbanTask[] {
  if (columnTasks.length === 0 && reordered.length > 0) {
    return [...tasksData, ...reordered];
  }
  const visibleIds = new Set(columnTasks.map((t) => taskDragId(t)));
  const result: KanbanTask[] = [];
  let inserted = false;
  for (const t of tasksData) {
    const id = taskDragId(t);
    if (visibleIds.has(id)) {
      if (!inserted) {
        result.push(...reordered);
        inserted = true;
      }
      continue;
    }
    result.push(t);
  }
  return result;
}

function persistKanbanTaskStatus(task: KanbanTask) {
  applyKanbanTaskToSyncedStorage({
    id: task.id,
    project_id: task.project_id,
    name: task.name,
    status: task.status,
    engagement_type: task.engagement_type,
    assignee: task.assignee,
    initials: task.initials,
    due_date: task.due_date,
    bucket: task.bucket,
  });

  if (isSupabaseConfigured && UUID_REGEX.test(task.id)) {
    void fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: task.id,
        status: task.status,
        assigned_to: task.assignee_id ?? null,
        due_date: task.due_date,
        completed_date:
          task.status === "completed"
            ? task.due_date ?? new Date().toISOString().split("T")[0]
            : null,
      }),
    });
  }
}

function mergeTasksWithSynced(
  fallbackTasks: KanbanTask[],
  syncedTasks: SyncedTask[]
) {
  if (syncedTasks.length === 0) return fallbackTasks;
  const projectsWithSyncedTasks = new Set(syncedTasks.map((task) => task.project_id));
  const preservedFallback = fallbackTasks.filter(
    (task) => !projectsWithSyncedTasks.has(task.project_id)
  );
  return [...preservedFallback, ...syncedTasks.map(toKanbanTask)];
}

function TasksPageContent() {
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState(ALL_PROJECTS);
  const [typeFilter, setTypeFilter] = useState(ALL_TYPES);
  const [bucketFilter, setBucketFilter] = useState(ALL_PHASES);
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [tasksData, setTasksData] = useState<KanbanTask[]>(mockTasks);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProjectId, setNewTaskProjectId] = useState("");
  const [newTaskBucket, setNewTaskBucket] = useState<TaskBucket>("project_intake");
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>("not_started");
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>("__unassigned__");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [addSubtasksEnabled, setAddSubtasksEnabled] = useState(false);
  const [subtasksText, setSubtasksText] = useState("");
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [projectComboboxOpen, setProjectComboboxOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const currentUser = "John Harrison";
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openedTaskFromQueryRef = useRef<string | null>(null);

  useEffect(() => {
    const syncFromStorage = () => {
      const syncedTasks = getSyncedTasks();
      setTasksData(mergeTasksWithSynced(mockTasks, syncedTasks));
    };

    syncFromStorage();

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(TASK_SYNC_STORAGE_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(TASK_SYNC_STORAGE_EVENT, syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/tasks") return;
    setTasksData(mergeTasksWithSynced(mockTasks, getSyncedTasks()));
  }, [pathname]);

  /** Deep-link from dashboard overdue widget: /tasks?project=…&task=… → edit modal */
  useEffect(() => {
    const projectId = searchParams.get("project");
    const taskId = searchParams.get("task");
    if (!projectId || !taskId) {
      openedTaskFromQueryRef.current = null;
      return;
    }
    const queryKey = `${projectId}::${taskId}`;
    if (openedTaskFromQueryRef.current === queryKey) return;

    const match = tasksData.find(
      (t) => t.project_id === projectId && t.id === taskId
    );
    if (!match) return;

    openedTaskFromQueryRef.current = queryKey;
    setEditingTask(hydrateTaskForEdit(match));
    router.replace("/tasks", { scroll: false });
  }, [tasksData, searchParams, router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetch("/api/tasks")
      .then(async (res) => {
        const result = (await res.json().catch(() => ({}))) as {
          tasks?: Array<{
            id: string;
            name: string;
            project_id: string;
            project_name: string;
            engagement_type: string;
            bucket: TaskBucket;
            assignee_name: string | null;
            assigned_to: string | null;
            initials: string | null;
            due_date: string | null;
            status: TaskStatus;
            checklist_items: { name: string; completed: boolean }[];
          }>;
        };
        if (!res.ok || !result.tasks) return;
        setTasksData(
          result.tasks.map((t) => ({
            id: t.id,
            name: t.name,
            project_id: t.project_id,
            project_name: projectDisplayName(t.project_id, t.project_name),
            engagement_type: t.engagement_type,
            bucket: t.bucket,
            assignee: t.assignee_name,
            assignee_id: t.assigned_to,
            initials: t.initials,
            due_date: t.due_date,
            status: t.status,
            checklist_items: (t.checklist_items ?? []).map((c) => ({ ...c })),
            checklist_total: t.checklist_items.length,
            checklist_done: t.checklist_items.filter((item) => item.completed)
              .length,
          }))
        );
      })
      .catch(() => {
        // Keep local fallback data when API is unavailable.
      });
  }, []);

  const filteredTasks = useMemo(
    () =>
      filterVisibleTasks(
        tasksData,
        search,
        projectFilter,
        typeFilter,
        bucketFilter,
        myTasksOnly,
        currentUser
      ),
    [
      search,
      projectFilter,
      typeFilter,
      bucketFilter,
      myTasksOnly,
      tasksData,
      currentUser,
    ]
  );

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceStatus = source.droppableId as TaskStatus;
    const destStatus = destination.droppableId as TaskStatus;

    let taskToPersist: KanbanTask | null = null;

    setTasksData((prev) => {
      const task = prev.find((t) => taskDragId(t) === draggableId);
      if (!task) return prev;

      const visible = filterVisibleTasks(
        prev,
        search,
        projectFilter,
        typeFilter,
        bucketFilter,
        myTasksOnly,
        currentUser
      );

      if (sourceStatus === destStatus) {
        const columnTasks = visible.filter((t) => t.status === sourceStatus);
        const reordered = reorderList(
          columnTasks,
          source.index,
          destination.index
        );
        return mergeColumnReorder(prev, columnTasks, reordered);
      }

      const updated: KanbanTask = { ...task, status: destStatus };
      const without = prev.filter((t) => taskDragId(t) !== draggableId);
      const visibleWithout = filterVisibleTasks(
        without,
        search,
        projectFilter,
        typeFilter,
        bucketFilter,
        myTasksOnly,
        currentUser
      );
      const destColumnTasks = visibleWithout.filter((t) => t.status === destStatus);
      const newDestColumn = [...destColumnTasks];
      newDestColumn.splice(destination.index, 0, updated);
      taskToPersist = updated;
      return mergeColumnReorder(without, destColumnTasks, newDestColumn);
    });

    if (taskToPersist) {
      persistKanbanTaskStatus(taskToPersist);
      setTasksData(mergeTasksWithSynced(mockTasks, getSyncedTasks()));
    }
  };

  const projects = [...new Set(tasksData.map((t) => t.project_id))].sort();
  const types = [...new Set(tasksData.map((t) => t.engagement_type))].sort();

  function handleOpenAddTask() {
    setAddTaskError(null);
    setNewTaskTitle("");
    setNewTaskProjectId("");
    setProjectComboboxOpen(false);
    setNewTaskBucket("project_intake");
    setNewTaskStatus("not_started");
    setNewTaskAssignee("__unassigned__");
    setNewTaskDue("");
    setAddSubtasksEnabled(false);
    setSubtasksText("");
    setAddTaskOpen(true);
  }

  async function submitNewTask() {
    const title = newTaskTitle.trim();
    if (!title) {
      setAddTaskError("Task title is required.");
      return;
    }
    if (!newTaskProjectId) {
      setAddTaskError("Choose a project.");
      return;
    }
    setAddTaskError(null);
    setIsAddingTask(true);

    const subtaskLines = addSubtasksEnabled
      ? subtasksText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const assignee =
      newTaskAssignee === "__unassigned__" ? null : newTaskAssignee;
    const initials =
      assignee === null
        ? null
        : (teamMembers.find((m) => m.value === assignee)?.initials ?? null);

    const engagement_type = engagementTypeForProject(
      newTaskProjectId,
      tasksData
    ) as EngagementType;
    const id = newDashboardTaskId();

    let projectSynced = getSyncedTasks().filter(
      (t) => t.project_id === newTaskProjectId
    );
    if (projectSynced.length === 0) {
      projectSynced = getInitialSyncedTasksForProject(
        newTaskProjectId,
        engagement_type
      );
    }

    const bucketMax = Math.max(
      0,
      ...projectSynced
        .filter((t) => t.bucket === newTaskBucket)
        .map((t) => t.sort_order)
    );

    const newSynced: SyncedTask = {
      id,
      project_id: newTaskProjectId,
      engagement_type,
      bucket: newTaskBucket,
      name: title,
      description: null,
      status: newTaskStatus,
      assigned_to: assignee,
      initials,
      due_date: newTaskDue || null,
      completed_date:
        newTaskStatus === "completed"
          ? newTaskDue || new Date().toISOString().split("T")[0]
          : null,
      checklist_items: subtaskLines.map((name) => ({ name, completed: false })),
      sort_order: bucketMax + 1,
    };

    upsertProjectTasks(newTaskProjectId, [...projectSynced, newSynced]);
    setTasksData(mergeTasksWithSynced(mockTasks, getSyncedTasks()));

    if (isSupabaseConfigured) {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: newTaskProjectId,
            bucket: newTaskBucket,
            name: title,
            description: null,
            status: newTaskStatus,
            assigned_to: null,
            due_date: newTaskDue || null,
            completed_date:
              newTaskStatus === "completed"
                ? newTaskDue || new Date().toISOString().split("T")[0]
                : null,
            checklist_items: subtaskLines.map((name) => ({ name, completed: false })),
            sort_order: bucketMax + 1,
          }),
        });
        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          setAddTaskError(body.error ?? "Unable to add task.");
        }
      } catch {
        setAddTaskError("Unable to add task.");
      }
    }

    setIsAddingTask(false);
    setAddTaskOpen(false);
  }

  useEffect(() => {
    const container = boardRef.current;
    if (!container) return;

    const updateScrollControls = () => {
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const hasOverflow = maxScrollLeft > 1;
      setHasHorizontalOverflow(hasOverflow);
      setCanScrollLeft(hasOverflow && container.scrollLeft > 4);
      setCanScrollRight(
        hasOverflow && container.scrollLeft < maxScrollLeft - 4
      );
    };

    updateScrollControls();
    container.addEventListener("scroll", updateScrollControls, { passive: true });
    window.addEventListener("resize", updateScrollControls);
    const ro = new ResizeObserver(() => updateScrollControls());
    ro.observe(container);

    return () => {
      container.removeEventListener("scroll", updateScrollControls);
      window.removeEventListener("resize", updateScrollControls);
      ro.disconnect();
    };
  }, [
    filteredTasks.length,
    tasksData.length,
    search,
    projectFilter,
    typeFilter,
    bucketFilter,
    myTasksOnly,
  ]);

  const scrollBoard = (direction: "left" | "right") => {
    const container = boardRef.current;
    if (!container) return;
    const amount = Math.round(container.clientWidth * 0.8);
    container.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Firm-wide task board across all projects.
          </p>
        </div>
        <Button
          type="button"
          disabled={projects.length === 0}
          onClick={handleOpenAddTask}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={myTasksOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setMyTasksOnly(!myTasksOnly)}
        >
          <User className="mr-1.5 h-4 w-4" />
          My Tasks
        </Button>
        <Select
          value={projectFilter}
          onValueChange={(v) => setProjectFilter(v ?? ALL_PROJECTS)}
        >
          <SelectTrigger className="w-[min(100%,13.5rem)] max-w-[13.5rem]">
            <SelectValue placeholder="Project">
              {projectFilter === ALL_PROJECTS
                ? ALL_PROJECTS
                : `${projectDisplayName(projectFilter)} (${projectFilter})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROJECTS}>{ALL_PROJECTS}</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p} value={p}>
                {`${projectDisplayName(p)} (${p})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v ?? ALL_TYPES)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Engagement Type">
              {typeFilter === ALL_TYPES
                ? ALL_TYPES
                : ENGAGEMENT_TYPE_LABELS[
                    typeFilter as keyof typeof ENGAGEMENT_TYPE_LABELS
                  ] ??
                  typeFilter
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_TYPES}>{ALL_TYPES}</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {ENGAGEMENT_TYPE_LABELS[
                  t as keyof typeof ENGAGEMENT_TYPE_LABELS
                ] ??
                  t
                    .split("_")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={bucketFilter}
          onValueChange={(v) => setBucketFilter(v ?? ALL_PHASES)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Phase">
              {bucketFilter === ALL_PHASES
                ? ALL_PHASES
                : TASK_BUCKET_LABELS[bucketFilter as TaskBucket]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PHASES}>{ALL_PHASES}</SelectItem>
            {(Object.keys(TASK_BUCKET_LABELS) as TaskBucket[]).map((b) => (
              <SelectItem key={b} value={b}>
                {TASK_BUCKET_LABELS[b]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Tasks"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="relative isolate">
        {hasHorizontalOverflow && (
          <>
            <div
              className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f5f3ee] to-transparent transition-opacity ${
                canScrollLeft ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f5f3ee] to-transparent transition-opacity ${
                canScrollRight ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        )}

        {hasHorizontalOverflow && (
          <>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="pointer-events-auto fixed top-1/2 left-4 z-30 hidden h-11 w-11 min-h-11 min-w-11 -translate-y-1/2 border-transparent shadow-md md:left-[calc(16rem+1.5rem)] md:inline-flex lg:left-[calc(16rem+2rem)]"
              disabled={!canScrollLeft}
              onClick={() => scrollBoard("left")}
              aria-label="Scroll tasks left"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="default"
              size="icon"
              className="pointer-events-auto fixed top-1/2 right-4 z-30 hidden h-11 w-11 min-h-11 min-w-11 -translate-y-1/2 border-transparent shadow-md md:inline-flex"
              disabled={!canScrollRight}
              onClick={() => scrollBoard("right")}
              aria-label="Scroll tasks right"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <div ref={boardRef} className="flex gap-4 overflow-x-auto pb-4 scroll-smooth">
            {columns.map((colStatus) => {
              const colTasks = filteredTasks.filter(
                (t) => t.status === colStatus
              );
              return (
                <div
                  key={colStatus}
                  className="flex w-72 shrink-0 flex-col overflow-hidden rounded-lg bg-muted/50"
                >
                  <div
                    className={`border-t-3 rounded-t-lg px-3 py-2.5 ${columnHeaderColors[colStatus]}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {TASK_STATUS_LABELS[colStatus]}
                      </span>
                      <Badge
                        variant="secondary"
                        className="h-5 min-w-[1.25rem] justify-center px-1.5 text-xs"
                      >
                        {colTasks.length}
                      </Badge>
                    </div>
                  </div>
                  <Droppable droppableId={colStatus}>
                    {(dropProvided, dropSnapshot) => (
                      <div
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        className={cn(
                          "flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors",
                          dropSnapshot.isDraggingOver && "rounded-md bg-muted/60"
                        )}
                      >
                        {colTasks.map((task, index) => (
                          <Draggable
                            key={taskDragId(task)}
                            draggableId={taskDragId(task)}
                            index={index}
                          >
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                style={{
                                  ...dragProvided.draggableProps.style,
                                  ...(dragSnapshot.isDragging
                                    ? { opacity: 0.9 }
                                    : {}),
                                }}
                                className={cn(
                                  "touch-none rounded-lg border bg-card p-3 shadow-sm transition-shadow",
                                  isTaskPastDue(task.due_date, task.status) &&
                                    "border-2 border-red-600",
                                  dragSnapshot.isDragging
                                    ? cn(
                                        "cursor-grabbing shadow-md ring-2",
                                        isTaskPastDue(task.due_date, task.status)
                                          ? "ring-red-500/45"
                                          : "ring-[#0d9488]/30"
                                      )
                                    : "cursor-grab hover:shadow-md"
                                )}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium leading-snug">
                                    {task.name}
                                  </p>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 py-0"
                                  >
                                    {TASK_BUCKET_LABELS[task.bucket]}
                                  </Badge>
                                </div>
                                <div className="mt-1 text-xs leading-snug">
                                  <span className="line-clamp-2 font-medium text-foreground">
                                    {task.project_name}
                                  </span>{" "}
                                  <Link
                                    href={`/projects/${task.project_id}`}
                                    className="whitespace-nowrap text-[rgb(73,148,208)] hover:text-[rgb(58,127,182)] hover:underline"
                                    onPointerDown={(e) => e.stopPropagation()}
                                  >
                                    {task.project_id}
                                  </Link>
                                </div>
                                {task.checklist_total > 0 && (
                                  <div className="mt-1.5">
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                      <span>
                                        {task.checklist_done}/
                                        {task.checklist_total} checklist
                                      </span>
                                    </div>
                                    <div className="mt-0.5 h-1 rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full bg-[#0d9488] transition-all"
                                        style={{
                                          width: `${(task.checklist_done / task.checklist_total) * 100}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                                <div className="mt-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    {task.initials ? (
                                      <>
                                        <Avatar size="sm">
                                          <AvatarFallback className="text-[10px]">
                                            {task.initials}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs text-muted-foreground">
                                          {task.assignee?.split(" ")[0]}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-xs italic text-muted-foreground">
                                        Unassigned
                                      </span>
                                    )}
                                  </div>
                                  {task.due_date && (
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(task.due_date).toLocaleDateString(
                                        "en-US",
                                        { month: "short", day: "numeric" }
                                      )}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      setEditingTask(hydrateTaskForEdit(task));
                                    }}
                                  >
                                    <Pencil className="mr-1 h-3 w-3" />
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {colTasks.length === 0 && (
                          <div className="py-8 text-center text-xs text-muted-foreground">
                            No tasks
                          </div>
                        )}
                        {dropProvided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>
      {hasHorizontalOverflow && (
        <p className="sm:hidden -mt-3 text-xs text-muted-foreground">
          Swipe horizontally to view more task columns.
        </p>
      )}

      <Dialog
        open={addTaskOpen}
        onOpenChange={(open) => {
          setAddTaskOpen(open);
          if (!open) {
            setAddTaskError(null);
            setProjectComboboxOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>
              Select a <strong className="font-medium text-foreground">project</strong>, then
              choose bucket (phase), task title, status, assignee, and optional due
              date or subtasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {addTaskError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {addTaskError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="add-task-project">
                Project <span className="text-destructive">*</span>
              </Label>
              <Popover
                open={projectComboboxOpen}
                onOpenChange={setProjectComboboxOpen}
              >
                <PopoverTrigger
                  id="add-task-project"
                  type="button"
                  role="combobox"
                  aria-expanded={projectComboboxOpen}
                  aria-haspopup="listbox"
                  data-placeholder={newTaskProjectId ? undefined : ""}
                  className={cn(
                    "flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 pr-2 text-sm transition-colors outline-none select-none",
                    "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "dark:bg-input/30 dark:hover:bg-input/50",
                    !newTaskProjectId && "text-muted-foreground"
                  )}
                >
                  <span className="line-clamp-1 flex-1 truncate text-left">
                    {newTaskProjectId
                      ? `${projectDisplayName(newTaskProjectId)} (${newTaskProjectId})`
                      : "Choose project"}
                  </span>
                  <ChevronDown className="size-4 shrink-0 opacity-50" />
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(100vw-2rem,28rem)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search projects…" />
                    <CommandList>
                      <CommandEmpty>No project found.</CommandEmpty>
                      <CommandGroup>
                        {projects.map((p) => (
                          <CommandItem
                            key={p}
                            value={`${projectDisplayName(p)} ${p}`}
                            onSelect={() => {
                              setNewTaskProjectId(p);
                              setProjectComboboxOpen(false);
                            }}
                          >
                            {projectDisplayName(p)}{" "}
                            <span className="text-muted-foreground">({p})</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-task-bucket">Choose Bucket</Label>
              <Select
                value={newTaskBucket}
                onValueChange={(v) =>
                  setNewTaskBucket((v ?? newTaskBucket) as TaskBucket)
                }
              >
                <SelectTrigger id="add-task-bucket" className="w-full">
                  <SelectValue>{TASK_BUCKET_LABELS[newTaskBucket]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TASK_BUCKET_ORDER.map((b) => (
                    <SelectItem key={b} value={b}>
                      {TASK_BUCKET_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-task-title">
                Task Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="add-task-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g. Review scope draft"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={newTaskStatus}
                onValueChange={(v) =>
                  setNewTaskStatus((v ?? newTaskStatus) as TaskStatus)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{TASK_STATUS_LABELS[newTaskStatus]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {columns.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select
                value={newTaskAssignee}
                onValueChange={(v) => setNewTaskAssignee(v ?? "__unassigned__")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {newTaskAssignee === "__unassigned__"
                      ? "Unassigned"
                      : newTaskAssignee}
                  </SelectValue>
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
            <div className="space-y-1.5">
              <Label htmlFor="add-task-due">Due Date</Label>
              <Input
                id="add-task-due"
                type="date"
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3">
              <Checkbox
                id="add-subtasks"
                checked={addSubtasksEnabled}
                onCheckedChange={(checked) =>
                  setAddSubtasksEnabled(checked === true)
                }
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Label htmlFor="add-subtasks" className="cursor-pointer font-normal">
                  Add subtasks
                </Label>
                {addSubtasksEnabled && (
                  <Textarea
                    placeholder="Enter each subtask on its own line"
                    value={subtasksText}
                    onChange={(e) => setSubtasksText(e.target.value)}
                    rows={4}
                    className="min-h-[120px] resize-y"
                  />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isAddingTask}
              onClick={() => {
                setAddTaskOpen(false);
                setAddTaskError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isAddingTask}
              onClick={submitNewTask}
            >
              {isAddingTask ? "Adding…" : "Add Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskEditDialog
        editingTask={editingTask}
        onEditingTaskChange={setEditingTask}
        onSaveSuccess={() =>
          setTasksData(mergeTasksWithSynced(mockTasks, getSyncedTasks()))
        }
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border bg-white p-8 text-sm text-muted-foreground">
          Loading tasks…
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}

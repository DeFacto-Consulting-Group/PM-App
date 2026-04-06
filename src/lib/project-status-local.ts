import type { ProjectStatus } from "@/types/index";

const KEY = "dfcg-project-status-by-project-v1";

function readMap(): Record<string, ProjectStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ProjectStatus>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getStoredProjectStatus(projectId: string): ProjectStatus | null {
  const raw = readMap()[projectId];
  if (!raw) return null;
  const legacy = raw as string;
  if (legacy === "approved") return "active";
  if (legacy === "billing") return "hold";
  return raw;
}

export function setStoredProjectStatus(projectId: string, status: ProjectStatus): void {
  if (typeof window === "undefined") return;
  const s = status as string;
  const normalized =
    s === "approved" ? "active" : s === "billing" ? "hold" : status;
  const map = readMap();
  map[projectId] = normalized as ProjectStatus;
  localStorage.setItem(KEY, JSON.stringify(map));
}

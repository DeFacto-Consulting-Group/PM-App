"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectStatus } from "@/types/index";
import {
  CLIENT_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "@/types/index";
import { mockProjects } from "@/lib/mock-projects";

const ALL_STATUSES = "All Statuses";
const NO_DUE_DATE_SORT = "Report Due";
/** Sentinel: show projects for all Professional in Charge values */
const ALL_PROFESSIONAL_IN_CHARGE = "All PICs";

function formatCityStateFromAddress(address: string): string {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}, ${parts[parts.length - 1]}`;
  }
  return address;
}

export default function ProjectsClientPage() {
  const searchParams = useSearchParams();
  const initialStatusFromQuery = searchParams.get("status");
  const initialStatusFilter =
    initialStatusFromQuery && initialStatusFromQuery in PROJECT_STATUS_LABELS
      ? initialStatusFromQuery
      : ALL_STATUSES;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [leadFilter, setLeadFilter] = useState<string>(
    ALL_PROFESSIONAL_IN_CHARGE
  );
  const [dueDateSort, setDueDateSort] = useState<string>(NO_DUE_DATE_SORT);

  const leadOptions = useMemo(
    () => Array.from(new Set(mockProjects.map((p) => p.lead_consultant))).sort(),
    []
  );

  const filtered = useMemo(() => {
    const filteredProjects = mockProjects.filter((p) => {
      const matchesSearch =
        search === "" ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.client_name.toLowerCase().includes(search.toLowerCase()) ||
        p.project_id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === ALL_STATUSES || p.status === statusFilter;
      const matchesLead =
        leadFilter === ALL_PROFESSIONAL_IN_CHARGE ||
        p.lead_consultant === leadFilter;
      return matchesSearch && matchesStatus && matchesLead;
    });

    if (dueDateSort === NO_DUE_DATE_SORT) {
      return filteredProjects;
    }

    return [...filteredProjects].sort((a, b) => {
      const aDate = a.report_due_date
        ? new Date(a.report_due_date).getTime()
        : Number.POSITIVE_INFINITY;
      const bDate = b.report_due_date
        ? new Date(b.report_due_date).getTime()
        : Number.POSITIVE_INFINITY;

      if (dueDateSort === "soonest") {
        return aDate - bDate;
      }

      return bDate - aDate;
    });
  }, [search, statusFilter, leadFilter, dueDateSort]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button render={<Link href="/projects/new" />} nativeButton={false}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Project
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search Projects"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v ?? ALL_STATUSES)}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={ALL_STATUSES}>
              {statusFilter === ALL_STATUSES
                ? ALL_STATUSES
                : PROJECT_STATUS_LABELS[statusFilter as ProjectStatus]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUSES}>{ALL_STATUSES}</SelectItem>
            {(
              Object.entries(PROJECT_STATUS_LABELS) as [ProjectStatus, string][]
            ).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={dueDateSort}
          onValueChange={(v) => setDueDateSort(v ?? NO_DUE_DATE_SORT)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={NO_DUE_DATE_SORT}>
              {dueDateSort === "soonest"
                ? "Soonest First"
                : dueDateSort === "latest"
                  ? "Latest First"
                  : NO_DUE_DATE_SORT}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_DUE_DATE_SORT}>{NO_DUE_DATE_SORT}</SelectItem>
            <SelectItem value="soonest">Soonest First</SelectItem>
            <SelectItem value="latest">Latest First</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={leadFilter}
          onValueChange={(v) => setLeadFilter(v ?? ALL_PROFESSIONAL_IN_CHARGE)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={ALL_PROFESSIONAL_IN_CHARGE}>
              {leadFilter}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROFESSIONAL_IN_CHARGE}>
              {ALL_PROFESSIONAL_IN_CHARGE}
            </SelectItem>
            {leadOptions.map((lead) => (
              <SelectItem key={lead} value={lead}>
                {lead}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => (
          <Link key={project.project_id} href={`/projects/${project.project_id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-end justify-between">
                  <span className="font-mono text-xs text-muted-foreground">
                    {project.project_id}
                  </span>
                  <Badge
                    className={PROJECT_STATUS_COLORS[project.status]}
                    variant="outline"
                  >
                    {PROJECT_STATUS_LABELS[project.status]}
                  </Badge>
                </div>
                <CardTitle className="mt-[5px] line-clamp-1">
                  {project.name}
                </CardTitle>
                <div className="text-xs font-medium">
                  {project.client_name}{" "}
                  <span className="text-muted-foreground">
                    ({CLIENT_TYPE_LABELS[project.client_type]})
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Property Address</span>
                  <button
                    type="button"
                    className="font-medium text-[#0d9488] hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(project.property_address)}`,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                  >
                    {formatCityStateFromAddress(project.property_address)}
                  </button>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Report Due Date</span>
                  <span className="font-medium">
                    {project.report_due_date
                      ? new Date(project.report_due_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" }
                        )
                      : "TBD"}
                  </span>
                </div>
              </CardContent>
              {project.sharepoint_folder_url && (
                <CardFooter>
                  <span
                    className="inline-flex items-center gap-1 text-xs text-[#0d9488] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    SharePoint Folder
                  </span>
                </CardFooter>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No projects match your search criteria.
        </div>
      )}
    </div>
  );
}


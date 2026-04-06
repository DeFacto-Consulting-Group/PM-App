"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { ArrowLeft, Plus, X, AlertTriangle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EngagementTypeMultiSelect } from "@/components/engagement-type-multi-select";
import type {
  ClientType,
  OtherParty,
  OtherPartyRole,
  OtherPartyStanding,
  ProjectStatus,
} from "@/types/index";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPE_OPTIONS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  OTHER_PARTY_ROLE_LABELS,
  OTHER_PARTY_ROLE_OPTIONS,
  OTHER_PARTY_STANDING_LABELS,
  OTHER_PARTY_STANDING_OPTIONS,
  PERIL_LABELS,
  PERIL_OPTIONS,
  STRUCTURE_TYPE_LABELS,
  STRUCTURE_TYPE_OPTIONS,
} from "@/types/index";
import {
  applyStoredProjectDetailToEditDefaults,
  saveProjectDetailOverrides,
} from "@/lib/project-detail-overrides";
import { NotesMentionsField } from "@/components/notes-mentions-field";
import { AddressAutocompleteInput } from "@/components/address-autocomplete-input";
import { getAccountNameSuggestions } from "@/lib/account-name-suggestions";
import { AccountNameCombobox } from "@/components/account-name-combobox";
const engagementTypeEnum = z.enum([
  "appraisal",
  "building_consulting",
  "cost_estimating",
  "litigation_support",
  "pca_cost_segregation",
  "adr_umpire",
  "other",
]);

const editProjectSchema = z.object({
  project_id: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Project name is required"),
  client_name: z.string().min(1, "Client name is required"),
  client_type: z.enum(CLIENT_TYPE_OPTIONS),
  client_address: z.string().optional(),
  point_of_contact: z.string().optional(),
  point_of_contact_secondary: z.string().optional(),
  representing: z.string().optional(),
  engagement_types: z
    .array(engagementTypeEnum)
    .min(1, "Select at least one engagement type")
    .refine(
      (types) => !types.includes("appraisal") || types.length === 1,
      { message: "Appraisal cannot be combined with other engagement types." }
    ),
  property_address: z.string().min(1, "Property address is required"),
  lead_consultant: z.string().optional(),
  represented_by: z.string().optional(),
  date_of_loss: z.string().optional(),
  peril: z.enum(PERIL_OPTIONS).optional(),
  structure_type: z.enum(STRUCTURE_TYPE_OPTIONS).optional(),
  report_due_date: z.string().optional(),
  policy_number: z.string().optional(),
  cause_number: z.string().optional(),
  claim_number: z.string().optional(),
  narrative: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  sharepoint_folder_url: z.string().optional(),
});

type EditProjectFormData = z.infer<typeof editProjectSchema>;

const consultants = [
  { value: "john-harrison", label: "John Harrison" },
  { value: "sarah-chen", label: "Sarah Chen" },
  { value: "michael-torres", label: "Michael Torres" },
  { value: "emily-walsh", label: "Emily Walsh" },
  { value: "robert-kim", label: "Robert Kim" },
];

interface MockProject extends EditProjectFormData {
  opposing_parties: string[];
  other_parties?: OtherParty[];
}

const mockProjectData: Record<string, MockProject> = {
  "0001-2026": {
    project_id: "0001-2026",
    name: "Riverside Office Complex Appraisal",
    client_name: "Meridian Properties LLC",
    client_type: "defense",
    client_address: "500 Commerce St, Dallas, TX 75201",
    point_of_contact: "Jane Doe",
    point_of_contact_secondary: "",
    representing: "Covington Specialty Insurance Company",
    engagement_types: ["appraisal"],
    property_address: "1200 Riverside Dr, Austin, TX 78704",
    lead_consultant: "john-harrison",
    represented_by: "",
    date_of_loss: "",
    peril: undefined,
    structure_type: undefined,
    report_due_date: "2026-03-30",
    policy_number: "VBA88637300",
    cause_number: "",
    claim_number: "7030181844",
    narrative:
      "Full appraisal of a Class-A office complex comprising three buildings totaling 185,000 SF.",
    notes: "",
    status: "active",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/001",
    opposing_parties: ["Wells Fargo Bank", "CBRE Valuation"],
  },
  "0002-2026": {
    project_id: "0002-2026",
    name: "Palomita Blanca v. Covington Ins.",
    client_name: "Cooper Montgomery, Bruce Wilkin",
    client_type: "defense",
    client_address: "200 Main St, Mission, TX 78572",
    point_of_contact: "Bruce Wilkin",
    point_of_contact_secondary: "",
    representing: "Covington Specialty Insurance Company",
    engagement_types: ["litigation_support"],
    property_address: "1352 E. 1st Street, Mission, TX 78572",
    lead_consultant: "sarah-chen",
    represented_by: "J. Michael Moore (Moore Law Firm)",
    date_of_loss: "2023-04-28",
    peril: "hail",
    structure_type: "commercial",
    report_due_date: "2026-04-07",
    policy_number: "VBA88637300",
    cause_number: "CV-2024-00912",
    claim_number: "7030181844",
    narrative:
      "Storm/hail damage claim — need cost of estimated repairs.",
    notes: "",
    status: "pending_conflict",
    sharepoint_folder_url: "",
    opposing_parties: ["Palomita Blanca Adult Daycare"],
  },
};

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId =
    typeof params?.id === "string" ? params.id : "0001-2026";
  const isConflictMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("conflict") === "true";

  const projectData =
    mockProjectData[projectId] ?? mockProjectData["0001-2026"]!;

  const [opposingParties, setOpposingParties] = useState<string[]>(
    projectData.opposing_parties
  );
  const [partyInput, setPartyInput] = useState("");

  const [otherParties, setOtherParties] = useState<OtherParty[]>(
    projectData.other_parties ?? []
  );
  const [otherPartyDialogOpen, setOtherPartyDialogOpen] = useState(false);
  const [editingOtherPartyIndex, setEditingOtherPartyIndex] = useState<
    number | null
  >(null);
  const [otherPartyDraft, setOtherPartyDraft] = useState<OtherParty>({
    name: "",
    role: "client",
    standing: "aligned",
    notes: "",
  });

  const [showRepresentedBy, setShowRepresentedBy] = useState(
    !!projectData.represented_by
  );
  const [conflictDetails, setConflictDetails] = useState("");
  const accountNameSuggestions = getAccountNameSuggestions();
  const [clientNameDraft, setClientNameDraft] = useState(projectData.client_name ?? "");
  const [representingDraft, setRepresentingDraft] = useState(projectData.representing ?? "");
  const [representedByDraft, setRepresentedByDraft] = useState(projectData.represented_by ?? "");

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setValue,
  } = useForm<EditProjectFormData>({
    resolver: zodResolver(editProjectSchema),
    defaultValues: projectData,
  });

  // Merge localStorage once per project; deps only [projectId] so opening the 2nd POC row
  // isn’t cleared if `reset`’s identity changes between renders.
  useLayoutEffect(() => {
    const pd = mockProjectData[projectId] ?? mockProjectData["0001-2026"]!;
    const merged = applyStoredProjectDetailToEditDefaults(
      projectId,
      pd as unknown as Record<string, unknown>
    ) as EditProjectFormData & { other_parties?: OtherParty[] };
    reset(merged);
    setClientNameDraft(merged.client_name ?? "");
    setRepresentingDraft(merged.representing ?? "");
    setRepresentedByDraft(merged.represented_by ?? "");

    // Other parties are managed outside react-hook-form (modal/editor),
    // so we sync them here from localStorage overrides on project change.
    setOtherParties(
      merged.other_parties ?? pd.other_parties ?? []
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only when route id changes; reset() is stable
  }, [projectId]);

  function addParty() {
    const trimmed = partyInput.trim();
    if (trimmed && !opposingParties.includes(trimmed)) {
      setOpposingParties([...opposingParties, trimmed]);
      setPartyInput("");
    }
  }

  function removeParty(party: string) {
    setOpposingParties(opposingParties.filter((p) => p !== party));
  }

  function openAddOtherParty() {
    setEditingOtherPartyIndex(null);
    setOtherPartyDraft({
      name: "",
      role: "client",
      standing: "aligned",
      notes: "",
    });
    setOtherPartyDialogOpen(true);
  }

  function openEditOtherParty(index: number) {
    const p = otherParties[index];
    setEditingOtherPartyIndex(index);
    setOtherPartyDraft({
      ...p,
      notes: p.notes ?? "",
    });
    setOtherPartyDialogOpen(true);
  }

  function removeOtherParty(index: number) {
    setOtherParties(otherParties.filter((_, i) => i !== index));
    if (editingOtherPartyIndex === index) {
      setOtherPartyDialogOpen(false);
      setEditingOtherPartyIndex(null);
    }
  }

  function saveOtherParty() {
    const name = otherPartyDraft.name.trim();
    if (!name) return;

    const normalized: OtherParty = {
      ...otherPartyDraft,
      name,
      notes: (otherPartyDraft.notes ?? "").trim() || null,
    };

    if (editingOtherPartyIndex === null) {
      setOtherParties([...otherParties, normalized]);
    } else {
      setOtherParties(
        otherParties.map((p, i) => (i === editingOtherPartyIndex ? normalized : p))
      );
    }

    setOtherPartyDialogOpen(false);
    setEditingOtherPartyIndex(null);
  }

  function onSubmit(data: EditProjectFormData) {
    const payload = {
      ...data,
      opposing_parties: opposingParties,
      other_parties: otherParties,
      ...(isConflictMode ? { conflict_details: conflictDetails } : {}),
    };
    console.log("Edit project submission:", payload);
    saveProjectDetailOverrides(projectId, {
      client_name: data.client_name,
      client_type: data.client_type,
      point_of_contact: data.point_of_contact,
      point_of_contact_secondary: data.point_of_contact_secondary,
      notes: data.notes,
      peril: data.peril,
      structure_type: data.structure_type,
      policy_number: data.policy_number ?? "",
      cause_number: data.cause_number ?? "",
      claim_number: data.claim_number ?? "",
      other_parties: otherParties,
    });
    // "Live wiring": persist to DB for non-conflict submissions.
    if (!isConflictMode) {
      void fetch("/api/projects/patch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          client_name: data.client_name,
          client_type: data.client_type,
          point_of_contact: data.point_of_contact,
          point_of_contact_secondary: data.point_of_contact_secondary,
          notes: data.notes,
          peril: data.peril,
          structure_type: data.structure_type,
          opposing_parties: opposingParties,
          other_parties: otherParties,
          represented_by: data.represented_by ?? null,
          policy_number: data.policy_number ?? null,
          cause_number: data.cause_number ?? null,
          claim_number: data.claim_number ?? null,
        }),
      }).catch(() => {
        // Demo mode may not have Supabase configured; localStorage still ensures UI updates.
      });
    }

    router.push(`/projects/${projectId}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="flex items-start gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Edit Project</h1>
            <Badge
              className={
                PROJECT_STATUS_COLORS[projectData.status as ProjectStatus]
              }
              variant="outline"
            >
              {PROJECT_STATUS_LABELS[projectData.status as ProjectStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground">{projectId}</p>
        </div>
      </div>

      {isConflictMode && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Possible Conflict Identified
            </CardTitle>
            <CardDescription className="text-amber-700">
              Please describe the conflict below and click Save Changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="conflict_details" className="text-amber-800">
                Conflict Details *
              </Label>
              <Textarea
                id="conflict_details"
                placeholder="Describe the nature of the conflict, your relationship to the parties, and any relevant details…"
                rows={4}
                value={conflictDetails}
                onChange={(e) => setConflictDetails(e.target.value)}
                className="border-amber-300 focus:border-amber-500"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="project_id">Project ID *</Label>
              <Input id="project_id" className="font-mono" {...register("project_id")} />
              {errors.project_id && (
                <p className="text-sm text-red-600">{errors.project_id.message}</p>
              )}
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name *</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Engagement Type *</Label>
                <Controller
                  control={control}
                  name="engagement_types"
                  render={({ field }) => (
                    <EngagementTypeMultiSelect
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={!!errors.engagement_types}
                    />
                  )}
                />
                {errors.engagement_types && (
                  <p className="text-sm text-red-600">
                    {errors.engagement_types.message}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="client_name">Client Name *</Label>
                <input type="hidden" {...register("client_name")} />
                <AccountNameCombobox
                  value={clientNameDraft}
                  onChange={(next) => {
                    setClientNameDraft(next);
                    setValue("client_name", next, { shouldValidate: true, shouldDirty: true });
                  }}
                  options={accountNameSuggestions}
                  placeholder="Choose client name"
                  inputPlaceholder="Search accounts…"
                />
                {errors.client_name && (
                  <p className="text-sm text-red-600">
                    {errors.client_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Side *</Label>
                <Controller
                  control={control}
                  name="client_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type">
                          {field.value
                            ? CLIENT_TYPE_LABELS[field.value as ClientType]
                            : "Select type"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {CLIENT_TYPE_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {CLIENT_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="point_of_contact">Point of Contact</Label>
                <Input
                  id="point_of_contact"
                  placeholder="e.g. Jane Doe"
                  {...register("point_of_contact")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="point_of_contact_secondary">
                  2nd Point of Contact
                </Label>
                <Input
                  id="point_of_contact_secondary"
                  placeholder="e.g. John Smith"
                  {...register("point_of_contact_secondary")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="client_address">Client Address</Label>
              <Controller
                control={control}
                name="client_address"
                render={({ field }) => (
                  <AddressAutocompleteInput
                    id="client_address"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="representing">Representing</Label>
              <input type="hidden" {...register("representing")} />
              <AccountNameCombobox
                value={representingDraft}
                onChange={(next) => {
                  setRepresentingDraft(next);
                  setValue("representing", next, { shouldDirty: true });
                }}
                options={accountNameSuggestions}
                placeholder="Choose representing"
                inputPlaceholder="Search accounts…"
              />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Project Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status">
                          {field.value
                            ? PROJECT_STATUS_LABELS[
                                field.value as keyof typeof PROJECT_STATUS_LABELS
                              ]
                            : "Select status"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.entries(PROJECT_STATUS_LABELS) as [
                            ProjectStatus,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sharepoint_folder_url">SharePoint Link</Label>
                <Input
                  id="sharepoint_folder_url"
                  placeholder="https://dfcg.sharepoint.com/..."
                  {...register("sharepoint_folder_url")}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label>Opposing Party Name</Label>
                <div className="flex">
                <AccountNameCombobox
                  value={partyInput}
                  onChange={(next) => setPartyInput(next)}
                  options={accountNameSuggestions}
                  placeholder="Enter opposing party name"
                  inputPlaceholder="Search accounts…"
                />
              </div>
              {opposingParties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {opposingParties.map((party) => (
                    <Badge
                      key={party}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {party}
                      <button
                        type="button"
                        onClick={() => removeParty(party)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {!showRepresentedBy && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRepresentedBy(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Represented By
              </Button>
            )}

            {showRepresentedBy && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="represented_by">Represented By</Label>
                    <button
                      type="button"
                      onClick={() => setShowRepresentedBy(false)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <input type="hidden" {...register("represented_by")} />
                  <AccountNameCombobox
                    value={representedByDraft}
                    onChange={(next) => {
                      setRepresentedByDraft(next);
                      setValue("represented_by", next, { shouldDirty: true });
                    }}
                    options={accountNameSuggestions}
                    placeholder="Choose represented by"
                    inputPlaceholder="Search accounts…"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Other Parties</Label>

              {otherParties.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  None added.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  {otherParties.map((p, idx) => (
                    <div
                      key={`${p.name}-${idx}`}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium leading-tight">
                          {p.name}
                        </div>
                        <div className="text-muted-foreground">
                          {OTHER_PARTY_STANDING_LABELS[p.standing]}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditOtherParty(idx)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeOtherParty(idx)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openAddOtherParty}
                className="mt-1"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Other Party
              </Button>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="property_address">Property Address *</Label>
                <Controller
                  control={control}
                  name="property_address"
                  render={({ field }) => (
                    <AddressAutocompleteInput
                      id="property_address"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                    />
                  )}
                />
                {errors.property_address && (
                  <p className="text-sm text-red-600">
                    {errors.property_address.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Structure Type</Label>
                <Controller
                  control={control}
                  name="structure_type"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-Select-">
                          {field.value
                            ? STRUCTURE_TYPE_LABELS[field.value]
                            : "-Select-"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {STRUCTURE_TYPE_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {STRUCTURE_TYPE_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="date_of_loss">Date of Loss</Label>
                <Input
                  id="date_of_loss"
                  type="date"
                  {...register("date_of_loss")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Peril</Label>
                <Controller
                  control={control}
                  name="peril"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || undefined)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="-Select-">
                          {field.value ? PERIL_LABELS[field.value] : "-Select-"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {PERIL_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value}>
                            {PERIL_LABELS[value]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="policy_number">Policy Number</Label>
                  <Input
                    id="policy_number"
                    className="w-full"
                    {...register("policy_number")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cause_number">Cause Number</Label>
                  <Input
                    id="cause_number"
                    placeholder="Optional"
                    className="w-full"
                    {...register("cause_number")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="claim_number">Claim Number</Label>
                <Input
                  id="claim_number"
                  className="w-full"
                  {...register("claim_number")}
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Professional in Charge</Label>
                <Controller
                  control={control}
                  name="lead_consultant"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Professional in Charge">
                          {consultants.find((c) => c.value === field.value)?.label ??
                            "Select Professional in Charge"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {consultants.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.lead_consultant && (
                  <p className="text-sm text-red-600">
                    {errors.lead_consultant.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="report_due_date">Report Due Date</Label>
                <Input
                  id="report_due_date"
                  type="date"
                  {...register("report_due_date")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="narrative">Brief Narrative</Label>
              <Textarea id="narrative" rows={4} {...register("narrative")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Controller
                control={control}
                name="notes"
                render={({ field }) => (
                  <NotesMentionsField
                    id="notes"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="Internal notes… Type @ to tag a teammate"
                  />
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}`)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={otherPartyDialogOpen}
        onOpenChange={(open) => {
          setOtherPartyDialogOpen(open);
          if (!open) setEditingOtherPartyIndex(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingOtherPartyIndex === null ? "Add Other Party" : "Edit Other Party"}
            </DialogTitle>
            <DialogDescription>
              Provide a name, role, standing, and optional notes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="other_party_name">Name</Label>
              <AccountNameCombobox
                triggerId="other_party_name"
                value={otherPartyDraft.name}
                onChange={(next) => setOtherPartyDraft((d) => ({ ...d, name: next }))}
                options={accountNameSuggestions}
                placeholder="e.g. Acme Holdings"
                inputPlaceholder="Search accounts…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={otherPartyDraft.role}
                onValueChange={(v) =>
                  setOtherPartyDraft((d) => ({
                    ...d,
                    role: v as OtherPartyRole,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role">
                    {OTHER_PARTY_ROLE_LABELS[otherPartyDraft.role]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OTHER_PARTY_ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {OTHER_PARTY_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Standing</Label>
              <Select
                value={otherPartyDraft.standing}
                onValueChange={(v) =>
                  setOtherPartyDraft((d) => ({
                    ...d,
                    standing: v as OtherPartyStanding,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select standing">
                    {OTHER_PARTY_STANDING_LABELS[otherPartyDraft.standing]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {OTHER_PARTY_STANDING_OPTIONS.map((standing) => (
                    <SelectItem key={standing} value={standing}>
                      {OTHER_PARTY_STANDING_LABELS[standing]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="other_party_notes">Notes (Optional)</Label>
              <NotesMentionsField
                id="other_party_notes"
                value={otherPartyDraft.notes ?? ""}
                onChange={(v) =>
                  setOtherPartyDraft((d) => ({ ...d, notes: v }))
                }
                placeholder="Type notes… Type @ to tag a teammate"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOtherPartyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveOtherParty()}
              disabled={!otherPartyDraft.name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

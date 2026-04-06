"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardList, Plus, X, Building2, Scale, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { EngagementTypeMultiSelect } from "@/components/engagement-type-multi-select";
import { NotesMentionsField } from "@/components/notes-mentions-field";
import { AddressAutocompleteInput } from "@/components/address-autocomplete-input";
import { getAccountNameSuggestions } from "@/lib/account-name-suggestions";
import { AccountNameCombobox } from "@/components/account-name-combobox";
import {
  CLIENT_TYPE_LABELS,
  CLIENT_TYPE_OPTIONS,
  type ClientType,
  type OtherParty,
  type OtherPartyRole,
  type OtherPartyStanding,
  OTHER_PARTY_ROLE_LABELS,
  OTHER_PARTY_ROLE_OPTIONS,
  OTHER_PARTY_STANDING_LABELS,
  OTHER_PARTY_STANDING_OPTIONS,
  PERIL_LABELS,
  PERIL_OPTIONS,
  STRUCTURE_TYPE_LABELS,
  STRUCTURE_TYPE_OPTIONS,
} from "@/types/index";

import { saveProjectDetailOverrides } from "@/lib/project-detail-overrides";

const engagementTypeEnum = z.enum([
  "appraisal",
  "building_consulting",
  "cost_estimating",
  "litigation_support",
  "pca_cost_segregation",
  "adr_umpire",
  "other",
]);

const newProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  client_name: z.string().min(1, "Client name is required"),
  client_type: z.enum(CLIENT_TYPE_OPTIONS, {
    message: "Side is required",
  }),
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
});

type NewProjectFormData = z.infer<typeof newProjectSchema>;

const consultants = [
  { value: "john-harrison", label: "John Harrison" },
  { value: "sarah-chen", label: "Sarah Chen" },
  { value: "michael-torres", label: "Michael Torres" },
  { value: "emily-walsh", label: "Emily Walsh" },
  { value: "robert-kim", label: "Robert Kim" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [opposingParties, setOpposingParties] = useState<string[]>([]);
  const [partyInput, setPartyInput] = useState("");
  const accountNameSuggestions = getAccountNameSuggestions();

  const [otherParties, setOtherParties] = useState<OtherParty[]>([]);
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

  const [showRepresentedBy, setShowRepresentedBy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientNameDraft, setClientNameDraft] = useState("");
  const [representingDraft, setRepresentingDraft] = useState("");
  const [representedByDraft, setRepresentedByDraft] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
  } = useForm<NewProjectFormData>({
    resolver: zodResolver(newProjectSchema),
    defaultValues: {
      name: "",
      client_name: clientNameDraft,
      client_type: undefined,
      client_address: "",
      point_of_contact: "",
      point_of_contact_secondary: "",
      representing: representingDraft,
      engagement_types: [],
      property_address: "",
      lead_consultant: "",
      represented_by: representedByDraft,
      date_of_loss: "",
      peril: undefined,
      structure_type: undefined,
      report_due_date: "",
      policy_number: "",
      cause_number: "",
      claim_number: "",
      narrative: "",
      notes: "",
    },
  });

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
        otherParties.map((p, i) =>
          i === editingOtherPartyIndex ? normalized : p
        )
      );
    }

    setOtherPartyDialogOpen(false);
    setEditingOtherPartyIndex(null);
  }

  async function onSubmit(data: NewProjectFormData) {
    setSubmitError(null);
    setIsSubmitting(true);

    const payload = { ...data, opposing_parties: opposingParties, other_parties: otherParties };
    try {
      const response = await fetch("/api/projects/submit-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        project_id?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "Failed to submit for conflict check.");
      }

      // Demo/localStorage wiring: update detail view fields immediately.
      if (result.project_id) {
        saveProjectDetailOverrides(result.project_id, {
          client_name: data.client_name,
          client_type: data.client_type,
          point_of_contact: data.point_of_contact,
          point_of_contact_secondary: data.point_of_contact_secondary,
          notes: data.notes,
          peril: data.peril,
          structure_type: data.structure_type,
          other_parties: otherParties,
        });
      }

      router.push("/projects");
      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit for conflict check."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          New Project Intake
        </h1>
        <p className="text-muted-foreground">
          Submit a new project for conflict check and approval
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#0d9488]" />
            <CardTitle>Project Details</CardTitle>
          </div>
          <CardDescription>Auto-assigned ID: XXXX-2026</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Project Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Palomita Blanca v. Covington Ins."
                  {...register("name")}
                />
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

            {/* --- Client Section --- */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Scale className="h-4 w-4" />
                Client Information
              </h3>

              {/* Client Name + Side */}
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
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => field.onChange(v ?? undefined)}
                      >
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
                  {errors.client_type && (
                    <p className="text-sm text-red-600">
                      {errors.client_type.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Point of Contact + 2nd POC */}
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

              {/* Client Address */}
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
                      placeholder="e.g. 123 Main St, Dallas, TX 75201"
                    />
                  )}
                />
              </div>

              {/* Representing */}
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
            </div>

            <Separator />

            {/* --- Other Parties Section --- */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                <Building2 className="h-4 w-4" />
                Other Parties
              </h3>

              {/* Opposing Party Name */}
              <div className="space-y-1.5">
                <Label>Opposing Party Name</Label>
                <div className="flex">
                  <AccountNameCombobox
                    value={partyInput}
                    onChange={(next) => {
                      setPartyInput(next);
                      // keep open add via Enter button or click Add button
                    }}
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

              {/* Represented By toggle */}
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
                          <div className="font-medium leading-tight">{p.name}</div>
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

            </div>

            <Separator />

            {/* --- Project Details --- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Project Details
              </h3>

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
                        placeholder="e.g. 1352 E. 1st Street, Mission, TX 78572"
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
                      placeholder="e.g. VBA88637300"
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
                    placeholder="e.g. 7030181844"
                    className="w-full"
                    {...register("claim_number")}
                  />
                </div>
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

            {/* --- Narrative --- */}
            <div className="space-y-1.5">
              <Label htmlFor="narrative">Brief Narrative</Label>
              <Textarea
                id="narrative"
                placeholder="Describe the scope and purpose of this engagement…"
                rows={4}
                {...register("narrative")}
              />
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

            {/* --- Actions --- */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.push("/projects")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit for Conflict Check"}
              </Button>
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
              {editingOtherPartyIndex === null
                ? "Add Other Party"
                : "Edit Other Party"}
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

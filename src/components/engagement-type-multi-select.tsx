"use client";

import { useMemo } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ENGAGEMENT_TYPE_LABELS,
  type EngagementType,
} from "@/types/index";

const APPRAISAL: EngagementType = "appraisal";

const ORDER: EngagementType[] = (
  Object.keys(ENGAGEMENT_TYPE_LABELS) as EngagementType[]
).filter((k) => k in ENGAGEMENT_TYPE_LABELS);

function formatTriggerLabel(selected: EngagementType[]): string {
  if (selected.length === 0) return "Select type";
  return selected
    .map((v) => ENGAGEMENT_TYPE_LABELS[v])
    .join(", ");
}

export interface EngagementTypeMultiSelectProps {
  id?: string;
  value: EngagementType[];
  onChange: (next: EngagementType[]) => void;
  disabled?: boolean;
  "aria-invalid"?: boolean;
}

export function EngagementTypeMultiSelect({
  id,
  value,
  onChange,
  disabled,
  "aria-invalid": ariaInvalid,
}: EngagementTypeMultiSelectProps) {
  const hasAppraisal = value.includes(APPRAISAL);
  const hasNonAppraisal = value.some((t) => t !== APPRAISAL);

  const appraisalDisabledReason = useMemo(() => {
    if (!hasNonAppraisal) return undefined;
    return "Deselect other engagement types before choosing Appraisal.";
  }, [hasNonAppraisal]);

  const otherDisabledReason = useMemo(() => {
    if (!hasAppraisal) return undefined;
    return "Appraisal cannot be combined with other engagement types.";
  }, [hasAppraisal]);

  function toggle(type: EngagementType) {
    if (type === APPRAISAL) {
      if (hasNonAppraisal) return;
      if (hasAppraisal) {
        onChange(value.filter((t) => t !== APPRAISAL));
      } else {
        onChange([APPRAISAL]);
      }
      return;
    }

    if (hasAppraisal) return;

    if (value.includes(type)) {
      onChange(value.filter((t) => t !== type));
    } else {
      onChange([...value, type]);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        id={id}
        type="button"
        disabled={disabled}
        data-placeholder={value.length === 0 ? "" : undefined}
        aria-invalid={ariaInvalid}
        nativeButton
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 pr-2 text-sm font-normal whitespace-normal transition-colors outline-none select-none",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "dark:bg-input/30 dark:hover:bg-input/50",
          value.length === 0 && "text-muted-foreground"
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {formatTriggerLabel(value)}
        </span>
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,20rem)] p-2 sm:w-80" align="start">
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {ORDER.map((type) => {
            const label = ENGAGEMENT_TYPE_LABELS[type];
            const checked = value.includes(type);
            const isAppraisal = type === APPRAISAL;
            const optionDisabled = isAppraisal
              ? hasNonAppraisal
              : hasAppraisal;
            const reason = isAppraisal
              ? appraisalDisabledReason
              : otherDisabledReason;

            return (
              <label
                key={type}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/80",
                  optionDisabled && "cursor-not-allowed opacity-50 hover:bg-transparent"
                )}
                title={optionDisabled ? reason : undefined}
              >
                <Checkbox
                  checked={checked}
                  disabled={optionDisabled}
                  onCheckedChange={() => toggle(type)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-tight">{label}</span>
              </label>
            );
          })}
        </div>
        <p className="border-t border-border px-2 pt-2 text-xs text-muted-foreground">
          Appraisal is exclusive. Other types can be combined with each other.
        </p>
      </PopoverContent>
    </Popover>
  );
}

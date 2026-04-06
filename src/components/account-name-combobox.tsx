"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function AccountNameCombobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  inputPlaceholder = "Search accounts…",
  allowCustom = true,
  disabled,
  className,
  triggerId,
}: {
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  inputPlaceholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  className?: string;
  triggerId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const label = value.trim();

  const filteredOptions = useMemo(() => options, [options]);
  const queryTrimmed = query.trim();
  const canUseCustom =
    allowCustom &&
    queryTrimmed.length > 0 &&
    !filteredOptions.some((opt) => opt.toLowerCase() === queryTrimmed.toLowerCase());

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        data-placeholder={label ? undefined : ""}
        className={cn(
          "flex h-8 w-full min-w-0 items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-2 pr-2 text-sm transition-colors outline-none select-none",
          "hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          "dark:bg-input/30 dark:hover:bg-input/50",
          !label && "text-muted-foreground",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
      >
        <span className="line-clamp-1 flex-1 truncate text-left">
          {label || placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(100vw-2rem,28rem)] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={inputPlaceholder}
            value={query}
            onValueChange={(v) => setQuery(v)}
          />
          <CommandList>
            <CommandEmpty>No match found.</CommandEmpty>
            <CommandGroup>
              {canUseCustom && (
                <CommandItem
                  key={`__custom__:${queryTrimmed}`}
                  value={queryTrimmed}
                  onSelect={() => {
                    onChange(queryTrimmed);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 truncate">{`Use "${queryTrimmed}"`}</span>
                </CommandItem>
              )}
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt}
                  value={opt}
                  onSelect={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  data-checked={opt === label ? "true" : "false"}
                >
                  <span className="min-w-0 truncate">{opt}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


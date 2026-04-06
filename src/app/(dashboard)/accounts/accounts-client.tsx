"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Phone, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { seedAccounts } from "@/lib/seed-accounts";
import {
  ACCOUNT_OVERRIDES_CHANGED_EVENT,
  ACCOUNT_OVERRIDES_STORAGE_KEY,
  applyAccountOverrides,
  saveAccountOverride,
} from "@/lib/account-overrides";
import { formatPhoneDisplay } from "@/lib/format-phone";
import type { Account, AccountStatus, AccountType, Contact, Profile } from "@/types/index";
import {
  ACCOUNT_STATUS_COLORS,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_TYPE_COLORS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_OPTIONS,
} from "@/types/index";
import {
  generateContactId,
  saveContact,
} from "@/lib/account-contacts";
import {
  addLocalAccount,
  generateAccountId,
  getLocalAccounts,
  LOCAL_ACCOUNTS_CHANGED_EVENT,
} from "@/lib/local-accounts";

type ContactDraft = Omit<Contact, "id" | "account_id"> & { id?: string };

const EMPTY_CONTACT: ContactDraft = {
  full_name: "",
  title: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export function AccountsClient({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const [overrideRevision, setOverrideRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "all">("all");

  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [draftBillingAddress, setDraftBillingAddress] = useState("");
  const [draftMainPhone, setDraftMainPhone] = useState("");
  const [draftAccountType, setDraftAccountType] = useState<AccountType | "">("");
  const [draftAccountStatus, setDraftAccountStatus] = useState<AccountStatus | "">("");
  const [draftContacts, setDraftContacts] = useState<ContactDraft[]>([{ ...EMPTY_CONTACT }]);

  const showAdminItems = profile.role === "admin" || profile.role === "pic";

  useEffect(() => {
    const bump = () => setOverrideRevision((r) => r + 1);
    window.addEventListener(ACCOUNT_OVERRIDES_CHANGED_EVENT, bump);
    window.addEventListener(LOCAL_ACCOUNTS_CHANGED_EVENT, bump);
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNT_OVERRIDES_STORAGE_KEY) bump();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ACCOUNT_OVERRIDES_CHANGED_EVENT, bump);
      window.removeEventListener(LOCAL_ACCOUNTS_CHANGED_EVENT, bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const accounts: Account[] = useMemo(() => {
    const base = [...seedAccounts, ...getLocalAccounts()];
    return base.map(applyAccountOverrides);
  }, [pathname, overrideRevision]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return accounts.filter((acct) => {
      if (typeFilter !== "all" && acct.account_type !== typeFilter) return false;
      if (statusFilter !== "all" && acct.account_status !== statusFilter) return false;
      if (
        q &&
        !acct.name.toLowerCase().includes(q) &&
        !acct.billing_address.toLowerCase().includes(q) &&
        !acct.main_phone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [accounts, search, typeFilter, statusFilter]);

  function openAdd() {
    setAddError(null);
    setDraftName("");
    setDraftBillingAddress("");
    setDraftMainPhone("");
    setDraftAccountType("");
    setDraftAccountStatus("");
    setDraftContacts([{ ...EMPTY_CONTACT }]);
    setAddOpen(true);
  }

  async function saveNewAccount() {
    const name = draftName.trim();
    if (!name) {
      setAddError("Account name is required.");
      return;
    }
    const anyValidContact = draftContacts.some((c) => c.full_name.trim());
    if (!anyValidContact) {
      setAddError("Add at least one contact name.");
      return;
    }

    setAddError(null);
    setIsSaving(true);
    try {
      const id = generateAccountId();
      const account: Account = {
        id,
        name,
        billing_address: draftBillingAddress.trim(),
        main_phone: formatPhoneDisplay(draftMainPhone),
        account_type: draftAccountType,
        account_status: draftAccountStatus,
      };

      addLocalAccount(account);
      saveAccountOverride(id, {
        billing_address: account.billing_address,
        main_phone: account.main_phone,
        account_type: account.account_type,
        account_status: account.account_status,
      });

      draftContacts
        .filter((c) => c.full_name.trim())
        .forEach((c) => {
          const contact: Contact = {
            id: c.id ?? generateContactId(),
            account_id: id,
            full_name: c.full_name.trim(),
            title: c.title.trim(),
            email: c.email.trim(),
            phone: formatPhoneDisplay(c.phone),
            address: c.address.trim(),
            notes: c.notes.trim(),
          };
          saveContact(contact);
        });

      setAddOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <p className="text-muted-foreground">
            {filtered.length} of {accounts.length} accounts
          </p>
        </div>
        {showAdminItems && (
          <Button type="button" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Account
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AccountType | "all")}>
          <SelectTrigger className="w-[min(100%,10rem)]">
            <SelectValue placeholder="Type">
              {(value) =>
                value === "all" ? "All Types" : ACCOUNT_TYPE_LABELS[value as AccountType]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {ACCOUNT_TYPE_LABELS[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as AccountStatus | "all")}
        >
          <SelectTrigger className="w-[min(100%,10rem)]">
            <SelectValue placeholder="Status">
              {(value) =>
                value === "all" ? "All Statuses" : ACCOUNT_STATUS_LABELS[value as AccountStatus]
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ACCOUNT_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {ACCOUNT_STATUS_LABELS[opt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Account Name</TableHead>
              <TableHead className="hidden lg:table-cell">Main Phone</TableHead>
              <TableHead>Account Type</TableHead>
              <TableHead>Account Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No accounts match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((acct) => (
                <TableRow key={acct.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link
                      href={`/accounts/${acct.id}`}
                      className="text-teal-700 underline-offset-2 hover:underline"
                    >
                      {acct.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {acct.main_phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {formatPhoneDisplay(acct.main_phone)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {acct.account_type ? (
                      <Badge variant="outline" className={ACCOUNT_TYPE_COLORS[acct.account_type]}>
                        {ACCOUNT_TYPE_LABELS[acct.account_type]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {acct.account_status ? (
                      <Badge
                        variant="outline"
                        className={ACCOUNT_STATUS_COLORS[acct.account_status]}
                      >
                        {ACCOUNT_STATUS_LABELS[acct.account_status]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[min(90vh,760px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <DialogDescription>
              Enter account details and at least one contact. This saves locally for now.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {addError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {addError}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Account Name *</Label>
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={draftBillingAddress}
                  onChange={(e) => setDraftBillingAddress(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Main Phone</Label>
                <Input value={draftMainPhone} onChange={(e) => setDraftMainPhone(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Account Type</Label>
                <Select
                  value={draftAccountType || "__none__"}
                  onValueChange={(v) =>
                    setDraftAccountType(v === "__none__" ? "" : (v as AccountType))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose type">
                      {draftAccountType ? ACCOUNT_TYPE_LABELS[draftAccountType] : "—"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {ACCOUNT_TYPE_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Account Status</Label>
                <Select
                  value={draftAccountStatus || "__none__"}
                  onValueChange={(v) =>
                    setDraftAccountStatus(v === "__none__" ? "" : (v as AccountStatus))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose status">
                      {draftAccountStatus ? ACCOUNT_STATUS_LABELS[draftAccountStatus] : "—"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">—</SelectItem>
                    {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {ACCOUNT_STATUS_LABELS[opt]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Contacts</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDraftContacts((prev) => [...prev, { ...EMPTY_CONTACT }])}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Contact
                </Button>
              </div>

              <div className="space-y-4">
                {draftContacts.map((c, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium">Contact {idx + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={draftContacts.length === 1}
                        onClick={() =>
                          setDraftContacts((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label>Full Name *</Label>
                        <Input
                          value={c.full_name}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, full_name: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input
                          value={c.title}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Email</Label>
                        <Input
                          value={c.email}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, email: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Phone</Label>
                        <Input
                          value={c.phone}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, phone: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Address</Label>
                        <Textarea
                          value={c.address}
                          rows={2}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, address: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Notes</Label>
                        <Textarea
                          value={c.notes}
                          rows={2}
                          onChange={(e) =>
                            setDraftContacts((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSaving} onClick={saveNewAccount}>
              {isSaving ? "Saving…" : "Save Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


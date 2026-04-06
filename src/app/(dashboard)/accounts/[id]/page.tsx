"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Plus,
  Pencil,
  Save,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { AddressAutocompleteInput } from "@/components/address-autocomplete-input";
import { getAccountById } from "@/lib/seed-accounts";
import { applyAccountOverrides, saveAccountOverride } from "@/lib/account-overrides";
import {
  getContactsForAccount,
  saveContact,
  deleteContact,
  generateContactId,
} from "@/lib/account-contacts";
import type { Account, AccountType, AccountStatus, Contact } from "@/types/index";
import {
  ACCOUNT_TYPE_OPTIONS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_STATUS_LABELS,
} from "@/types/index";
import { formatPhoneDisplay } from "@/lib/format-phone";

const EMPTY_FORM: Omit<Contact, "id" | "account_id"> = {
  full_name: "",
  title: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

type AccountDetailDraft = {
  billing_address: string;
  main_phone: string;
  account_type: AccountType | "";
  account_status: AccountStatus | "";
};

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [detailDraft, setDetailDraft] = useState<AccountDetailDraft | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const base = getAccountById(params.id);
    const acct = base ? applyAccountOverrides(base) : undefined;
    if (acct) {
      const main_phone = formatPhoneDisplay(acct.main_phone);
      setAccount({ ...acct, main_phone });
      setDetailDraft({
        billing_address: acct.billing_address,
        main_phone,
        account_type: acct.account_type,
        account_status: acct.account_status,
      });
      setContacts(getContactsForAccount(acct.id));
    } else {
      setAccount(null);
      setDetailDraft(null);
    }
  }, [params.id]);

  const refreshContacts = useCallback(() => {
    if (account) {
      setContacts(getContactsForAccount(account.id));
    }
  }, [account]);

  const handleOpenAdd = () => {
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      full_name: contact.full_name,
      title: contact.title,
      email: contact.email,
      phone: formatPhoneDisplay(contact.phone),
      address: contact.address,
      notes: contact.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!account || !form.full_name.trim()) return;
    const contact: Contact = {
      id: editingContact?.id ?? generateContactId(),
      account_id: account.id,
      ...form,
      phone: formatPhoneDisplay(form.phone),
    };
    saveContact(contact);
    refreshContacts();
    setDialogOpen(false);
    setForm(EMPTY_FORM);
    setEditingContact(null);
  };

  const handleConfirmDelete = () => {
    if (deletingContactId) {
      deleteContact(deletingContactId);
      refreshContacts();
    }
    setDeleteDialogOpen(false);
    setDeletingContactId(null);
  };

  const handleOpenDelete = (contactId: string) => {
    setDeletingContactId(contactId);
    setDeleteDialogOpen(true);
  };

  const baseDraftFromAccount = (a: Account): AccountDetailDraft => ({
    billing_address: a.billing_address,
    main_phone: a.main_phone,
    account_type: a.account_type,
    account_status: a.account_status,
  });

  const handleAccountTypeChange = (value: string | null) => {
    if (!account || value == null) return;
    const v = value === "__none__" ? "" : (value as AccountType);
    setDetailDraft((prev) => ({ ...(prev ?? baseDraftFromAccount(account)), account_type: v }));
  };

  const handleAccountStatusChange = (value: string | null) => {
    if (!account || value == null) return;
    const v = value === "__none__" ? "" : (value as AccountStatus);
    setDetailDraft((prev) => ({ ...(prev ?? baseDraftFromAccount(account)), account_status: v }));
  };

  const handleBillingAddressChange = (value: string) => {
    if (!account) return;
    setDetailDraft((prev) => ({ ...(prev ?? baseDraftFromAccount(account)), billing_address: value }));
  };

  const handleMainPhoneChange = (value: string) => {
    if (!account) return;
    setDetailDraft((prev) => ({ ...(prev ?? baseDraftFromAccount(account)), main_phone: value }));
  };

  const handleSaveAccountDetails = () => {
    if (!account) return;
    const payload = detailDraft ?? baseDraftFromAccount(account);
    const main_phone = formatPhoneDisplay(payload.main_phone);
    saveAccountOverride(account.id, {
      billing_address: payload.billing_address,
      main_phone,
      account_type: payload.account_type,
      account_status: payload.account_status,
    });
    const next = { ...payload, main_phone };
    setAccount((prev) =>
      prev
        ? {
            ...prev,
            billing_address: next.billing_address,
            main_phone: next.main_phone,
            account_type: next.account_type,
            account_status: next.account_status,
          }
        : null
    );
    setDetailDraft(next);
  };

  if (!account) {
    return (
      <div className="space-y-4">
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Accounts
        </Link>
        <p className="text-muted-foreground">Account not found.</p>
      </div>
    );
  }

  const draft = detailDraft ?? baseDraftFromAccount(account);

  const isAccountDetailDirty =
    draft.billing_address !== account.billing_address ||
    draft.main_phone !== account.main_phone ||
    draft.account_type !== account.account_type ||
    draft.account_status !== account.account_status;

  return (
    <div className="space-y-6">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Accounts
      </Link>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-700" />
              {account.name}
            </CardTitle>
            <Button
              type="button"
              size="sm"
              disabled={!isAccountDetailDirty}
              onClick={handleSaveAccountDetails}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Save changes
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor="billing-address"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                Billing Address
              </Label>
              <AddressAutocompleteInput
                id="billing-address"
                value={draft.billing_address}
                onChange={handleBillingAddressChange}
                placeholder="Street, city, state, ZIP"
              />
              {draft.billing_address.trim() ? (
                <button
                  type="button"
                  className="text-left text-sm text-teal-700 underline-offset-2 hover:underline"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(draft.billing_address)}`,
                      "_blank"
                    )
                  }
                >
                  Open in Google Maps
                </button>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="main-phone"
                className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              >
                <Phone className="h-3.5 w-3.5 shrink-0" />
                Main Phone
              </Label>
              <Input
                id="main-phone"
                type="tel"
                autoComplete="tel"
                value={draft.main_phone}
                onChange={(e) => handleMainPhoneChange(e.target.value)}
                onBlur={() => {
                  if (!account) return;
                  setDetailDraft((prev) => {
                    const base = prev ?? baseDraftFromAccount(account);
                    return { ...base, main_phone: formatPhoneDisplay(base.main_phone) };
                  });
                }}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="space-y-1.5 py-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="account-type" className="text-xs text-muted-foreground">
                Account Type
              </Label>
              <Select
                value={draft.account_type || "__none__"}
                onValueChange={handleAccountTypeChange}
              >
                <SelectTrigger id="account-type" className="w-full max-w-xs">
                  <SelectValue placeholder="Select type">
                    {(value) =>
                      !value || value === "__none__"
                        ? "None"
                        : ACCOUNT_TYPE_LABELS[value as AccountType]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {ACCOUNT_TYPE_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 py-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="account-status" className="text-xs text-muted-foreground">
                Account Status
              </Label>
              <Select
                value={draft.account_status || "__none__"}
                onValueChange={handleAccountStatusChange}
              >
                <SelectTrigger id="account-status" className="w-full max-w-xs">
                  <SelectValue placeholder="Select status">
                    {(value) =>
                      !value || value === "__none__"
                        ? "None"
                        : ACCOUNT_STATUS_LABELS[value as AccountStatus]
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">None</span>
                  </SelectItem>
                  {ACCOUNT_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {ACCOUNT_STATUS_LABELS[opt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-teal-700" />
              Contacts
            </CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={handleOpenAdd}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No contacts yet. Add the first contact for this account.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title / Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">{contact.full_name}</TableCell>
                      <TableCell>
                        {contact.title || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-teal-700 underline-offset-2 hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {contact.phone ? (
                          formatPhoneDisplay(contact.phone)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenEdit(contact)}
                            aria-label="Edit contact"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleOpenDelete(contact.id)}
                            aria-label="Delete contact"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Contact Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingContact
                ? "Update the contact details below."
                : `Add a new contact to ${account.name}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contact-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="contact-title">Title / Role</Label>
                <Input
                  id="contact-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Claims Adjuster"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  onBlur={() =>
                    setForm((f) => ({ ...f, phone: formatPhoneDisplay(f.phone) }))
                  }
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane.smith@example.com"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-address">Address</Label>
              <AddressAutocompleteInput
                id="contact-address"
                value={form.address}
                onChange={(val) => setForm((f) => ({ ...f, address: val }))}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!form.full_name.trim()}
              onClick={handleSave}
            >
              {editingContact ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this contact? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

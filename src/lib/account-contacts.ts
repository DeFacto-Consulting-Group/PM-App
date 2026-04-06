import type { Contact } from "@/types/index";
import { ACCOUNT_CONTACTS_SEED } from "@/data/account-contacts-seed";

const STORAGE_KEY = "dfcg-account-contacts-v1";

function readAll(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(contacts: Contact[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function getContactsForAccount(accountId: string): Contact[] {
  const fromSeed = ACCOUNT_CONTACTS_SEED.filter((c) => c.account_id === accountId);
  const fromStorage = readAll().filter((c) => c.account_id === accountId);
  return [...fromSeed, ...fromStorage];
}

export function saveContact(contact: Contact): void {
  const all = readAll();
  const idx = all.findIndex((c) => c.id === contact.id);
  if (idx >= 0) {
    all[idx] = contact;
  } else {
    all.push(contact);
  }
  writeAll(all);
}

export function deleteContact(contactId: string): void {
  writeAll(readAll().filter((c) => c.id !== contactId));
}

export function generateContactId(): string {
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

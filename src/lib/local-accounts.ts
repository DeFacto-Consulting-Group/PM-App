import type { Account } from "@/types/index";

const STORAGE_KEY = "dfcg-local-accounts-v1";

/** Same-tab refresh for list/detail pages. */
export const LOCAL_ACCOUNTS_CHANGED_EVENT = "dfcg-local-accounts-changed";

function readAll(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Account[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(accounts: Account[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  window.dispatchEvent(new CustomEvent(LOCAL_ACCOUNTS_CHANGED_EVENT));
}

export function getLocalAccounts(): Account[] {
  return readAll();
}

export function addLocalAccount(account: Account): void {
  const all = readAll();
  const exists = all.some((a) => a.id === account.id);
  writeAll(exists ? all.map((a) => (a.id === account.id ? account : a)) : [...all, account]);
}

export function generateAccountId(): string {
  return `acct-local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}


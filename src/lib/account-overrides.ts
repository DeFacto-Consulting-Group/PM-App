import type { AccountType, AccountStatus, Account } from "@/types/index";

export const ACCOUNT_OVERRIDES_STORAGE_KEY = "dfcg-account-overrides-v1";

/** Same-tab: dispatch after save so list views can refresh without remounting. */
export const ACCOUNT_OVERRIDES_CHANGED_EVENT = "dfcg-account-overrides-changed";

const STORAGE_KEY = ACCOUNT_OVERRIDES_STORAGE_KEY;

interface AccountOverride {
  account_type?: AccountType | "";
  account_status?: AccountStatus | "";
  billing_address?: string;
  main_phone?: string;
}

function readAll(): Record<string, AccountOverride> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AccountOverride>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getAccountOverrides(accountId: string): AccountOverride | undefined {
  return readAll()[accountId];
}

export function saveAccountOverride(accountId: string, patch: AccountOverride): void {
  if (typeof window === "undefined") return;
  const all = readAll();
  all[accountId] = { ...all[accountId], ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  window.dispatchEvent(new CustomEvent(ACCOUNT_OVERRIDES_CHANGED_EVENT));
}

export function applyAccountOverrides(account: Account): Account {
  const o = getAccountOverrides(account.id);
  if (!o) return account;
  return {
    ...account,
    ...(o.account_type !== undefined ? { account_type: o.account_type } : {}),
    ...(o.account_status !== undefined ? { account_status: o.account_status } : {}),
    ...(o.billing_address !== undefined ? { billing_address: o.billing_address } : {}),
    ...(o.main_phone !== undefined ? { main_phone: o.main_phone } : {}),
  };
}

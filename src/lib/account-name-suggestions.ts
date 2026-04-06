import { getAllAccounts } from "@/lib/seed-accounts";

export function getAccountNameSuggestions(): string[] {
  const names = getAllAccounts()
    .map((a) => a.name?.trim())
    .filter((n): n is string => !!n);
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}


/**
 * react-mentions stores values like: @[Jane Doe](uuid-here)
 * For read-only display, normalize to a friendly @Jane Doe style.
 */
export function formatNotesForDisplay(markup: string): string {
  if (!markup?.trim()) return "";
  return markup.replace(/@\[([^\]]+)]\([^)]+\)/g, "@$1");
}

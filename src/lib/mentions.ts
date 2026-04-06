/**
 * react-mentions stores values like: @[Jane Doe](uuid-here)
 * We extract the UUIDs so we can notify tagged users.
 */
export function extractMentionIds(markup: string): string[] {
  if (!markup?.trim()) return [];
  const ids: string[] = [];
  const re = /@\[([^\]]+)]\(([^)]+)\)/g;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(markup)) !== null) {
    const id = match[2];
    if (id) ids.push(id);
  }
  return Array.from(new Set(ids));
}


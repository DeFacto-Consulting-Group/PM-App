/** Demo display names for project IDs (synced tasks / local demo data). */
export const DEMO_PROJECT_NAMES: Record<string, string> = {
  "0001-2026": "Riverside Office Complex Appraisal",
  "0002-2026": "Palomita Blanca v. Covington Ins.",
  "0003-2026": "Metro Plaza Cost Estimate",
  "0004-2026": "Lakeside Tower PCA",
  "0005-2026": "Downtown Retail ADR",
  "0006-2026": "Harborview Condo Assessment",
  "0007-2026": "Grandview Estates Appraisal",
  "0008-2026": "Bayside Industrial Park Consulting",
  "0009-2026": "Oakmont Towers Cost Segregation",
};

export function demoProjectLabel(projectId: string): string {
  return DEMO_PROJECT_NAMES[projectId] ?? projectId;
}

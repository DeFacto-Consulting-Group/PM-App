import type { ClientType, EngagementType, ProjectStatus } from "@/types/index";

export interface MockProjectListItem {
  project_id: string;
  name: string;
  client_name: string;
  client_type: ClientType;
  lead_consultant: string;
  status: ProjectStatus;
  engagement_type: EngagementType;
  property_address: string;
  report_due_date: string | null;
  sharepoint_folder_url: string | null;
}

export const mockProjects: MockProjectListItem[] = [
  {
    project_id: "0001-2026",
    name: "Riverside Office Complex Appraisal",
    client_name: "Meridian Properties LLC",
    client_type: "defense",
    lead_consultant: "John Harrison",
    status: "pending_ea_retainer_auth",
    engagement_type: "appraisal",
    property_address: "Austin, TX",
    report_due_date: "2026-03-30",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/001",
  },
  {
    project_id: "0002-2026",
    name: "Cedar Heights Litigation Support",
    client_name: "National Insurance Group",
    client_type: "carrier",
    lead_consultant: "Sarah Chen",
    status: "pending_conflict",
    engagement_type: "litigation_support",
    property_address: "Denver, CO",
    report_due_date: "2026-04-07",
    sharepoint_folder_url: null,
  },
  {
    project_id: "0003-2026",
    name: "Metro Plaza Cost Estimate",
    client_name: "Atlas Development Corp",
    client_type: "owner_insured",
    lead_consultant: "Michael Torres",
    status: "report_issued",
    engagement_type: "cost_estimating",
    property_address: "Chicago, IL",
    report_due_date: "2026-03-12",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/003",
  },
  {
    project_id: "0004-2026",
    name: "Lakeside Tower PCA",
    client_name: "Great Lakes REIT",
    client_type: "defense",
    lead_consultant: "Emily Walsh",
    status: "active",
    engagement_type: "pca_cost_segregation",
    property_address: "Milwaukee, WI",
    report_due_date: "2026-03-25",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/004",
  },
  {
    project_id: "0005-2026",
    name: "Downtown Retail ADR",
    client_name: "Pacific Mutual Insurance",
    client_type: "carrier",
    lead_consultant: "Robert Kim",
    status: "hold",
    engagement_type: "adr_umpire",
    property_address: "Portland, OR",
    report_due_date: null,
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/005",
  },
  {
    project_id: "0006-2026",
    name: "Harborview Condo Assessment",
    client_name: "Harborview HOA",
    client_type: "owner_insured",
    lead_consultant: "John Harrison",
    status: "conflict_review",
    engagement_type: "building_consulting",
    property_address: "Seattle, WA",
    report_due_date: null,
    sharepoint_folder_url: null,
  },
  {
    project_id: "0007-2026",
    name: "Grandview Estates Appraisal",
    client_name: "Sterling Capital Partners",
    client_type: "plaintiff",
    lead_consultant: "Emily Walsh",
    status: "active",
    engagement_type: "appraisal",
    property_address: "Phoenix, AZ",
    report_due_date: "2026-04-02",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/007",
  },
  {
    project_id: "0008-2026",
    name: "Bayside Industrial Park Consulting",
    client_name: "Trident Manufacturing",
    client_type: "defense",
    lead_consultant: "Michael Torres",
    status: "active",
    engagement_type: "building_consulting",
    property_address: "Tampa, FL",
    report_due_date: "2026-04-10",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/008",
  },
  {
    project_id: "0009-2026",
    name: "Oakmont Towers Cost Segregation",
    client_name: "Oakmont Investors LLC",
    client_type: "owner_insured",
    lead_consultant: "Sarah Chen",
    status: "closed",
    engagement_type: "pca_cost_segregation",
    property_address: "Nashville, TN",
    report_due_date: "2026-03-01",
    sharepoint_folder_url: "https://dfcg.sharepoint.com/sites/projects/009",
  },
];


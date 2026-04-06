import type { TaskStatus, TaskBucket, ChecklistItem } from "@/types/index";

export interface MockTask {
  id: string;
  bucket: TaskBucket;
  name: string;
  description: string | null;
  status: TaskStatus;
  assigned_to: string | null;
  initials: string | null;
  due_date: string | null;
  completed_date: string | null;
  checklist_items: ChecklistItem[];
  sort_order: number;
}

function withCompletedDate(tasks: Omit<MockTask, "completed_date">[]): MockTask[] {
  return tasks.map((t) => ({
    ...t,
    completed_date: t.status === "completed" ? t.due_date ?? "2026-02-16" : null,
  }));
}

export function generateAppraisalTasks(): MockTask[] {
  return withCompletedDate([
    // Project Intake
    { id: "a-pi-1", bucket: "project_intake", name: "Conflict Check", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-15", checklist_items: [{ name: "Create conflict check", completed: true }, { name: "Email Conflict check to all staff", completed: true }, { name: "Follow-up email to client to confirm no conflict", completed: true }], sort_order: 1 },
    { id: "a-pi-2", bucket: "project_intake", name: "Enter into QBO", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-15", checklist_items: [], sort_order: 2 },
    { id: "a-pi-3", bucket: "project_intake", name: "Import project into TSheets", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-16", checklist_items: [], sort_order: 3 },
    { id: "a-pi-4", bucket: "project_intake", name: "Create Project email folder in Outlook", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-16", checklist_items: [], sort_order: 4 },
    { id: "a-pi-5", bucket: "project_intake", name: "Create Project folder in SharePoint", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-16", checklist_items: [], sort_order: 5 },
    { id: "a-pi-6", bucket: "project_intake", name: "Download Provided Docs", description: null, status: "in_progress", assigned_to: "John Harrison", initials: "JH", due_date: "2026-02-18", checklist_items: [], sort_order: 6 },
    { id: "a-pi-7", bucket: "project_intake", name: "Create Channel", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-16", checklist_items: [{ name: "Create channel in Teams", completed: true }, { name: "Add Project info sheet", completed: true }], sort_order: 7 },
    { id: "a-pi-8", bucket: "project_intake", name: "Authorization Received", description: null, status: "in_progress", assigned_to: "John Harrison", initials: "JH", due_date: "2026-02-20", checklist_items: [{ name: "Authorization received from client", completed: true }, { name: "Assignment Acceptance email", completed: false }], sort_order: 8 },
    // Execution
    { id: "a-ex-1", bucket: "execution", name: "Assign PIC", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-17", checklist_items: [], sort_order: 1 },
    { id: "a-ex-2", bucket: "execution", name: "Assign Team Lead", description: null, status: "completed", assigned_to: "Tim Reynolds", initials: "TR", due_date: "2026-02-17", checklist_items: [], sort_order: 2 },
    { id: "a-ex-3", bucket: "execution", name: "Sort/Date Docs", description: null, status: "in_progress", assigned_to: "Sarah Chen", initials: "SC", due_date: "2026-02-22", checklist_items: [{ name: "Extract and label, date docs, pdf", completed: true }, { name: "List in received docs spreadsheet", completed: false }, { name: "Upload to Dropbox; forward link to OA", completed: false }], sort_order: 3 },
    { id: "a-ex-4", bucket: "execution", name: "Project Kickoff Meeting", description: null, status: "not_started", assigned_to: "John Harrison", initials: "JH", due_date: "2026-02-20", checklist_items: [{ name: "DFCG's scope of work", completed: false }, { name: "Scope of Repair", completed: false }, { name: "Work Product", completed: false }, { name: "Milestones", completed: false }, { name: "Review provided docs", completed: false }, { name: "Site Visit contact person", completed: false }], sort_order: 4 },
    { id: "a-ex-5", bucket: "execution", name: "Draft Project Milestones", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 5 },
    { id: "a-ex-6", bucket: "execution", name: "Appraisal Tasks", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Contact Opposing Appraiser", completed: false }, { name: "Umpire agreement", completed: false }, { name: "Signed DoA", completed: false }, { name: "Schedule Site Visit", completed: false }], sort_order: 6 },
    { id: "a-ex-7", bucket: "execution", name: "Schedule Site Visit/Logistics", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "LOGISTICS - staffing, travel, flights, rentals, hotels, per diem, etc.", completed: false }, { name: "Tool/equipment transport", completed: false }], sort_order: 7 },
    { id: "a-ex-8", bucket: "execution", name: "Download Aerials/Streetview", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Eagleview", completed: false }, { name: "Google Earth", completed: false }, { name: "Google Streetview", completed: false }, { name: "Other sources", completed: false }], sort_order: 8 },
    { id: "a-ex-9", bucket: "execution", name: "Order ACT Roof measurements", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 9 },
    { id: "a-ex-10", bucket: "execution", name: "Site Visit Prep meeting", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Site Maps", completed: false }, { name: "Review equipment requirements", completed: false }, { name: "Staffing", completed: false }, { name: "Review Logistics", completed: false }], sort_order: 10 },
    { id: "a-ex-11", bucket: "execution", name: "SITE VISIT (initial)", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Drone", completed: false }, { name: "3D camera", completed: false }, { name: "Infrared Camera", completed: false }, { name: "Logistics", completed: false }, { name: "Other Equipment", completed: false }, { name: "Ladder(s)", completed: false }], sort_order: 11 },
    { id: "a-ex-12", bucket: "execution", name: "Misc. Research", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "As assigned", completed: false }], sort_order: 12 },
    // Milestones
    { id: "a-ms-1", bucket: "milestones", name: "Project Kickoff Scheduled", description: "Within 5 days of project intake", status: "not_started", assigned_to: null, initials: null, due_date: "2026-02-20", checklist_items: [], sort_order: 1 },
    { id: "a-ms-2", bucket: "milestones", name: "Site Visit Scheduled", description: "Within 14 days of project intake", status: "not_started", assigned_to: null, initials: null, due_date: "2026-03-01", checklist_items: [], sort_order: 2 },
    { id: "a-ms-3", bucket: "milestones", name: "Work Product Completed for QA/QC", description: "Within 14 days of Site Visit", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 3 },
    { id: "a-ms-4", bucket: "milestones", name: "Upload and sort photos/site data", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 4 },
    { id: "a-ms-5", bucket: "milestones", name: "Issue Work Product", description: "Within 30 days of Project Intake", status: "not_started", assigned_to: null, initials: null, due_date: "2026-03-17", checklist_items: [], sort_order: 5 },
    { id: "a-ms-6", bucket: "milestones", name: "Rebuttals", description: "Within 7 days of receipt", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 6 },
    { id: "a-ms-7", bucket: "milestones", name: "Project Closeout", description: "Within 45 days of Project Intake", status: "not_started", assigned_to: null, initials: null, due_date: "2026-04-01", checklist_items: [], sort_order: 7 },
    { id: "a-ms-8", bucket: "milestones", name: "Legal Appearance", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Deposition", completed: false }, { name: "Trial", completed: false }, { name: "Arbitration/Mediation", completed: false }, { name: "Expert Designation", completed: false }], sort_order: 8 },
    // Closeout
    { id: "a-cl-1", bucket: "closeout", name: "Final Billing", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 1 },
    { id: "a-cl-2", bucket: "closeout", name: "Project Post-mortem", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 2 },
    { id: "a-cl-3", bucket: "closeout", name: "Closeout", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Confirm final billing", completed: false }, { name: "Sort/collate all documents in project file", completed: false }, { name: "Move to .Archived files in SharePoint", completed: false }, { name: "Leave QBO Project Status as \"In Progress\" until all invoices have been paid", completed: false }, { name: "Mark 'end date' in QBO", completed: false }], sort_order: 3 },
  ]);
}

export function generateGeneralTasks(): MockTask[] {
  return withCompletedDate([
    // Project Intake
    { id: "g-pi-1", bucket: "project_intake", name: "Conflict Check", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Create conflict check", completed: false }, { name: "Email Conflict check to all staff", completed: false }, { name: "Follow-up email to client to confirm no conflict", completed: false }], sort_order: 1 },
    { id: "g-pi-2", bucket: "project_intake", name: "Create Project in QBO", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 2 },
    { id: "g-pi-3", bucket: "project_intake", name: "Import project into TSheets", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 3 },
    { id: "g-pi-4", bucket: "project_intake", name: "Create Project email folder in Outlook", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 4 },
    { id: "g-pi-5", bucket: "project_intake", name: "Create Project folder in SharePoint", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 5 },
    { id: "g-pi-6", bucket: "project_intake", name: "Download Provided Docs", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 6 },
    { id: "g-pi-7", bucket: "project_intake", name: "Create Channel", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Create channel in Teams", completed: false }, { name: "Add Project info sheet", completed: false }], sort_order: 7 },
    { id: "g-pi-8", bucket: "project_intake", name: "Authorization Received", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Authorization received from client", completed: false }, { name: "Assignment Acceptance email sent", completed: false }], sort_order: 8 },
    { id: "g-pi-9", bucket: "project_intake", name: "Engagement Agreement", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Create EA/approval", completed: false }, { name: "Signed EA received", completed: false }, { name: "EA sent", completed: false }], sort_order: 9 },
    { id: "g-pi-10", bucket: "project_intake", name: "Retainer Invoice?", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Create retainer invoice/approved", completed: false }, { name: "Retainer invoice sent", completed: false }, { name: "Close task when payment received", completed: false }, { name: "Retainer amount $$$", completed: false }], sort_order: 10 },
    { id: "g-pi-11", bucket: "project_intake", name: "Project Budget", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Scope of assignment", completed: false }, { name: "Client Approval", completed: false }, { name: "Send budget to client", completed: false }], sort_order: 11 },
    // Milestones
    { id: "g-ms-1", bucket: "milestones", name: "Project Kickoff Scheduled", description: "Within 5 days of project intake", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 1 },
    { id: "g-ms-2", bucket: "milestones", name: "Site Visit Scheduled", description: "Within 14 days of project intake", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 2 },
    { id: "g-ms-3", bucket: "milestones", name: "Work Product Completed for QA/QC", description: "Within 14 days of Site Visit", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 3 },
    { id: "g-ms-4", bucket: "milestones", name: "Upload and sort photos/site data", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 4 },
    { id: "g-ms-5", bucket: "milestones", name: "Issue Work Product", description: "Within 30 days of Project Intake", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 5 },
    { id: "g-ms-6", bucket: "milestones", name: "Rebuttals", description: "Within 7 days of receipt", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 6 },
    { id: "g-ms-7", bucket: "milestones", name: "Project Closeout", description: "Within 45 days of Project Intake", status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 7 },
    { id: "g-ms-8", bucket: "milestones", name: "Legal Appearance", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Deposition", completed: false }, { name: "Trial", completed: false }, { name: "Arbitration/Mediation", completed: false }, { name: "Expert Designation", completed: false }], sort_order: 8 },
    // Closeout
    { id: "g-cl-1", bucket: "closeout", name: "Final Billing", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 1 },
    { id: "g-cl-2", bucket: "closeout", name: "Project Post-mortem", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [], sort_order: 2 },
    { id: "g-cl-3", bucket: "closeout", name: "Closeout", description: null, status: "not_started", assigned_to: null, initials: null, due_date: null, checklist_items: [{ name: "Confirm final billing", completed: false }, { name: "Sort/collate all documents in project file", completed: false }, { name: "Move to .Archived files in SharePoint", completed: false }, { name: "Leave QBO Project Status as \"In Progress\" until all invoices have been paid", completed: false }, { name: "Mark 'end date' in QBO", completed: false }], sort_order: 3 },
  ]);
}

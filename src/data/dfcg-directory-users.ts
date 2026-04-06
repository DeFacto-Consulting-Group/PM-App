import type { UserRole } from "@/types/index";

/**
 * Team directory aligned with `Work/DeFactoProject/DFCG users.xlsx` (Sheet1).
 * Used as mock data when Supabase env is not set, and as the canonical list
 * for `npm run import:users` (same people; import reads the xlsx directly).
 */
export type DfcgDirectoryUserRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  role: UserRole;
  status: "active" | "inactive";
  initials: string;
};

export const DFCG_DIRECTORY_USERS: DfcgDirectoryUserRow[] = [
  {
    id: "dfcg-local-tlozos",
    first_name: "Timothy",
    last_name: "Lozos",
    email: "tlozos@dfcg.net",
    phone_number: "(817) 269-4799",
    role: "pic",
    status: "active",
    initials: "TL",
  },
  {
    id: "dfcg-local-sbillingsley",
    first_name: "Shasta",
    last_name: "Billingsley",
    email: "sbillingsley@dfcg.net",
    phone_number: "(210) 667-1674",
    role: "admin",
    status: "active",
    initials: "SB",
  },
  {
    id: "dfcg-local-jlozos",
    first_name: "James",
    last_name: "Lozos",
    email: "jameslozos@dfcg.net",
    phone_number: "(847) 418-1334",
    role: "admin",
    status: "active",
    initials: "JL",
  },
  {
    id: "dfcg-local-slozos",
    first_name: "Stephanie",
    last_name: "Lozos",
    email: "slozos@dfcg.net",
    phone_number: "(512) 947-9053",
    role: "guest",
    status: "active",
    initials: "SL",
  },
  {
    id: "dfcg-local-wwyll",
    first_name: "Wendy",
    last_name: "Wyll",
    email: "wwyll@dfcg.net",
    phone_number: "(580) 585-7137",
    role: "project_manager",
    status: "active",
    initials: "WW",
  },
  {
    id: "dfcg-local-bmcdermott",
    first_name: "Brandon",
    last_name: "McDermott",
    email: "bmcdermott@dfcg.net",
    phone_number: "(817) 905-0840",
    role: "pic",
    status: "active",
    initials: "BM",
  },
  {
    id: "dfcg-local-rcudworth",
    first_name: "Rogan",
    last_name: "Cudworth",
    email: "rcudworth@dfcg.net",
    phone_number: "(970) 581-5800",
    role: "pic",
    status: "active",
    initials: "RC",
  },
  {
    id: "dfcg-local-cm",
    first_name: "Crystal",
    last_name: "McDermott",
    email: "crystal@dfcg.net",
    phone_number: "(940) 395-5474",
    role: "admin",
    status: "active",
    initials: "CM",
  },
];

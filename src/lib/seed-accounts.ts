import type { Account } from "@/types/index";
import { getLocalAccounts } from "@/lib/local-accounts";

export const seedAccounts: Account[] = [
  { id: "acct-01", name: "Allied World Insurance Company", billing_address: "1690 New Britain Avenue, Suite 101, Farmington, CT, 06032", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-02", name: "American Modern", billing_address: "7000 Midland Blvd, Amelia, OH, 45102", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-03", name: "American Risk Insurance Company, Inc.", billing_address: "4669 Southwest Fwy, Ste 700, Houston, TX, 77027", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-04", name: "Bell Nunnally", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-05", name: "Burns Charest LLP", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-06", name: "Chaffe McCall LLP", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-07", name: "Chartwell Law", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-08", name: "Chubb", billing_address: "1 Beaver Valley Rd, Wilmington, DE, 19803", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-09", name: "Cozen O'Connor", billing_address: "1717 Main Street, Suite 3100, Dallas, TX, 75201", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-10", name: "Crawford Global Technical Services", billing_address: "1503 LBJ Freeway, Suite 600, Dallas, TX, 75234", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-11", name: "Eberl Claims Service - CO", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-12", name: "Engle Martin and Associates", billing_address: "45 NE Interstate 410 Loop, Suite 690, San Antonio, TX, 78216", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-13", name: "Federated Mutual Insurance Company", billing_address: "PO Box 486, Owatonna, MN, 55060", main_phone: "800-533-0472", account_type: "customer", account_status: "active" },
  { id: "acct-14", name: "Field Manning Stone Aycock", billing_address: "2112 Indiana Ave, Lubbock, TX, 79410", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-15", name: "Fletcher Farley Shipman and Salinas - Dallas", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-16", name: "Forensic Consulting LLC", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-17", name: "Guardian Association Management", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-18", name: "Guilday Law, P.A.", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-19", name: "Gulf Coast Claims Service", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-20", name: "Hermes Law, P.C.", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-21", name: "K2 Claims Services LLC", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-22", name: "Kahana and Feld LLP", billing_address: "7600 Chevy Chase Dr., Suite 300, Austin, TX, 78752", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-23", name: "Kathleen Clement", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-24", name: "King and Spalding LLP", billing_address: "1100 Louisiana St, #4100, Houston, TX, 77002", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-25", name: "Lovein, Ribman, P.C.", billing_address: "1225 S Main St, Suite 200, Grapevine, TX, 76051", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-26", name: "Macdonald Devin Madden Kenefick and Harris, P.C.", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-27", name: "Martin Disiere Jefferson and Wisdom - Dallas", billing_address: "9111 Cypress Waters Blvd, #250, Coppell, TX, 75019", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-28", name: "Martin Disiere Jefferson and Wisdom - Houston", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-29", name: "Martin Disiere Jefferson and Wisdom - San Antonio", billing_address: "11467 Huebner Rd, Suite 175, San Antonio, TX, 78230", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-30", name: "Nationwide", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-31", name: "North American Risk Services", billing_address: "P.O. Box 166002, Altamonte Springs, FL, 32716", main_phone: "1-800-315-6090", account_type: "customer", account_status: "active" },
  { id: "acct-32", name: "Pappas Grubbs Price PC", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-33", name: "Parsons Lee and Juliano", billing_address: "600 Vestavia Pkwy, #300, Birmingham, AL, 35216", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-34", name: "Patriot Consulting", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-35", name: "Porter Law Firm", billing_address: "2603 Augusta Dr, Ste 900, Houston, TX, 77057", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-36", name: "Red Sky Holdings", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-37", name: "Round Table Group", billing_address: "1 N Dearborn St, Chicago, IL, 60602", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-38", name: "Segal McCambridge Singer and Mahoney, Ltd.", billing_address: "100 Congress Avenue, Suite 800, Austin, TX, 78701", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-39", name: "Shackelford, McKinley & Norton, LLP", billing_address: "9201 N Central Expy 4th, Floor, Dallas, TX, 78231", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-40", name: "The Chapman Firm, PLLC", billing_address: "3410 Far W Blvd, # 210, Austin, TX, 78731", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-41", name: "The Cincinnati Insurance Companies", billing_address: "6200 S Gilmore Rd, Fairfield, OH, 45014", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-42", name: "Thompson Coe Cousins and Irons - Austin", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-43", name: "Thompson Coe Cousins and Irons - Dallas", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-44", name: "Thompson Coe Cousins and Irons - Houston", billing_address: "4400 Post Oak Pkwy, Suite 1000, Houston, TX, 77027", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-45", name: "Tollefson Bradley Mitchell and Melendi LLP", billing_address: "2811 McKinney Ave, #250, Dallas, TX, 75204", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-46", name: "Travis y Human Resources Management Department", billing_address: "", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-47", name: "Vernis and Bowling", billing_address: "618 US Highway One, Suite 200, North Palm Beach, FL, 33408", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-48", name: "Walters Balido and Crain - Austin", billing_address: "9020 North Capital of Texas Highway, Building I, Suite 170, Austin, TX, 78759", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-49", name: "Walters Balido and Crain - Dallas", billing_address: "10440 North Central Expressway 15th, Floor, Dallas, TX, 75231", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-50", name: "Wilson Elser Moskowitz Edelman and Dicker LLP", billing_address: "2407 S. Congress Ave Suite E-399, Austin, TX, 78704", main_phone: "", account_type: "customer", account_status: "active" },
  { id: "acct-51", name: "Zelle LLP", billing_address: "901 Main Street, Suite 4000, Dallas, TX, 75202", main_phone: "1-214-742-3000", account_type: "customer", account_status: "active" },
];

export function getAccountById(id: string): Account | undefined {
  const fromSeed = seedAccounts.find((a) => a.id === id);
  if (fromSeed) return fromSeed;
  return getLocalAccounts().find((a) => a.id === id);
}

export function getAllAccounts(): Account[] {
  return [...seedAccounts, ...getLocalAccounts()];
}


/**
 * Reads data/Active Accounts - Contacts (fuzzy).xlsx, fuzzy-matches Account name
 * to src/lib/mock-accounts.ts, writes src/data/account-contacts-seed.ts
 *
 * Usage: npm run import:contacts
 * Env: CONTACTS_XLSX=path/to/file.xlsx (optional)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import xlsxPkg from "xlsx";

const XLSX = xlsxPkg.default ?? xlsxPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const DEFAULT_XLSX = path.join(
  projectRoot,
  "data",
  "Active Accounts - Contacts (fuzzy).xlsx"
);
const MOCK_ACCOUNTS_PATH = path.join(projectRoot, "src", "lib", "mock-accounts.ts");
const OUT_SEED = path.join(projectRoot, "src", "data", "account-contacts-seed.ts");
const OUT_UNMATCHED = path.join(projectRoot, "data", "unmatched-contacts-import.json");

/** Manual fixes when fuzzy match is wrong or spreadsheet uses a different label */
const ACCOUNT_NAME_ALIASES = {
  "nationwide mutual insurance company": "Nationwide",
};

function parseMockAccounts(ts) {
  const accounts = [];
  const re = /\{\s*id:\s*"([^"]+)",\s*name:\s*"((?:[^"\\]|\\.)*)"/g;
  let m;
  while ((m = re.exec(ts))) {
    let name = m[2].replace(/\\"/g, '"');
    accounts.push({ id: m[1], name });
  }
  return accounts;
}

function normalize(s) {
  if (!s || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b(llc|llp|llp|pc|pa|pllc|inc|corp|ltd)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array(n + 1)
    .fill(0)
    .map((_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function findAccountId(rawAccountName, mockAccounts) {
  const trimmed = String(rawAccountName || "").trim();
  if (!trimmed) return null;

  const aliasTarget = ACCOUNT_NAME_ALIASES[normalize(trimmed)];
  if (aliasTarget) {
    const hit = mockAccounts.find((a) => a.name === aliasTarget);
    if (hit) return { id: hit.id, name: hit.name, method: "alias" };
  }

  const nq = normalize(trimmed);
  for (const a of mockAccounts) {
    if (normalize(a.name) === nq) {
      return { id: a.id, name: a.name, method: "exact" };
    }
  }

  let best = null;
  let bestScore = Infinity;
  for (const a of mockAccounts) {
    const na = normalize(a.name);
    const d = levenshtein(nq, na);
    const maxLen = Math.max(nq.length, na.length, 1);
    const ratio = d / maxLen;
    if (ratio < bestScore) {
      bestScore = ratio;
      best = a;
    }
  }

  const THRESHOLD = 0.22;
  if (best && bestScore <= THRESHOLD) {
    return { id: best.id, name: best.name, method: `fuzzy(${bestScore.toFixed(3)})` };
  }

  return null;
}

function cellStr(v) {
  if (v == null || v === undefined) return "";
  if (typeof v === "number") return String(v);
  return String(v).trim();
}

function buildPhone(main, ext, direct, mobile) {
  const mainS = cellStr(main);
  const extS = cellStr(ext);
  const directS = cellStr(direct);
  const mobileS = cellStr(mobile);

  let primary = directS || mobileS || mainS;
  if (mainS && extS && !directS && !mobileS) {
    primary = `${mainS} ext ${extS}`;
  }

  const extras = [];
  if (directS && primary !== directS && !primary.includes(directS)) extras.push(`Direct ${directS}`);
  if (mainS && primary !== mainS && !primary.includes(mainS)) extras.push(`Main ${mainS}`);
  if (extS && !primary.includes(extS)) extras.push(`Ext ${extS}`);
  if (mobileS && primary !== mobileS && !primary.includes(mobileS)) extras.push(`Mobile ${mobileS}`);

  return { phone: primary, phoneNotes: extras.length ? extras.join(" · ") : "" };
}

function main() {
  const xlsxPath = process.env.CONTACTS_XLSX || DEFAULT_XLSX;
  if (!fs.existsSync(xlsxPath)) {
    console.error("Missing:", xlsxPath);
    process.exit(1);
  }

  const mockTs = fs.readFileSync(MOCK_ACCOUNTS_PATH, "utf8");
  const mockAccounts = parseMockAccounts(mockTs);
  if (mockAccounts.length === 0) {
    console.error("No accounts parsed from mock-accounts.ts");
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  if (rows.length === 0) {
    console.error("No rows in sheet");
    process.exit(1);
  }

  const headerKeys = Object.keys(rows[0]);
  const lower = (k) => k.toLowerCase().trim();

  /** Prefer exact header match (avoids "name" matching "Account name") */
  function colExact(...exactNames) {
    for (const ex of exactNames) {
      const hit = headerKeys.find((h) => lower(h) === ex);
      if (hit) return hit;
    }
    return null;
  }

  const cAccount = colExact("account name");
  const cName = colExact("name");
  const cTitle = colExact("title");
  const cEmail = colExact("email");
  const cMain = colExact("main phone");
  const cExt = colExact("main extension");
  const cDirect = colExact("direct phone");
  const cMobile = colExact("mobile phone");
  const cAddress = colExact("mailing address");

  if (!cAccount || !cName) {
    console.error("Could not find Account name / Name columns. Headers:", headerKeys);
    process.exit(1);
  }

  const contacts = [];
  const unmatched = [];
  const stats = { exact: 0, fuzzy: 0, alias: 0 };

  let rowNum = 2;
  for (const row of rows) {
    const accountRaw = cellStr(row[cAccount]);
    const fullName = cellStr(row[cName]);
    if (!accountRaw && !fullName) {
      rowNum++;
      continue;
    }
    if (!fullName) {
      unmatched.push({ row: rowNum, reason: "missing name", account: accountRaw });
      rowNum++;
      continue;
    }

    const match = findAccountId(accountRaw, mockAccounts);
    if (!match) {
      unmatched.push({ row: rowNum, account: accountRaw, name: fullName });
      rowNum++;
      continue;
    }

    if (match.method === "exact") stats.exact++;
    else if (match.method === "alias") stats.alias++;
    else stats.fuzzy++;

    const title = cTitle ? cellStr(row[cTitle]) : "";
    const email = cEmail ? cellStr(row[cEmail]) : "";
    const { phone, phoneNotes } = buildPhone(
      cMain ? row[cMain] : "",
      cExt ? row[cExt] : "",
      cDirect ? row[cDirect] : "",
      cMobile ? row[cMobile] : ""
    );
    const address = cAddress ? cellStr(row[cAddress]) : "";
    const notes = phoneNotes;

    const contact = {
      id: `seed-${match.id}-${rowNum}`,
      account_id: match.id,
      full_name: fullName,
      title,
      email,
      phone,
      address,
      notes,
    };
    contacts.push(contact);
    rowNum++;
  }

  fs.mkdirSync(path.dirname(OUT_SEED), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_UNMATCHED), { recursive: true });

  const tsBody = `import type { Contact } from "@/types/index";

/**
 * Generated by scripts/import-account-contacts.mjs — do not edit by hand.
 * Re-run: npm run import:contacts
 */
export const ACCOUNT_CONTACTS_SEED: Contact[] = ${JSON.stringify(contacts, null, 2)};
`;

  fs.writeFileSync(OUT_SEED, tsBody, "utf8");
  fs.writeFileSync(OUT_UNMATCHED, JSON.stringify(unmatched, null, 2), "utf8");

  console.log("Wrote", OUT_SEED);
  console.log("Contacts:", contacts.length);
  console.log("Match stats:", stats);
  console.log("Unmatched:", unmatched.length, "->", OUT_UNMATCHED);
  if (unmatched.length) {
    console.log(unmatched.slice(0, 15));
  }
}

main();

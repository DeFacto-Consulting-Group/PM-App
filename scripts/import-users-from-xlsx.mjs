/**
 * Sync users from DFCG users.xlsx into Supabase Auth + public.profiles.
 *
 * Spreadsheet columns: Name, email, Phone number, role, status
 *
 * Usage:
 *   npm run import:users -- --dry-run
 *   npm run import:users
 *   USERS_XLSX="C:\\path\\to\\file.xlsx" npm run import:users
 *
 * New Auth users are created with a random password (not printed). They should use
 * Forgot password on the login screen, unless you set a password in the Dashboard.
 *
 * Env (same as app; service role required for admin API):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import xlsxPkg from "xlsx";

const XLSX = xlsxPkg.default ?? xlsxPkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const DEFAULT_XLSX = path.join(projectRoot, "..", "DFCG users.xlsx");

const ROLE_MAP = {
  admin: "admin",
  "project manager": "project_manager",
  "project-manager": "project_manager",
  "professional-in-charge": "pic",
  pic: "pic",
  guest: "guest",
};

const STATUS_MAP = {
  active: "active",
  inactive: "inactive",
};

function normalizeRole(raw) {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const mapped = ROLE_MAP[k] ?? ROLE_MAP[String(raw ?? "").trim().toLowerCase()];
  if (!mapped) {
    throw new Error(`Unknown role "${raw}". Use Admin, Guest, Project Manager, or Professional-in-Charge.`);
  }
  return mapped;
}

function normalizeStatus(raw) {
  const k = String(raw ?? "")
    .trim()
    .toLowerCase();
  const s = STATUS_MAP[k];
  if (!s) {
    throw new Error(`Unknown status "${raw}". Use Active or Inactive.`);
  }
  return s;
}

function splitName(full) {
  const t = String(full ?? "").trim();
  if (!t) throw new Error("Empty Name");
  const parts = t.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: "" };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function formatPhone(value) {
  if (value == null || value === "") return null;
  const d = String(value).replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) {
    return formatPhone(d.slice(1));
  }
  return String(value).trim() || null;
}

function loadEnvLocal() {
  const p = path.join(projectRoot, ".env.local");
  if (!fs.existsSync(p)) return;
  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function findAuthUserByEmail(admin, email) {
  const target = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function upsertProfile(admin, row) {
  const { error } = await admin.from("profiles").upsert(row, { onConflict: "id" });
  if (error) throw error;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!dryRun && (!url?.startsWith("http") || !serviceKey)) {
    console.error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or add them to .env.local)."
    );
    process.exit(1);
  }

  const xlsxPath = process.env.USERS_XLSX
    ? path.resolve(process.env.USERS_XLSX)
    : DEFAULT_XLSX;

  if (!fs.existsSync(xlsxPath)) {
    console.error(`File not found: ${xlsxPath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

  const admin = dryRun
    ? null
    : createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

  console.log(`Source: ${xlsxPath}`);
  console.log(dryRun ? "DRY RUN — no changes\n" : "Applying changes…\n");

  for (const raw of rows) {
    const name = raw["Name"] ?? raw["name"];
    const emailRaw = raw["email"] ?? raw["Email"];
    if (!name && !emailRaw) continue;

    let email;
    try {
      email = String(emailRaw ?? "")
        .trim()
        .toLowerCase();
      if (!email.includes("@")) throw new Error("bad email");

      const { first_name, last_name } = splitName(name);
      const phone_number = formatPhone(raw["Phone number"] ?? raw["phone number"]);
      const role = normalizeRole(raw["role"] ?? raw["Role"]);
      const status = normalizeStatus(raw["status"] ?? raw["Status"]);

      const payload = {
        first_name,
        last_name,
        email,
        phone_number,
        role,
        status,
      };

      if (dryRun) {
        console.log(JSON.stringify({ action: "upsert", ...payload }, null, 2));
        continue;
      }

      const { data: existingProfile, error: selErr } = await admin
        .from("profiles")
        .select("id, email")
        .ilike("email", email)
        .maybeSingle();

      if (selErr) throw selErr;

      let userId = existingProfile?.id;

      if (!userId) {
        const randomPassword = () => crypto.randomBytes(24).toString("base64url");
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: randomPassword(),
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            phone_number,
          },
        });

        if (createErr) {
          const msg = createErr.message ?? "";
          if (/already|registered|exists|duplicate/i.test(msg)) {
            const authUser = await findAuthUserByEmail(admin, email);
            if (!authUser) {
              console.error(`Could not resolve existing user for ${email}: ${msg}`);
              continue;
            }
            userId = authUser.id;
          } else {
            throw createErr;
          }
        } else if (created?.user?.id) {
          userId = created.user.id;
        } else {
          throw new Error(`createUser returned no user for ${email}`);
        }
      }

      if (existingProfile?.email && existingProfile.email.toLowerCase() !== email) {
        const { error: authUp } = await admin.auth.admin.updateUserById(userId, {
          email,
          user_metadata: {
            first_name,
            last_name,
            phone_number,
          },
        });
        if (authUp) throw authUp;
      } else if (userId) {
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            first_name,
            last_name,
            phone_number,
          },
        });
      }

      await upsertProfile(admin, {
        id: userId,
        first_name,
        last_name,
        email,
        phone_number,
        role,
        status,
      });

      console.log(`OK: ${email} (${role})`);
    } catch (e) {
      console.error(`FAIL: ${emailRaw}`, e.message ?? e);
    }
  }

  if (!dryRun) console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

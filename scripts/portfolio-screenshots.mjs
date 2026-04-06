/**
 * Portfolio-ready full-page screenshots of the DFCG PM app.
 *
 * Prerequisites:
 *   1. Dev server running: npm run dev  (default http://localhost:3000)
 *   2. Browsers once: npx playwright install chromium
 *
 * Usage:
 *   npm run screenshots
 *   BASE_URL=http://127.0.0.1:3000 npm run screenshots
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");
const outDir = path.join(projectRoot, "portfolio-screenshots");

const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

/** @type {{ path: string; name: string; waitMs?: number }[]} */
const routes = [
  { path: "/", name: "01-dashboard" },
  { path: "/projects", name: "02-projects-list" },
  { path: "/projects?status=pending_ea_retainer_auth", name: "03-projects-filter-pending-ea" },
  { path: "/projects/new", name: "04-new-project-form" },
  { path: "/projects/0001-2026", name: "05-project-detail" },
  { path: "/projects/0001-2026/edit", name: "06-project-edit" },
  { path: "/tasks", name: "07-tasks-kanban" },
  { path: "/task-templates", name: "08-task-templates" },
  { path: "/project-status-workflow", name: "09-status-workflow" },
];

async function main() {
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const route of routes) {
    const url = `${baseUrl}${route.path.startsWith("/") ? "" : "/"}${route.path}`;
    process.stdout.write(`Capturing ${route.name} … `);
    try {
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(route.waitMs ?? 800);
      const file = path.join(outDir, `${route.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
    } catch (e) {
      console.log("FAILED", e instanceof Error ? e.message : e);
    }
  }

  await browser.close();
  console.log(`\nDone. PNGs in: ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

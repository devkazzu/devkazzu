import { test, expect, request as requestFactory, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, eq, inArray, like } from "drizzle-orm";
import { db, pool } from "../src/db";
import { activityLogs, adminUsers, categories, content, homepageSections, media, messages, rateLimits, siteSettings, socialLinks, technologies } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import type { SiteSettings } from "../src/lib/types";
const baseURL = process.env.TEST_BASE_URL || "http://localhost:3000";
const token = randomBytes(5).toString("hex"); const prefix = `QA ${token}`; const email = `qa-${token}@devkazzu.test`; const password = randomBytes(24).toString("base64url");
let ownerId = 0; let ownerApi: APIRequestContext; let publicApi: APIRequestContext; let mainId = 0; let uploadId = 0; const ids: number[] = [];
const slug = `qa-${token}`;
const payload = { kind: "project", title: `${prefix} project`, slug, description: "A real integration-test project that is removed after verification.", body: "A persisted description for end-to-end validation.", categoryId: null, technologies: ["React", "TypeScript"], tags: ["QA"], coverImage: "", screenshots: [], githubUrl: "", liveUrl: "", downloadUrl: "", status: "Completed", featured: false, published: false, position: 999, icon: "code", accent: "violet" };
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => {
  const owners = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
  if (owners.length) throw new Error("Integration tests require an isolated database with no real owner. They will never replace an existing owner.");
  const [owner] = await db.insert(adminUsers).values({ name: "QA Owner", email, passwordHash: await hashPassword(password) }).returning({ id: adminUsers.id }); ownerId = owner.id;
  ownerApi = await requestFactory.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } }); publicApi = await requestFactory.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } });
});
test.afterAll(async () => {
  if (ids.length) await db.delete(content).where(inArray(content.id, ids));
  await db.delete(content).where(like(content.slug, `qa-${token}%`));
  await db.delete(messages).where(like(messages.subject, `${prefix}%`));
  if (uploadId) await db.delete(media).where(eq(media.id, uploadId));
  await db.delete(categories).where(like(categories.name, `${prefix}%`)); await db.delete(technologies).where(like(technologies.name, `${prefix}%`)); await db.delete(socialLinks).where(like(socialLinks.label, `${prefix}%`));
  if (ownerId) { await db.delete(activityLogs).where(eq(activityLogs.userId, ownerId)); await db.delete(adminUsers).where(eq(adminUsers.id, ownerId)); await db.delete(rateLimits); }
  await ownerApi?.dispose(); await publicApi?.dispose(); await pool.end();
});
test.beforeEach(async ({ page }) => { const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message)); page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); }); (page as unknown as { runtimeErrors: string[] }).runtimeErrors = errors; });
test.afterEach(async ({ page }) => { expect((page as unknown as { runtimeErrors: string[] }).runtimeErrors).toEqual([]); });

test("public website, all collection routes, SEO and original artwork load", async ({ page }) => {
  await page.goto("/"); await expect(page.locator("h1")).toContainText("Building ideas into"); await expect(page.getByRole("link", { name: "Explore projects", exact: true })).toBeVisible();
  await page.locator(".project-cover img").first().waitFor(); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: "/tmp/devkazzu-home.png", fullPage: false });
  for (const route of ["/projects", "/applications", "/tools", "/experiments", "/about", "/skills", "/contact"]) { const response = await publicApi.get(route); expect(response.status(), route).toBe(200); }
  expect((await publicApi.get("/api/health")).ok()).toBeTruthy(); expect((await publicApi.get("/sitemap.xml")).status()).toBe(200); expect((await publicApi.get("/robots.txt")).status()).toBe(200); expect((await publicApi.get("/does-not-exist")).status()).toBe(404);
});

test("owner login works and unauthorized / cross-origin writes are blocked", async ({ page }) => {
  expect((await publicApi.get("/admin")).url()).toContain("/admin/login");
  expect((await publicApi.post("/api/admin/content", { data: payload })).status()).toBe(401);
  expect((await publicApi.post("/api/auth", { data: { email, password: "wrong-password" } })).status()).toBe(401);
  const login = await ownerApi.post("/api/auth", { data: { email, password } }); expect(login.status()).toBe(200);
  expect((await ownerApi.post("/api/admin/content", { headers: { Origin: "https://evil.example" }, data: payload })).status()).toBe(403);
  await page.goto("/admin/login"); await page.getByLabel("Owner email").fill(email); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Enter workspace" }).click(); await expect(page).toHaveURL(/\/admin$/); await expect(page.getByRole("heading", { name: "Your creative overview." })).toBeVisible();
  await page.screenshot({ path: "/tmp/devkazzu-admin.png", fullPage: false });
  expect(await page.content()).not.toContain(password);
});

test("project CRUD persists, drafts stay private, publishing updates public search", async ({ page }) => {
  const created = await ownerApi.post("/api/admin/content", { data: payload }); expect(created.status()).toBe(201); mainId = (await created.json()).data.id; ids.push(mainId);
  expect((await publicApi.get(`/projects/${slug}`)).status()).toBe(404);
  const [stored] = await db.select().from(content).where(eq(content.id, mainId)); expect(stored.published).toBe(false);
  expect((await ownerApi.put("/api/admin/content", { data: { ...payload, id: mainId, title: `${prefix} published`, published: true } })).status()).toBe(200);
  const live = await publicApi.get(`/projects/${slug}`); expect(live.status()).toBe(200); expect(await live.text()).toContain(`${prefix} published`);
  await page.goto("/projects"); await page.getByRole("textbox", { name: "Search projects" }).fill(token); await expect(page.locator(".catalog .project-card")).toHaveCount(1); await expect(page.locator(".catalog .project-card h3")).toContainText(`${prefix} published`);
  await page.getByLabel("Development status").selectOption("Completed"); await expect(page.locator(".catalog .project-card")).toHaveCount(1); await page.getByLabel("Development status").selectOption("Experimental"); await expect(page.getByText("No discoveries here. Yet.")).toBeVisible();
});

test("real image uploads are validated, draft-private, publishable, and deletion-protected", async () => {
  expect((await publicApi.post("/api/media", { multipart: { file: { name: "no.webp", mimeType: "image/webp", buffer: Buffer.from("no") } } })).status()).toBe(401);
  const invalid = await ownerApi.post("/api/media", { multipart: { file: { name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not an image") } } }); expect(invalid.status()).toBe(400);
  const result = await ownerApi.post("/api/media", { multipart: { folder: "QA", file: { name: `qa-${token}.webp`, mimeType: "image/webp", buffer: await readFile("public/images/zenflow.webp") } } }); expect(result.status()).toBe(201); const uploaded = await result.json(); uploadId = uploaded.id;
  expect((await ownerApi.get(uploaded.url)).status()).toBe(200); expect((await publicApi.get(uploaded.url)).status()).toBe(404);
  expect((await ownerApi.put("/api/admin/content", { data: { ...payload, id: mainId, published: true, coverImage: uploaded.url, screenshots: [uploaded.url] } })).status()).toBe(200);
  const image = await publicApi.get(uploaded.url); expect(image.status()).toBe(200); expect(image.headers()["content-type"]).toBe("image/webp");
  expect((await ownerApi.delete("/api/admin/media", { data: { id: uploadId } })).status()).toBe(409);
  expect((await ownerApi.put("/api/admin/media", { data: { id: uploadId, name: `QA ${token}.webp`, folder: "QA Screenshots" } })).status()).toBe(200);
  await ownerApi.put("/api/admin/content", { data: { ...payload, id: mainId, published: true } }); expect((await ownerApi.delete("/api/admin/media", { data: { id: uploadId } })).status()).toBe(200); uploadId = 0;
});

test("all content kinds, categories, technologies and social links support real CRUD", async () => {
  const categoryResponse = await ownerApi.post("/api/admin/categories", { data: { name: `${prefix} category`, slug: `qa-${token}-category`, kind: "project" } }); expect(categoryResponse.status()).toBe(201); const categoryId = (await categoryResponse.json()).data[0].id;
  const techResponse = await ownerApi.post("/api/admin/technologies", { data: { name: `${prefix} tech`, icon: "code", color: "#bb88dd", group: "QA", proficiency: 80, position: 999 } }); expect(techResponse.status()).toBe(201); const techId = (await techResponse.json()).data[0].id;
  const socialResponse = await ownerApi.post("/api/admin/socials", { data: { label: `${prefix} link`, url: "https://example.com", icon: "globe", position: 999 } }); expect(socialResponse.status()).toBe(201); const socialId = (await socialResponse.json()).data[0].id;
  expect((await ownerApi.put("/api/admin/content", { data: { ...payload, id: mainId, categoryId, technologies: [`${prefix} tech`], published: true } })).status()).toBe(200);
  for (const [kind, collection] of [["application", "applications"], ["tool", "tools"], ["experiment", "experiments"]]) { const next = { ...payload, kind, slug: `qa-${token}-${kind}`, title: `${prefix} ${kind}`, published: true }; const response = await ownerApi.post("/api/admin/content", { data: next }); expect(response.status()).toBe(201); const id = (await response.json()).data.id; ids.push(id); expect((await publicApi.get(`/${collection}/${next.slug}`)).status()).toBe(200); expect((await ownerApi.delete("/api/admin/content", { data: { id } })).status()).toBe(200); expect((await publicApi.get(`/${collection}/${next.slug}`)).status()).toBe(404); }
  for (const [resource, id] of [["categories", categoryId], ["technologies", techId], ["socials", socialId]]) expect((await ownerApi.delete(`/api/admin/${resource}`, { data: { id } })).status()).toBe(200);
});

test("admin entry editor can create, edit and delete a project through the UI", async ({ page }) => {
  await page.context().addCookies((await ownerApi.storageState()).cookies); await page.goto("/admin/projects"); await page.getByRole("button", { name: "New project", exact: true }).click(); const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Title", { exact: true }).fill(`${prefix} UI project`); await dialog.getByLabel("Short description", { exact: true }).fill("Created and published through the real admin editor during browser QA."); await dialog.getByLabel("The full story", { exact: true }).fill("A real browser interaction, a real persisted database record."); await dialog.getByRole("button", { name: "Publish entry", exact: true }).click(); await expect(dialog).not.toBeVisible();
  const row = page.locator(".admin-table tbody tr").filter({ hasText: `${prefix} UI project` }); await expect(row).toBeVisible(); await row.getByRole("button", { name: `Edit ${prefix} UI project`, exact: true }).click(); await page.getByRole("dialog").getByLabel("Title", { exact: true }).fill(`${prefix} UI edited`); await page.getByRole("button", { name: "Save & publish", exact: true }).click(); await expect(page.getByRole("dialog")).not.toBeVisible();
  const edited = page.locator(".admin-table tbody tr").filter({ hasText: `${prefix} UI edited` }); await expect(edited).toBeVisible(); await edited.getByRole("button", { name: `Delete ${prefix} UI edited`, exact: true }).click(); await page.getByRole("button", { name: "Delete permanently", exact: true }).click(); await expect(edited).not.toBeVisible();
});

test("site and homepage changes persist and appear publicly without a rebuild", async () => {
  const [record] = await db.select().from(siteSettings).where(eq(siteSettings.key, "site")); const original = record.value as SiteSettings;
  const [section] = await db.select().from(homepageSections).where(eq(homepageSections.key, "projects"));
  try { expect((await ownerApi.put("/api/admin/settings", { data: { ...original, tagline: `${prefix} live tagline` } })).status()).toBe(200); expect(await (await publicApi.get("/")).text()).toContain(`${prefix} live tagline`); expect((await ownerApi.put("/api/admin/sections", { data: { ...section, title: `${prefix} selected work` } })).status()).toBe(200); expect(await (await publicApi.get("/")).text()).toContain(`${prefix} selected work`); }
  finally { await ownerApi.put("/api/admin/settings", { data: original }); await ownerApi.put("/api/admin/sections", { data: section }); }
});

test("contact validation, spam checks, persistence and inbox actions work", async ({ page }) => {
  const message = { name: "QA Person", email: "qa@example.com", subject: `${prefix} contact`, message: "This is a real integration-test contact message, removed after testing.", startedAt: Date.now() - 5000, website: "" };
  expect((await publicApi.post("/api/contact", { data: { ...message, email: "invalid" } })).status()).toBe(400); expect((await publicApi.post("/api/contact", { data: { ...message, website: "spam" } })).status()).toBe(400); expect((await publicApi.post("/api/contact", { data: message })).status()).toBe(200);
  const [stored] = await db.select().from(messages).where(eq(messages.subject, message.subject)); expect(stored.message).toBe(message.message); expect(stored.status).toBe("unread");
  for (const status of ["read", "archived", "unread"]) expect((await ownerApi.put("/api/admin/messages", { data: { id: stored.id, status } })).status()).toBe(200);
  await page.goto("/contact"); await page.getByLabel("Your name", { exact: true }).fill("Browser QA"); await page.getByLabel("Email address", { exact: true }).fill("qa@example.com"); await page.getByLabel(/What’s on your mind/).fill(`${prefix} browser contact`); await page.getByLabel("Your message", { exact: true }).fill("A contact message delivered using the actual responsive web form."); await page.waitForTimeout(1600); await page.getByRole("button", { name: "Send message", exact: true }).click(); await expect(page.getByText("A new conversation begins.")).toBeVisible();
  await page.context().addCookies((await ownerApi.storageState()).cookies); await page.goto("/admin/messages"); await page.getByRole("button").filter({ hasText: message.subject }).click(); await expect(page.locator(".message-body")).toContainText(message.message); await page.getByRole("button", { name: "Mark as read", exact: true }).click(); await expect(page.locator(".message-detail-top")).toContainText("read"); expect((await ownerApi.delete("/api/admin/messages", { data: { id: stored.id } })).status()).toBe(200);
});

test("developer tools and experiments actually run in the browser", async ({ page }) => {
  await page.goto("/tools/json-studio"); await page.getByLabel("INPUT JSON", { exact: true }).fill('{"works":true,"count":3}'); await page.getByRole("button", { name: "Format JSON", exact: true }).click(); await expect(page.getByLabel("FORMATTED OUTPUT", { exact: true })).toHaveValue('{\n  "works": true,\n  "count": 3\n}'); await page.getByRole("button", { name: "Minify", exact: true }).click(); await expect(page.getByLabel("FORMATTED OUTPUT", { exact: true })).toHaveValue('{"works":true,"count":3}');
  await page.goto("/tools/palette-lab"); await expect(page.locator(".palette-swatches button")).toHaveCount(5); const before = await page.locator(".palette-swatches").textContent(); await page.getByRole("button", { name: "Generate a palette" }).click(); expect(await page.locator(".palette-swatches").textContent()).not.toBe(before);
  await page.goto("/tools/markdown-preview"); await page.getByLabel("YOUR MARKDOWN", { exact: true }).fill("# Safe preview\n<script>window.__qa=1</script>"); await expect(page.locator(".markdown-preview h1")).toHaveText("Safe preview"); expect(await page.evaluate(() => (window as unknown as { __qa?: number }).__qa)).toBeUndefined();
  await page.goto("/experiments/sakura-particles"); await page.getByLabel(/Petal density/).focus(); await page.getByLabel(/Petal density/).press("End"); await expect(page.locator(".experiment-stage .sakura-particles i")).toHaveCount(48); await page.getByRole("button", { name: "Pause", exact: true }).click(); await expect(page.locator(".experiment-stage")).toHaveClass(/paused/); await page.getByRole("button", { name: "Resume", exact: true }).click(); await expect(page.locator(".experiment-stage")).not.toHaveClass(/paused/);
});

test("carefully responsive mobile navigation has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/"); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: "/tmp/devkazzu-mobile.png", fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy(); await page.getByRole("button", { name: "Open menu", exact: true }).click(); await expect(page.locator("#mobile-navigation")).toBeVisible(); await page.locator("#mobile-navigation").getByRole("link", { name: "Projects", exact: true }).click(); await expect(page).toHaveURL(/\/projects$/); await expect(page.locator("#mobile-navigation")).not.toBeVisible(); await expect(page.locator("h1")).toContainText("brought to life."); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await page.context().addCookies((await ownerApi.storageState()).cookies); await page.goto("/admin"); await page.getByRole("button", { name: "Open admin navigation" }).click(); await expect(page.locator(".admin-sidebar")).toHaveClass(/is-open/); await page.locator(".admin-sidebar").getByRole("link", { name: "Media Library", exact: true }).click(); await expect(page).toHaveURL(/\/admin\/media$/); await expect(page.getByRole("heading", { name: "Media Library", exact: true })).toBeVisible();
});

test("deletion removes public entries and secure logout revokes the session", async () => {
  expect((await ownerApi.delete("/api/admin/content", { data: { id: mainId } })).status()).toBe(200); expect((await publicApi.get(`/projects/${slug}`)).status()).toBe(404); expect((await ownerApi.post("/api/auth/logout")).status()).toBe(200); expect((await ownerApi.get("/api/auth")).status()).toBe(401); expect((await ownerApi.post("/api/admin/content", { data: payload })).status()).toBe(401);
});

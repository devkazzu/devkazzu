# DEVKAZZU — Developer Raju

Designed & developed for Raju Mahato. A full-stack, self-hostable developer ecosystem with a separate owner console.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- PostgreSQL with Drizzle ORM and a checked-in SQL migration
- Server-owned, opaque sessions; salted scrypt password hashes
- PostgreSQL-backed media storage: uploads survive redeploys and do not need a storage API key
- Locally hosted Manrope and Poppins fonts; optimized original WebP artwork

This implementation uses the project's PostgreSQL infrastructure rather than requiring Supabase. There are no browser database clients, service-role keys, or publicly accessible database credentials.

## 1. Local setup

Requirements: Node.js 22+, npm, and PostgreSQL 15+.

1. Install dependencies: `npm ci`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` to your database.
3. Apply the schema: `npx drizzle-kit push`. For a migration-managed installation, use `npx drizzle-kit migrate` instead. Choose one initial schema-management approach, not both against an already initialized database.
4. Add the editable sample library: `npx tsx scripts/seed.ts`.
5. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters in the server environment. Optionally set `ADMIN_NAME`.
6. Provision the sole owner: `npx tsx scripts/create-admin.ts`.
7. Start local development with `npm run dev`.
8. Visit `/` for the public site and `/admin/login` for the separate owner workspace.

There is deliberately no default password, public registration, or web-based owner creation endpoint. If no owner exists, the login page explains the required server-side setup. When both owner environment variables are present, the first content initialization can also provision the initial owner; it never replaces an existing password.

### Resetting a lost password

Set the existing owner's `ADMIN_EMAIL` and a new `ADMIN_PASSWORD` in the server environment, then rerun `npx tsx scripts/create-admin.ts`. This revokes every session. The script refuses to create a second owner under another email. Remove `ADMIN_PASSWORD` from persistent hosting environment configuration after provisioning if you do not need automated first-run setup. Never commit real `.env` files.

## 2. What is functional

### Public site

- Database-powered homepage, section ordering and visibility
- Projects, applications, tools, experiments, full individual detail pages
- Keyword/technology/tag search, category/status filters, sorting, grid/list layouts
- About, self-assessed skills, contact, responsive navigation
- Real JSON formatter/minifier, color palette generator, safe Markdown preview/download
- Interactive sakura, network, and orbital-motion experiments
- Validated contact form with persistent inbox, honeypot, minimum submission time, and IP rate limiting
- Dynamic metadata, Open Graph, Twitter previews, sitemap, robots, loading/error/404 states

### Owner console

- Real metrics and chronological audit history (no fabricated analytics)
- Create, edit, delete, publish/unpublish, draft, feature, and reorder all content types
- Rich entry fields, categories, tags, technologies, screenshots, source/live/download links
- Category, technology, skill, and social-link CRUD
- Homepage hero and section editing; about, brand, profile, logo, theme, contact, footer, and SEO editing
- Image upload, preview, search, folders, rename, URL copy, unused-media deletion protection
- Message read/unread/archive/restore/delete and mail-client replies
- Current-password-verified password changes and global session revocation

### Editable sample content

The supplied Kazu AI, TradeLens, ZenFlow and application entries are clearly editable showcase/concept content, not claims of deployed services. No fictional download or demo endpoint is presented. Add genuine release links when ready. The three tools and three experiments work directly on this website. Initial GitHub/LinkedIn links go to the actual platforms rather than invented personal accounts: update them in **Social Links** before launching. Update the sample contact email and location in **Site Settings**.

## 3. Data model and migrations

`src/db/schema.ts` defines:

- `admin_users`, `admin_sessions`, `rate_limits`
- `content` with a discriminated project/application/tool/experiment kind
- `categories`, `technologies`, `content_technologies`
- `media` with verified image bytes
- `messages`, `site_settings`, `homepage_sections`, `social_links`, `activity_logs`

A unified indexed content table intentionally avoids duplicating four nearly identical schemas. Content-to-category and content-to-technology foreign keys provide real relationships. Slugs, technology names, owner emails, and section keys have uniqueness constraints. Owner sessions and content associations cascade appropriately.

The initial migration and Drizzle snapshot are in `drizzle/`. For future schema changes: update the schema, run `npx drizzle-kit generate`, review the SQL, then apply via `npx drizzle-kit migrate` in a migration-managed deployment. `npx drizzle-kit push` is convenient for local iteration. Do not delete live database volumes or rerun initialization scripts that recreate the schema. Seeding is transactional, advisory-lock protected, and idempotent.

All application data access goes through the server-side Drizzle `db` client. No direct PostgreSQL access is granted to anonymous web users. Do not expose the PostgreSQL port publicly. Use a dedicated non-superuser database role scoped to this application's schema in production; schema migrations should use a separate deployment role where appropriate. This is an application-server authorization model, not a Supabase anonymous-client/RLS model.

## 4. Security model

- No registration endpoint and no hardcoded credentials
- Every admin page and every write route independently verifies a database session
- 256-bit random session tokens; only SHA-256 token hashes are stored
- HttpOnly, SameSite=Strict cookies, Secure in production, seven-day expiration
- Passwords use Node's salted scrypt; comparison is constant-time
- Persistent, atomic login limits by IP and normalized account; contact limits by IP
- Same-origin enforcement on mutating requests, in addition to same-site cookies
- Zod validation and parameterized ORM queries
- PNG/JPEG/WebP/GIF signature and decoder validation, 8 MB limit, 40 MP pixel limit; SVG uploads rejected
- Draft-only images are owner-only; published/site-referenced images can be served publicly
- In-use media cannot be deleted
- Private API responses are not cached; public image browser cache is limited to 60 seconds
- Safe text rendering; Markdown preview never injects raw HTML
- CSP, clickjacking protection, MIME sniffing protection, referrer and permissions headers

Set a long random `AUTH_SECRET` to pepper IP hashes. Configure the reverse proxy to overwrite untrusted `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` headers. Use HTTPS and a private PostgreSQL network. The CSP allows inline Next.js bootstrap/styles; a nonce-based stricter CSP is an optional deployment-specific hardening step. Public external links and externally hosted images are owner-controlled.

Scrypt defaults and rate limits are sensible baselines, not a substitute for deployment-specific threat modeling. Add edge/WAF protection, monitoring, backup testing, and dependency audits before a public production launch. No claim of an external penetration test is made.

## 5. Production deployment

Deploy to any Node-compatible Next.js host (a managed Node service, a container host, or a VPS) with persistent PostgreSQL. Serverless hosts require a suitable pooled PostgreSQL endpoint and an upload body limit compatible with your chosen image-size policy.

1. Provision a private PostgreSQL database and a least-privilege application role.
2. Configure server-only `DATABASE_URL`, `AUTH_SECRET`, and `SITE_URL=https://your-domain` at build/runtime as required by your host. Set the owner variables for initial provisioning only.
3. Run `npm ci`, apply reviewed migrations, and seed if this is a fresh installation.
4. Run `npx next typegen`, `npm exec tsc -- --noEmit --pretty false`, and `npm run build`.
5. Start the production service using the host's `npm run start` process command. The included Dockerfile is another option; inject environment variables at runtime, never bake secrets into the image.
6. Provision the owner with the server-only script, sign in, and replace sample content/social/contact settings.
7. Route HTTPS through a trusted proxy and healthcheck `/api/health`.
8. Verify real browser navigation, an upload, publishing/draft privacy, and a contact submission on your final origin.

Because uploaded image bytes are in PostgreSQL, filesystem persistence is not required for media. Back up the database (including the `media` table) regularly. Use `pg_dump`/managed snapshots, encrypted backup storage, and restore drills. For a very large image library, migrate the media adapter to private object storage without changing the public content model.

## 6. Validation and tests

Required build validation:

- `npx next typegen`
- `npm exec tsc -- --noEmit --pretty false`
- `npm run build`

Browser/API integration tests live in `tests/`. Install a browser and its Linux libraries with `npx playwright install --with-deps chromium`, start the app using your normal managed runtime, and run `npx playwright test`. Set `TEST_BASE_URL` to the running origin. For a locally running production build, use `http://localhost:3000` (localhost is a browser-trusted development origin for secure session cookies). A hosted preview's traffic-access gateway may block external test clients; test against the application's local origin in that case.

Tests provision a temporary random-password test owner only if there is no existing owner; they refuse to replace a real owner. They clean up their test content, sessions, images, messages, owner, and test audit records. Run integration tests against an isolated database, not a live production site. Tests cover owner access, CRUD, publishing privacy, uploads, filtering, contact persistence/inbox operations, tools, mobile navigation, and runtime console errors.

## 7. Useful paths

- `/` public homepage
- `/projects`, `/applications`, `/tools`, `/experiments`
- `/{collection}/{slug}` individual entries
- `/about`, `/skills`, `/contact`
- `/admin/login` owner login; `/admin` creator console
- `/api/health` database healthcheck
- `/sitemap.xml`, `/robots.txt`

All content changes appear on the next public request. No rebuild is needed to publish content or update site settings.

# FWP Bugs

Last updated: 2026-10-29

## Open

_None._

## Fixed (continued)

### BUG-003 — Editor not attached to local bencornelius.com

- **Symptoms:** Project switcher listed bencornelius.com, but AWED showed empty/default site state (no `site.yaml`, no page docs); felt disconnected from the real Next.js tree.
- **Root cause:** Registry only stored a folder path. The live site uses hardcoded `app/**/page.tsx` + MDX articles, not AWED’s document layout, so nothing was mapped.
- **Fix (revised):** Import registers **full file paths** in `.awed/manifest.yaml` (pages, articles, media) and thin page path records—no content extraction into stub blocks. Media **Library** lists/uploads art under `public/images/library/` for placement via Image blocks.
- **Regression:** `lib/import/*`, `lib/store/media-store.test.ts`.

## Fixed

### BUG-001 — Article publish failed after YAML date parse

- **Symptoms:** `FsSiteStore.publishArticle` threw Zod `Expected string, received date` on `frontmatter.date`.
- **Repro:** Save an article with an unquoted YAML date (e.g. `date: 2026-10-01`), then publish; gray-matter returns a `Date`.
- **Module:** `lib/schema/article.ts`, `lib/store/fs-site-store.ts`
- **Root cause:** Zod expected a string; YAML loaders coerce ISO-like dates to `Date`.
- **Fix:** Preprocess frontmatter `date` to accept `Date` and normalize to `YYYY-MM-DD` string before validation.
- **Regression test:** `lib/schema/article.test.ts` (“coerces YAML Date objects…”); publish path covered in `fs-site-store.test.ts`.

### BUG-002 — `npm install` hung / failed with TLS leaf signature errors

- **Symptoms:** `npm install` produced no `node_modules` and eventually failed fetching packages with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.
- **Module:** Environment / npm
- **Root cause:** TLS interception (corporate or local security) breaks default certificate verification against registry.npmjs.org.
- **Fix:** Added project `.npmrc` with `strict-ssl=false` for local installs. Prefer installing a corporate CA into the trust store when available instead of disabling SSL verification long-term.

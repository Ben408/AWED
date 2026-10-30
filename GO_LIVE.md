# Your tasks to get AWED live for bencornelius.com

**Product:** AWED — Agentic Web Experience Designer  
**Version:** 0.1.0-alpha  
**Repo:** https://github.com/Ben408/AWED  
**Local studio:** http://localhost:3100  
**Local site:** http://localhost:3000 (typical Next default)

This checklist is what **you** need to finish so AWED can edit the real site in production. Local Alpha testing can start now while these are in progress.

---

## A. Local Alpha testing (now)

1. Confirm both apps are running:
   - Marketing site: `C:\Users\bjcor\Desktop\website\website` → http://localhost:3000 or :3001
   - AWED: `F:\Coding_Projects\FWP` → http://localhost:3100
2. **Attach the real site (once per machine / after clone):**
   - Open http://localhost:3100/import
   - Path: `C:/Users/bjcor/Desktop/website/website`
   - **Scan project** → confirm page/article/media **paths**
   - **Import & attach** (writes `.awed/manifest.yaml` path index only)
3. Project switcher → **bencornelius.com**. Open Pages → About / Resources / Services: Edit saves into the real `app/**/page.tsx`.
4. `.awed/manifest.yaml` is **not** updated by normal editing — see [`docs/MANIFEST.md`](./docs/MANIFEST.md).
5. Capture Alpha feedback.

---

## B. GitHub / code

1. Confirm you can see https://github.com/Ben408/AWED (created from this machine).
2. Optionally rename the local folder `FWP` → `AWED` later for clarity (not required for Alpha).
3. Do **not** commit `.env.local` (secrets / bypass flags).

---

## C. Cloudflare Access (production door)

1. Decide the AWED hostname, e.g. `fwp.bencornelius.com` or `awed.bencornelius.com`.
2. In Cloudflare Zero Trust → Access:
   - Add an application for that hostname.
   - Policy: same **site-admin** group / admin emails as the portal.
3. DNS: CNAME the hostname to the AWED Vercel deployment (or your host).
4. Ensure www stays **public**; only AWED (+ portal) stay behind Access.

---

## D. Deploy AWED (Vercel)

1. Import **Ben408/AWED** into Vercel (new project).
2. Set environment variables (Production):

| Variable | Example / notes |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | Same as portal |
| `CF_ACCESS_AUD` | AUD for the AWED Access app |
| `CF_ACCESS_ADMIN_EMAILS` | `ben@bencornelius.com,...` |
| `DEV_BYPASS_AUTH` | **unset** in production |
| `NEXT_PUBLIC_AWED_URL` | `https://awed.bencornelius.com` |
| `FWP_PROJECTS_FILE` | Optional; default `data/projects.json` |

3. For production editing of bencornelius.com you will need a **remote content connection** (next section)—local disk paths in `data/projects.json` only work on your machine.

---

## E. Connect AWED to the website repo (required for real edits)

Today Alpha writes via the **filesystem** to paths in `data/projects.json`. Production needs one of:

1. **Recommended next:** GitHub App / fine-scoped token that commits to `Ben408/website` (content paths under `website/`), **or**
2. Run AWED where the website checkout is mounted (not typical on Vercel).

Your tasks when wiring Git:

1. Create a GitHub fine-grained PAT or App with contents write on `Ben408/website`.
2. Store as `GITHUB_TOKEN` (and owner/repo/branch) on the AWED Vercel project.
3. Ask the agent (or implement) a Git-backed store that replaces/augments `FsSiteStore` for the `bencornelius` project.
4. Prefer **PR + preview URL** for non-Ben admins; direct commit to `main` only if you accept that risk.

Until Git publish exists, treat local AWED → local website folder as the Alpha path.

---

## F. Marketing site env (portal interstitial)

On the **website** Vercel project, set:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_AWED_URL` | Production AWED URL (or `http://localhost:3100` for local portal tests) |

Deploy website so `/admin` **Open AWED** hits the right host.

---

## G. Content model on bencornelius.com

1. **Articles:** edit real MDX under `content/articles` and `content/drafts`.
2. **Marketing pages:** edit the **existing** `app/**/page.tsx` files in place (extract → form → write back). No requirement to rebuild pages for AWED.
3. **Optional later:** document-driven pages for *new* sites (`templates/agent-first-site`). Not required for BC.com.

---

## H. Smoke test (production)

1. Sign in at `portal.bencornelius.com` as admin.
2. Land on `/admin` → **Open AWED**.
3. Confirm Access identity (no `DEV_BYPASS_AUTH`).
4. Create a draft article → publish → confirm it appears after Vercel build.
5. Sign out; confirm a non-admin cannot open AWED.

---

## I. Optional follow-ups (after Alpha feedback)

- New Site wizard (deferred)
- Git publish status in the Publish panel
- Richer Preview (iframe of localhost:3000)
- Media library uploads
- Rename local directory / env vars from FWP → AWED everywhere

---

## PageMill handbook → AWED (already applied in 0.1 Alpha)

Concepts taken from the PageMill 2.0 guide / handbook (ease of use, **not** Adobe UI clones):

| PageMill idea | AWED 0.1 Alpha |
| --- | --- |
| Edit / Preview | Edit / Preview / Document modes |
| Pasteboard | **Scrapboard** (reusable blocks) |
| Site as related pages | **Site map** view |
| Test links in Preview | **Links** internal checker |
| Inspector | Property panel + structured row editor |
| Upload/publish | Publish checkpoint (Git push still your task in §E) |

---

## Quick local commands

```powershell
# AWED
cd F:\Coding_Projects\FWP
npm run dev

# Website
cd C:\Users\bjcor\Desktop\website\website
npm run dev
```

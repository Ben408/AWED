# AWED backlog

Items deferred from the 2026-10-30 enhancement pass. Each entry is ready to pick up without rediscovering intent.

---

## 5. Drag-reorder navigation (primary DnD)

**Status:** Partial — Site map still has ↑↓ and HTML5 drag on nav rows; this backlog item is the *delight* pass.

**Problem:** Reordering the header menu with buttons works, but power users expect fluid drag handles, drop indicators, and keyboard-accessible reordering that feels as good as Notion/Figma lists.

**Desired experience:**
- Visible drag handle on each nav row
- Live drop placeholder / insertion line while dragging
- Auto-scroll when dragging near edges of a long menu
- Same interaction language as article/allowlist DnD
- Persist on drop (optional autosave) or clearly “dirty until Save”

**Technical notes:** Consider `@dnd-kit/core` for a11y + touch. Keep button fallbacks. Source of truth remains `site.yaml` + `lib/constants.ts` via `saveNav`.

---

## 15. Hide “0 blocks” noise for imported TSX pages

**Status:** Mostly addressed on Site map / Pages index (“Editable file” instead of “0 blocks”). Keep this item if any remaining surfaces still show block counts for `source.kind === 'tsx'`.

**Problem:** Imported pages are path records, not block documents. Showing “0 blocks” implies emptiness and trains authors to expect the wrong editor model.

**Desired experience:**
- TSX pages: show region count or “Editable file”
- Document pages: show block count only when useful
- Never imply a blank canvas when the live page is rich

**Surfaces to audit:** Overview cards, link checker copy, Publish summaries, any remaining list cells.

---

## 20. Library as first-class media manager

**Status:** Not started (upload + copy path + drag MIME exist).

**Problem:** Authors can upload and drag paths, but cannot manage the life of art: find usage, replace an image everywhere, delete safely, or organize folders.

**Desired experience:**
- Search / filter by name and folder
- “Used on” — pages and articles referencing this URL
- Replace-in-use (update references when replacing a file)
- Delete with confirmation when unused; block or warn when in use
- Optional folders under `public/images/library/`
- Alt-text hints stored alongside assets (sidecar yaml or frontmatter convention)

**Technical notes:** Extend `/api/media` with DELETE and usage scan (grep `public` URLs in `app/`, `content/`). Avoid deleting files still referenced.

---

## 21. Favicon / OG / logo editors in Site settings

**Status:** Not started.

**Problem:** Brand chrome lives in `public/` and `lib/constants.ts` (`logo`, `ogImage`). Site settings today edit name/description/agent text only.

**Desired experience:**
- Upload or pick from Library for logo, favicon, default OG image
- Live preview of how the logo appears in header/footer chrome
- Writes real files under `public/images/` and updates `siteConfig` fields in constants (or `site.yaml` mirrored fields)

**Technical notes:** Extend `SiteSettingsForm` + `saveSite` / constants sync. Respect existing transparent logo assets on BC.com.

---

## 26. Nested navigation (dropdown / “More” menu)

**Status:** Not started.

**Problem:** The live header already treats Services/Contact as primary and other `navItems` as a dropdown. AWED’s nav model is a flat list with `listed`, which cannot express parent/child or “always visible vs overflow.”

**Desired experience:**
- Mark items as primary vs overflow (or nest under a parent)
- Preview matches real header behavior
- Reorder within primary and within dropdown independently

**Technical notes:** Extend `navItemSchema` with `group: 'primary' | 'menu'` or `children[]`. Update `site-header.tsx` to read structured nav instead of hard-coded Services/Contact filter. Migrate current BC header logic into data.

---

## 28. True WYSIWYG for TSX pages

**Status:** Not started (intentionally deferred).

**Problem:** Extract ↔ form ↔ write-back is practical and safe, but authors still imagine clicking the live page and typing in place.

**Desired experience:**
- Optional visual mode where preview overlays editable hotspots
- Inline text editing for simple string regions
- Clear escape hatch back to structured forms for lists/CTAs

**Technical notes:** High risk of corrupting TSX. Prefer postMessage bridge + region spans over contentEditable over full source. Diff-before-save (shipped) is a prerequisite. Do not replace region extractors; layer UX on top.

---

## 29. Multi-user presence / locking

**Status:** Not started.

**Problem:** Two people can edit the same MDX/TSX locally or via shared disk without knowing the other has a dirty buffer.

**Desired experience:**
- Soft lock per page/article slug while an editor session is open
- Presence indicator (“Ben is editing About”)
- Conflict UX beyond today’s `expectedSource` 409

**Technical notes:** Requires a small coordination channel (file lock under `.awed/locks/`, or later a realtime service). Overkill for single-admin Alpha; needed before shared production editing.

---

## 30. Guided “weekly update” mode

**Status:** Not started.

**Problem:** Routine site maintenance is a scavenger hunt across Home lead, featured article, Insights order, and a CTA.

**Desired experience:**
- A short checklist flow: update homepage lead → feature an article → tweak primary CTA → glance at nav
- One “Done for this week” summary of files touched
- Opinionated defaults for BC.com, not a generic CMS dashboard

**Technical notes:** Orchestration UI over existing editors/APIs; no new content model required. Ideal after create wizards + case-studies-style editors feel solid.

---

## Parking lot (related, not numbered)

- **Footer-only vs header-only links** as separate membership (today footer groups are independent; header uses `navItems`).
- **Media DELETE API** (subset of #20).
- **Click-into-iframe** true hotspot editing (subset of #28; preview outline click-to-edit already shipped as a bridge).

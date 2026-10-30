# AWED Status

**Product:** Agentic Web Experience Designer (AWED)  
**Version:** 0.2.0-pre-beta  
**Last updated:** 2026-10-30 (0.2 pre-beta release)

## Product goals

| Goal | Status |
| --- | --- |
| Standalone schema-driven builder | Done (0.2 Pre-Beta) |
| Brand as AWED / GitHub Ben408/AWED | Done (private repo) |
| Admin interstitial → Open AWED | Done |
| Article + page CRUD, scrapboard, site map, link check | Done |
| Deploy + Git-backed BC.com edits | Owner tasks in GO_LIVE.md |
| New Site wizard | Deferred |

## PageMill-inspired (Alpha)

- Edit / Preview / Document modes
- Scrapboard (pasteboard analogue)
- Site map
- Internal link checker
- Inspector + structured row editor
- Publish checkpoint (not FTP)

## Verification

```text
npm test
npm run build
```

See GO_LIVE.md for production owner tasks.

## Experience decisions

- Nested list fields use a structured row editor (not JSON textareas).
- **Import** registers full file paths in `.awed/manifest.yaml` (and thin page path records). It does **not** extract TSX/MDX copy into stub blocks.
- **Library** manages art under `public/` (upload to `public/images/library/`); place on pages with the **Image** block + library picker.
- **Preview** shows live human iframe + labeled agent/machine panel.
- **Articles** list supports publish / unpublish / delete / reorder (date swap). Insights & Backyard order edit `content/allowlists.yaml`. Orphan draft+published duplicates are reconciled.
- **Interactive demos** in articles = MDX tags (e.g. `<GenerativeUiDemo />`) registered in the site’s `mdx-components.tsx`; AWED can insert known tags, not invent new demos.
- **Site map navigation** is editable (add / rename / reorder / relink / remove) and syncs to `site.yaml` + live `lib/constants.ts` nav when present.
- **Create wizards** scaffold real `app/.../page.tsx` and draft MDX; duplicate/delete (optional TSX) available.
- **Articles** support bulk publish/unpublish/delete, DnD reorder, cover picker, embed catalog, split preview, autosave drafts, undo.
- **TSX page editor** has outline, featured/metrics/CTA regions, diff-before-save, undo, image drop, preview click-to-edit bridge.
- **Footer link groups** editable from Site map; live footer reads `footerNavGroups`.
- Deferred items live in [`backlog.md`](./backlog.md).

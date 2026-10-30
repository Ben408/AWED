# AWED Status

**Product:** Agentic Web Experience Designer (AWED)  
**Version:** 0.1.0-alpha  
**Last updated:** 2026-10-29 (path-only import + media Library)

## Product goals

| Goal | Status |
| --- | --- |
| Standalone schema-driven builder | Done (0.1 Alpha) |
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

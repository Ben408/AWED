# `.awed/manifest.yaml` — what it is

## Expectation

`.awed/manifest.yaml` is an **index of file paths** created by **Import**. It answers: “which files belong to this site project?”

| Edited by Import? | Yes — rewritten when you Scan / Import & attach |
| --- | --- |
| Edited when you change page copy in the editor? | **No** |
| Edited when you upload Library art? | **Not automatically in Alpha** (re-import refreshes the media list in the manifest) |
| Required at runtime by Next.js? | **No** — the public site ignores it |

## What the editor edits instead

| Content | File the editor writes |
| --- | --- |
| Marketing page copy / metadata | The real `app/**/page.tsx` (extract → edit → write back) |
| Articles | The real `content/articles|drafts/*.mdx` |
| New art uploads | `public/images/library/*` |

Thin `content/pages/*.page.yaml` files are **path records** (route → source file). They are not a second copy of the page content.

## When to re-import

- New routes or pages added under `app/`
- New image folders under `public/`
- After cloning the site onto a new machine (paths refresh)

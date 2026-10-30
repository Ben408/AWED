# Agentic Web Experience Designer (AWED)

**Version:** 0.2.0-pre-beta

AWED is a website builder for the agentic web: schema-driven editing of Next.js experience pages (.tsx) and articles (.mdx). It keeps the ease of classic visual tools - Edit / Preview, inspector, scrapboard, site map, publish - without treating HTML as the source of truth. Human-first builders (WordPress, Canva, etc.) optimize for page layout; AWED is for sites that serve agents, bots, and people together.

Example site: https://www.bencornelius.com

Experience pages are .tsx files. These contain json, html and yaml data arrays.
Article pages are .mdx files. These contain markup for agents and the familiar markdown structure for content.
The CMS is built in (pages, articles, media, nav, publish).

<img width="898" height="748" alt="image" src="https://github.com/user-attachments/assets/cfc421b6-c734-4d04-872d-95548ed54303" />

## Quick start

```bash
npm install
npm test
npm run dev
```

Open http://localhost:3100

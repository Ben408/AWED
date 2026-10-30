import { z } from 'zod';

export const navItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  listed: z.boolean().default(true)
});

export const footerGroupSchema = z.object({
  title: z.string().min(1),
  links: z.array(navItemSchema).default([])
});

export const capabilitySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  audience: z.enum(['human', 'agent', 'both']).default('both')
});

export const siteDocumentSchema = z.object({
  version: z.literal(1).default(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  domain: z.string().optional(),
  description: z.string().default(''),
  defaultLocale: z.string().default('en'),
  nav: z.array(navItemSchema).default([]),
  footerGroups: z.array(footerGroupSchema).default([]),
  capabilities: z.array(capabilitySchema).default([]),
  seo: z
    .object({
      titleTemplate: z.string().default('%s'),
      defaultDescription: z.string().default('')
    })
    .default({}),
  agent: z
    .object({
      summary: z.string().default(''),
      facts: z.array(z.string()).default([])
    })
    .default({})
});

export type SiteDocument = z.infer<typeof siteDocumentSchema>;
export type NavItem = z.infer<typeof navItemSchema>;
export type FooterGroup = z.infer<typeof footerGroupSchema>;
export type Capability = z.infer<typeof capabilitySchema>;

export function parseSiteDocument(input: unknown): SiteDocument {
  return siteDocumentSchema.parse(input);
}

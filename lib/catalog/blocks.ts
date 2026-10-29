import { z } from 'zod';

/** Approved block types — authors pick from this catalog only. */
export const blockTypeSchema = z.enum([
  'hero',
  'prose',
  'serviceCards',
  'ctaBand',
  'faq',
  'people',
  'partnerLogos',
  'articleList',
  'contactForm'
]);

export type BlockType = z.infer<typeof blockTypeSchema>;

const baseBlock = z.object({
  id: z.string().min(1),
  type: blockTypeSchema
});

export const heroBlockSchema = baseBlock.extend({
  type: z.literal('hero'),
  props: z.object({
    eyebrow: z.string().default(''),
    headline: z.string().min(1),
    support: z.string().default(''),
    primaryCtaLabel: z.string().default(''),
    primaryCtaHref: z.string().default(''),
    secondaryCtaLabel: z.string().default(''),
    secondaryCtaHref: z.string().default('')
  })
});

export const proseBlockSchema = baseBlock.extend({
  type: z.literal('prose'),
  props: z.object({
    heading: z.string().default(''),
    body: z.string().min(1)
  })
});

export const serviceCardsBlockSchema = baseBlock.extend({
  type: z.literal('serviceCards'),
  props: z.object({
    heading: z.string().default(''),
    items: z
      .array(
        z.object({
          title: z.string().min(1),
          description: z.string().min(1)
        })
      )
      .default([])
  })
});

export const ctaBandBlockSchema = baseBlock.extend({
  type: z.literal('ctaBand'),
  props: z.object({
    heading: z.string().min(1),
    body: z.string().default(''),
    buttonLabel: z.string().min(1),
    buttonHref: z.string().min(1)
  })
});

export const faqBlockSchema = baseBlock.extend({
  type: z.literal('faq'),
  props: z.object({
    heading: z.string().default('FAQ'),
    items: z
      .array(
        z.object({
          question: z.string().min(1),
          answer: z.string().min(1)
        })
      )
      .default([])
  })
});

export const peopleBlockSchema = baseBlock.extend({
  type: z.literal('people'),
  props: z.object({
    heading: z.string().default(''),
    people: z
      .array(
        z.object({
          name: z.string().min(1),
          role: z.string().default(''),
          bio: z.string().default('')
        })
      )
      .default([])
  })
});

export const partnerLogosBlockSchema = baseBlock.extend({
  type: z.literal('partnerLogos'),
  props: z.object({
    heading: z.string().default(''),
    partners: z
      .array(
        z.object({
          name: z.string().min(1),
          href: z.string().default(''),
          logoSrc: z.string().default('')
        })
      )
      .default([])
  })
});

export const articleListBlockSchema = baseBlock.extend({
  type: z.literal('articleList'),
  props: z.object({
    heading: z.string().default(''),
    source: z.enum(['all', 'business', 'backyard']).default('all'),
    limit: z.number().int().positive().max(50).default(6)
  })
});

export const contactFormBlockSchema = baseBlock.extend({
  type: z.literal('contactForm'),
  props: z.object({
    heading: z.string().default('Contact'),
    intro: z.string().default('')
  })
});

export const blockInstanceSchema = z.discriminatedUnion('type', [
  heroBlockSchema,
  proseBlockSchema,
  serviceCardsBlockSchema,
  ctaBandBlockSchema,
  faqBlockSchema,
  peopleBlockSchema,
  partnerLogosBlockSchema,
  articleListBlockSchema,
  contactFormBlockSchema
]);

export type BlockInstance = z.infer<typeof blockInstanceSchema>;

export type CatalogEntry = {
  type: BlockType;
  label: string;
  description: string;
  defaults: BlockInstance['props'];
};

export const BLOCK_CATALOG: CatalogEntry[] = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Brand-forward opening with headline and CTAs',
    defaults: {
      eyebrow: '',
      headline: 'Headline',
      support: '',
      primaryCtaLabel: '',
      primaryCtaHref: '',
      secondaryCtaLabel: '',
      secondaryCtaHref: ''
    }
  },
  {
    type: 'prose',
    label: 'Prose',
    description: 'Heading plus body copy',
    defaults: { heading: '', body: 'Write the section copy here.' }
  },
  {
    type: 'serviceCards',
    label: 'Service cards',
    description: 'Grid of titled offerings',
    defaults: { heading: 'Services', items: [] }
  },
  {
    type: 'ctaBand',
    label: 'CTA band',
    description: 'Single call-to-action strip',
    defaults: {
      heading: 'Ready to talk?',
      body: '',
      buttonLabel: 'Contact',
      buttonHref: '/contact'
    }
  },
  {
    type: 'faq',
    label: 'FAQ',
    description: 'Questions and answers',
    defaults: { heading: 'FAQ', items: [] }
  },
  {
    type: 'people',
    label: 'People',
    description: 'Team or speaker profiles',
    defaults: { heading: 'People', people: [] }
  },
  {
    type: 'partnerLogos',
    label: 'Partner logos',
    description: 'Partner names and optional links',
    defaults: { heading: 'Partners', partners: [] }
  },
  {
    type: 'articleList',
    label: 'Article list',
    description: 'Pulls from published articles',
    defaults: { heading: 'Insights', source: 'all', limit: 6 }
  },
  {
    type: 'contactForm',
    label: 'Contact form',
    description: 'Bound to the site contact endpoint',
    defaults: { heading: 'Contact', intro: '' }
  }
];

export function getCatalogEntry(type: BlockType): CatalogEntry {
  const entry = BLOCK_CATALOG.find((item) => item.type === type);
  if (!entry) throw new Error(`Unknown block type: ${type}`);
  return entry;
}

export function createBlockInstance(type: BlockType, id: string): BlockInstance {
  const entry = getCatalogEntry(type);
  return blockInstanceSchema.parse({
    id,
    type,
    props: entry.defaults
  });
}

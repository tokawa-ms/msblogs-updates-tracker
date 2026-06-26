import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    date: z.coerce.date(),
    description: z.string(),
    descriptionEn: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    hidden: z.boolean().default(false),
    lastUpdated: z.string(),
    newCount: z.number().int().nonnegative().default(0),
    removedCount: z.number().int().nonnegative().default(0),
    sourceCount: z.number().int().nonnegative().default(0),
    comparedWith: z.string().optional(),
    articles: z
      .array(
        z.object({
          title: z.string(),
          url: z.string().url(),
          sourceId: z.string(),
          sourceName: z.string(),
          publishedAt: z.string(),
          summary: z.string(),
          summaryEn: z.string().optional(),
        }),
      )
      .default([]),
    sourceBreakdown: z
      .array(
        z.object({
          sourceId: z.string(),
          sourceName: z.string(),
          newCount: z.number().int().nonnegative(),
        }),
      )
      .default([]),
  }),
});

export const collections = { updates };

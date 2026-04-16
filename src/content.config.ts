import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
  }),
});

const works = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/works' }),
  schema: z.object({
    name: z.string(),
    meta: z.string(),
    path: z.string(),
    links: z.array(z.object({
      label: z.string(),
      href: z.string().url(),
    })),
    stack: z.string(),
    image: z.string().url().optional(),
    order: z.number().optional().default(0),
  }),
});

export const collections = { blog, works };
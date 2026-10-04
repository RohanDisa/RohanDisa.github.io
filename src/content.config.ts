import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string().max(160),
    lane: z.enum(['agents', 'systems', 'ml']),
    period: z.string(), // "Jan 2026 – Apr 2026"
    order: z.number(),
    featured: z.boolean().default(false),
    stack: z.array(z.string()),
    metrics: z.array(z.object({ value: z.string(), label: z.string() })).max(4),
    links: z
      .object({
        github: z.string().url().optional(),
        writeup: z.string().url().optional(),
        demo: z.string().url().optional(),
      })
      .default({}),
    interactive: z.enum(['raft-sim', 'trace-replay']).optional(),
    draft: z.boolean().default(false),
  }),
});

const experience = defineCollection({
  loader: file('src/content/experience.yaml'),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
    bullets: z.array(
      z.object({
        text: z.string(),
        metric: z.string().optional(),
        group: z.string().optional(),
      }),
    ),
  }),
});

const oss = defineCollection({
  loader: file('src/content/oss.yaml'),
  schema: z.object({
    repo: z.string(),
    pr: z.number(),
    url: z.string().url(),
    summary: z.string(),
    status: z.string(),
  }),
});

export const collections = { projects, experience, oss };

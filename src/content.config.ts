import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const authors = defineCollection({
	loader: glob({ base: './src/content/authors', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			name: z.string(),
			bio: z.string(),
			avatar: image(),
			socials: z
				.array(
					z.object({
						label: z.string(),
						url: z.url(),
					}),
				)
				.default([]),
		}),
});

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: z.optional(image()),
			author: reference('authors'),
		}),
});

const projects = defineCollection({
	loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string().min(1),
			description: z.string().min(1),
			repoUrl: z.url({ protocol: /^https?$/ }),
			demoUrl: z.url({ protocol: /^https?$/ }).optional(),
			stack: z.array(z.string().trim().min(1)).default([]),
			heroImage: image().optional(),
			heroImageAlt: z.string().min(1).optional(),
			gallery: z
				.array(
					z.object({
						url: z.url({ protocol: /^https?$/ }),
						alt: z.string().min(1),
					}),
				)
				.default([]),
			date: z.coerce.date(),
		}),
});

export const collections = { authors, blog, projects };

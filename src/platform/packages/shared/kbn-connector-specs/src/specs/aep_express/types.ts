/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

// =============================================================================
// Action input schemas & inferred types
// All schemas use lazySchema() — do not use bare z.object().
// All z.string() fields must have .max(N).
// =============================================================================

export const ListToolsInputSchema = lazySchema(() => z.object({}));
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;

export const SearchTemplatesInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Keyword or phrase to search for templates. Example: "social media post", "birthday card", "business flyer"'
      ),
    category: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter by template category. Example: "social_media", "marketing", "education", "events". Leave empty to search all categories.'
      ),
    maxResults: z
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(20)
      .describe('Maximum number of templates to return (1–50, default 20)'),
  })
);
export type SearchTemplatesInput = z.infer<typeof SearchTemplatesInputSchema>;

export const CreateDesignInputSchema = lazySchema(() =>
  z.object({
    templateId: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'ID of a template to base the design on. Use the ID returned by searchTemplates. Omit to create a blank canvas.'
      ),
    title: z
      .string()
      .min(1)
      .max(500)
      .optional()
      .describe('Title for the new design. Example: "Q3 Marketing Banner"'),
    width: z
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe(
        'Canvas width in pixels. Only applicable when creating a blank canvas (no templateId). Example: 1080'
      ),
    height: z
      .int()
      .min(1)
      .max(10000)
      .optional()
      .describe(
        'Canvas height in pixels. Only applicable when creating a blank canvas (no templateId). Example: 1080'
      ),
  })
);
export type CreateDesignInput = z.infer<typeof CreateDesignInputSchema>;

export const GetDesignInputSchema = lazySchema(() =>
  z.object({
    designId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'ID of the design to retrieve. Use the ID returned by createDesign or searchTemplates.'
      ),
  })
);
export type GetDesignInput = z.infer<typeof GetDesignInputSchema>;

export const ExportDesignInputSchema = lazySchema(() =>
  z.object({
    designId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'ID of the design to export. Use the ID returned by createDesign or getDesign.'
      ),
    format: z
      .enum(['jpg', 'png', 'pdf', 'mp4'])
      .optional()
      .default('png')
      .describe(
        'Export format: "png" (default, lossless image), "jpg" (compressed image), "pdf" (print-ready document), or "mp4" (video/animation).'
      ),
    quality: z
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe(
        'Export quality percentage for JPEG output (1–100). Higher values produce larger files. Only applies to "jpg" format. Default is 85.'
      ),
  })
);
export type ExportDesignInput = z.infer<typeof ExportDesignInputSchema>;

export const GenerateImageInputSchema = lazySchema(() =>
  z.object({
    prompt: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Text description of the image to generate using Adobe Firefly AI. Example: "A serene mountain landscape at sunset with dramatic lighting"'
      ),
    style: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Visual style for the generated image. Example: "photographic", "digital art", "watercolor", "sketch". Leave empty for automatic style selection.'
      ),
    aspectRatio: z
      .enum(['1:1', '4:3', '3:4', '16:9', '9:16'])
      .optional()
      .default('1:1')
      .describe(
        'Aspect ratio of the generated image: "1:1" (square, default), "4:3" (landscape), "3:4" (portrait), "16:9" (widescreen), or "9:16" (vertical).'
      ),
  })
);
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const CallToolInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Name of the Adobe Express MCP tool to call (use listTools to discover available names)'
      ),
    arguments: z
      .record(z.string().max(200), z.unknown())
      .optional()
      .describe('Arguments to pass to the tool (tool-specific)'),
  })
);
export type CallToolInput = z.infer<typeof CallToolInputSchema>;

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
// All z.string() input fields must have .max(N).
// =============================================================================

export const LookupSubscriberInputSchema = lazySchema(() =>
  z.object({
    email: z
      .string()
      .min(1)
      .max(254)
      .describe(
        'Email address of the subscriber to look up in the All Subscribers list. ' +
          'Example: "jane.doe@example.com".'
      ),
    properties: z
      .array(z.string().max(200))
      .max(50)
      .optional()
      .describe(
        'List of attribute names to include in the response. Omit to return all default ' +
          'subscriber attributes (email address, status, subscriber key, etc.).'
      ),
  })
);
export type LookupSubscriberInput = z.infer<typeof LookupSubscriberInputSchema>;

export const QueryDataExtensionInputSchema = lazySchema(() =>
  z.object({
    externalKey: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'External key of the Data Extension to query. The external key is the unique identifier ' +
          'assigned when the Data Extension was created in Salesforce Marketing Cloud. ' +
          'Example: "Contacts_DE" or "EmailActivity_2024".'
      ),
    filter: z
      .string()
      .max(1000)
      .optional()
      .describe(
        'OData-style filter expression to narrow results. ' +
          'Examples: "Status eq \'Active\'", "CreatedDate gt \'2024-01-01\'", ' +
          '"EmailAddress eq \'user@example.com\'". Leave empty to return all rows (paginated).'
      ),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(2500)
      .optional()
      .default(50)
      .describe('Number of rows to return per page (1–2500, default 50).'),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (1-based, default 1).'),
  })
);
export type QueryDataExtensionInput = z.infer<typeof QueryDataExtensionInputSchema>;

export const ListJourneysInputSchema = lazySchema(() =>
  z.object({
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (1-based, default 1).'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe('Number of journeys per page (1–50, default 10).'),
    status: z
      .enum(['Draft', 'Published', 'ScheduledToPublish', 'Stopped', 'Unpublished'])
      .optional()
      .describe(
        'Filter journeys by publication status. ' +
          'Values: "Draft" (not yet published), "Published" (live and sending), ' +
          '"ScheduledToPublish" (queued for activation), "Stopped" (paused), ' +
          '"Unpublished" (deactivated). Omit to return all statuses.'
      ),
    nameFilter: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter journeys whose name contains this string (case-insensitive). ' +
          'Example: "Welcome Series" or "Re-engagement".'
      ),
  })
);
export type ListJourneysInput = z.infer<typeof ListJourneysInputSchema>;

export const GetJourneyInputSchema = lazySchema(() =>
  z.object({
    id: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Journey ID (UUID) returned by the listJourneys action. ' +
          'Example: "f5a2c9e1-3b7d-4f28-a1e2-9c4b0d3e5f6a".'
      ),
    versionNumber: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe(
        'Specific version number of the journey to retrieve. Omit to get the latest version. ' +
          'Use when you need to compare versions or audit historical configurations.'
      ),
  })
);
export type GetJourneyInput = z.infer<typeof GetJourneyInputSchema>;

export const ListDataExtensionsInputSchema = lazySchema(() =>
  z.object({
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (1-based, default 1).'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe('Number of Data Extensions per page (1–200, default 50).'),
  })
);
export type ListDataExtensionsInput = z.infer<typeof ListDataExtensionsInputSchema>;

export const ListEmailDefinitionsInputSchema = lazySchema(() =>
  z.object({
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .default(1)
      .describe('Page number for pagination (1-based, default 1).'),
    pageSize: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Number of definitions per page (1–100, default 20).'),
    status: z
      .enum(['active', 'inactive'])
      .optional()
      .describe(
        'Filter by send definition status: "active" (currently enabled) or "inactive" (disabled). ' +
          'Omit to return definitions of all statuses.'
      ),
  })
);
export type ListEmailDefinitionsInput = z.infer<typeof ListEmailDefinitionsInputSchema>;

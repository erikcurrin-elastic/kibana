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

/**
 * Search leads by a specific field and a set of values.
 * Marketo's bulk lead filter API supports up to 300 values per request.
 */
export const SearchLeadsInputSchema = lazySchema(() =>
  z.object({
    filterType: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Lead field to filter by. Common values: "email", "id", "mktoName" (full name). ' +
          'Custom fields use their REST API name (e.g. "customFieldName_c"). ' +
          'Use describeLeads to discover all available field names.'
      ),
    filterValues: z
      .array(z.string().min(1).max(500))
      .min(1)
      .max(300)
      .describe(
        'List of values to match against filterType (up to 300 values). ' +
          'Example: ["user@example.com", "other@example.com"] when filterType is "email".'
      ),
    fields: z
      .array(z.string().min(1).max(200))
      .optional()
      .describe(
        'Lead field names to include in the response. Omit to return all default fields. ' +
          'Example: ["firstName", "lastName", "email", "company"]. ' +
          'Use describeLeads to discover available field names.'
      ),
    nextPageToken: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Pagination token from a previous response (response.nextPageToken) to fetch the next page of results.'
      ),
  })
);
export type SearchLeadsInput = z.infer<typeof SearchLeadsInputSchema>;

/**
 * Get a single lead record by its Marketo integer ID.
 */
export const GetLeadInputSchema = lazySchema(() =>
  z.object({
    leadId: z
      .int()
      .positive()
      .describe(
        'Marketo lead integer ID. Returned as "id" by searchLeads and other lead endpoints.'
      ),
    fields: z
      .array(z.string().min(1).max(200))
      .optional()
      .describe(
        'Lead field names to include in the response. Omit to return all default fields. ' +
          'Example: ["firstName", "lastName", "email", "company", "phone"].'
      ),
  })
);
export type GetLeadInput = z.infer<typeof GetLeadInputSchema>;

/**
 * Get activities for one or more leads since a given date/time.
 * The handler fetches a paging token internally before calling the activities endpoint.
 */
export const GetLeadActivitiesInputSchema = lazySchema(() =>
  z.object({
    sinceDateTime: z
      .string()
      .min(1)
      .max(50)
      .optional()
      .describe(
        'ISO 8601 datetime indicating how far back to retrieve activities. ' +
          'Example: "2024-01-01T00:00:00Z". Marketo limits paging tokens to dates within the last 6 months. ' +
          'Required when nextPageToken is not provided.'
      ),
    leadIds: z
      .array(z.int().positive())
      .max(30)
      .optional()
      .describe(
        'Marketo lead IDs to filter activities by (up to 30). Omit to retrieve activities across all leads.'
      ),
    activityTypeIds: z
      .array(z.int().positive())
      .max(10)
      .optional()
      .describe(
        'Marketo activity type IDs to include (up to 10). Omit to return all activity types. ' +
          'Common IDs: 1 = Visit Webpage, 2 = Fill Out Form, 6 = Send Email, 7 = Email Delivered, 8 = Email Bounced, ' +
          '10 = Unsubscribe Email, 11 = Open Email, 12 = Click Email.'
      ),
    nextPageToken: z
      .string()
      .max(2000)
      .optional()
      .describe(
        'Pagination token from a previous response to fetch the next page. ' +
          'Supersedes sinceDateTime when provided.'
      ),
    maxReturn: z
      .int()
      .min(1)
      .max(300)
      .optional()
      .default(200)
      .describe('Maximum number of activities to return per page (1–300, default 200).'),
  })
);
export type GetLeadActivitiesInput = z.infer<typeof GetLeadActivitiesInputSchema>;

/**
 * List campaigns, optionally filtering by name or type.
 */
export const GetCampaignsInputSchema = lazySchema(() =>
  z.object({
    isTriggerable: z
      .boolean()
      .optional()
      .describe(
        'When true, returns only trigger-based (real-time) campaigns. ' +
          'When false, returns batch campaigns. Omit to return all campaigns.'
      ),
    programName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter to campaigns belonging to this program name. Example: "Q4 Nurture Program".'
      ),
    workspaceName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter to campaigns in this Marketo workspace. Only relevant in multi-workspace instances.'
      ),
    offset: z
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe('Offset for pagination (number of campaigns to skip, default 0).'),
    maxReturn: z
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(20)
      .describe('Maximum number of campaigns to return (1–200, default 20).'),
  })
);
export type GetCampaignsInput = z.infer<typeof GetCampaignsInputSchema>;

/**
 * Get static lists, optionally filtering by name.
 */
export const GetListsInputSchema = lazySchema(() =>
  z.object({
    name: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter by list name (exact match). Omit to return all static lists. ' +
          'Example: "Newsletter Subscribers".'
      ),
    programName: z
      .string()
      .max(200)
      .optional()
      .describe('Filter to static lists belonging to this program name.'),
    workspaceName: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter to lists in this Marketo workspace. Only relevant in multi-workspace setups.'
      ),
    offset: z
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe('Offset for pagination (number of lists to skip, default 0).'),
    maxReturn: z
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(20)
      .describe('Maximum number of lists to return (1–200, default 20).'),
  })
);
export type GetListsInput = z.infer<typeof GetListsInputSchema>;

/**
 * Describe lead fields — returns the full lead field schema including names, data types, and REST API names.
 */
export const DescribeLeadsInputSchema = lazySchema(() => z.object({}));
export type DescribeLeadsInput = z.infer<typeof DescribeLeadsInputSchema>;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { ConnectorSpec } from '../../connector_spec';
import type {
  SearchLeadsInput,
  GetLeadInput,
  GetLeadActivitiesInput,
  GetCampaignsInput,
  GetListsInput,
} from './types';
import {
  SearchLeadsInputSchema,
  GetLeadInputSchema,
  GetLeadActivitiesInputSchema,
  GetCampaignsInputSchema,
  GetListsInputSchema,
  DescribeLeadsInputSchema,
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives the Marketo REST API base URL from the OAuth token URL.
 *
 * Marketo identity URL format:
 *   https://{munchkin-id}.mktorest.com/identity/oauth/token
 *
 * REST API base URL format:
 *   https://{munchkin-id}.mktorest.com/rest
 */
const getBaseUrl = (tokenUrl: string | undefined): string => {
  if (!tokenUrl?.trim()) {
    throw new Error(
      'Marketo connector is not configured: OAuth token URL (tokenUrl) is required. ' +
        'Set it to https://{munchkin-id}.mktorest.com/identity/oauth/token.'
    );
  }
  const base = tokenUrl.includes('/identity/')
    ? tokenUrl.replace(/\/identity\/.*$/, '')
    : tokenUrl.replace(/\/+$/, '');
  return `${base}/rest`;
};

// ─── Connector ────────────────────────────────────────────────────────────────

export const MarketoConnector: ConnectorSpec = {
  metadata: {
    id: '.marketo',
    displayName: 'Marketo',
    description: i18n.translate('core.kibanaConnectorSpecs.marketo.metadata.description', {
      defaultMessage:
        'Search leads, retrieve activities, and list campaigns and static lists in Adobe Marketo Engage',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {},
        overrides: {
          meta: {
            tokenUrl: {
              placeholder: 'https://{munchkin-id}.mktorest.com/identity/oauth/token',
              helpText: i18n.translate('core.kibanaConnectorSpecs.marketo.auth.tokenUrl.helpText', {
                defaultMessage:
                  'OAuth 2.0 token endpoint for your Marketo instance. Replace {munchkin-id} with ' +
                  'your instance Munchkin ID (found in Marketo Admin > Integration > Munchkin).',
              }),
            },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    searchLeads: {
      isTool: true,
      description:
        'Filter Marketo leads by a field name and a list of values. Returns matching lead records with the ' +
        'requested fields. Use this to look up leads by email address, Marketo ID, name, or any other indexed field. ' +
        'Returns up to 300 leads per page; use nextPageToken from the response to fetch additional pages. ' +
        'Call describeLeads first to discover all available field names and their REST API names.',
      input: SearchLeadsInputSchema,
      handler: async (ctx, input: SearchLeadsInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const params: Record<string, unknown> = {
          filterType: input.filterType,
          filterValues: input.filterValues.join(','),
        };
        if (input.fields?.length) {
          params.fields = input.fields.join(',');
        }
        if (input.nextPageToken) {
          params.nextPageToken = input.nextPageToken;
        }
        const response = await ctx.client.get(`${baseUrl}/v1/leads.json`, { params });
        return response.data;
      },
    },

    getLead: {
      isTool: true,
      description:
        'Retrieve the full record for a single Marketo lead by its integer ID. Returns all default fields plus ' +
        'any additionally requested fields. Use searchLeads to obtain lead IDs before calling this action.',
      input: GetLeadInputSchema,
      handler: async (ctx, input: GetLeadInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const params: Record<string, unknown> = {};
        if (input.fields?.length) {
          params.fields = input.fields.join(',');
        }
        const response = await ctx.client.get(`${baseUrl}/v1/lead/${input.leadId}.json`, {
          params,
        });
        return response.data;
      },
    },

    getLeadActivities: {
      isTool: true,
      description:
        'Retrieve the activity history for Marketo leads since a given date. Returns events such as email opens, ' +
        'form fills, webpage visits, and campaign interactions. Optionally filter by specific lead IDs or ' +
        'activity type IDs. The handler fetches a paging token automatically — provide sinceDateTime for the ' +
        'first call, then use the returned nextPageToken for subsequent pages. ' +
        'Common activity type IDs: 1 = Visit Webpage, 2 = Fill Out Form, 6 = Send Email, ' +
        '7 = Email Delivered, 11 = Open Email, 12 = Click Email.',
      input: GetLeadActivitiesInputSchema,
      handler: async (ctx, input: GetLeadActivitiesInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);

        // Resolve the paging token: use provided nextPageToken or fetch a new one from sinceDateTime.
        let pagingToken: string;
        if (input.nextPageToken) {
          pagingToken = input.nextPageToken;
        } else {
          if (!input.sinceDateTime) {
            throw new Error('sinceDateTime is required when nextPageToken is not provided.');
          }
          const tokenResponse = await ctx.client.get(`${baseUrl}/v1/activities/pagingtoken.json`, {
            params: { sinceDatetime: input.sinceDateTime },
          });
          const tokenData = tokenResponse.data as { nextPageToken?: string };
          if (!tokenData.nextPageToken) {
            throw new Error(
              'Marketo did not return a paging token. Verify that sinceDateTime is within the last 6 months ' +
                'and is a valid ISO 8601 datetime string.'
            );
          }
          pagingToken = tokenData.nextPageToken;
        }

        const params: Record<string, unknown> = {
          nextPageToken: pagingToken,
        };
        if (input.activityTypeIds?.length) {
          params.activityTypeIds = input.activityTypeIds.join(',');
        }
        if (input.leadIds?.length) {
          params.leadIds = input.leadIds.join(',');
        }
        if (input.maxReturn !== undefined) {
          params.batchSize = input.maxReturn;
        }

        const response = await ctx.client.get(`${baseUrl}/v1/activities.json`, { params });
        return response.data;
      },
    },

    getCampaigns: {
      isTool: true,
      description:
        'List Marketo campaigns (both trigger-based and batch). Returns campaign IDs, names, statuses, and ' +
        'program associations. Use isTriggerable to narrow to real-time trigger campaigns or batch campaigns. ' +
        'Use the returned campaign IDs when scheduling or requesting a campaign run.',
      input: GetCampaignsInputSchema,
      handler: async (ctx, input: GetCampaignsInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const params: Record<string, unknown> = {
          offset: input.offset ?? 0,
          maxReturn: input.maxReturn ?? 20,
        };
        if (input.isTriggerable !== undefined) {
          params.isTriggerable = input.isTriggerable;
        }
        if (input.programName) {
          params.programName = input.programName;
        }
        if (input.workspaceName) {
          params.workspaceName = input.workspaceName;
        }
        const response = await ctx.client.get(`${baseUrl}/v1/campaigns.json`, { params });
        return response.data;
      },
    },

    getLists: {
      isTool: true,
      description:
        'List Marketo static lists. Returns list IDs, names, program associations, and creation/update dates. ' +
        'Static lists are used to segment leads for batch campaigns and program membership. ' +
        'Use the returned list IDs to identify which leads belong to a list (via a separate Lead Database API call).',
      input: GetListsInputSchema,
      handler: async (ctx, input: GetListsInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const params: Record<string, unknown> = {
          offset: input.offset ?? 0,
          maxReturn: input.maxReturn ?? 20,
        };
        if (input.name) {
          params.name = input.name;
        }
        if (input.programName) {
          params.programName = input.programName;
        }
        if (input.workspaceName) {
          params.workspaceName = input.workspaceName;
        }
        const response = await ctx.client.get(`${baseUrl}/v1/lists.json`, { params });
        return response.data;
      },
    },

    describeLeads: {
      isTool: true,
      description:
        'Retrieve the complete lead field schema for this Marketo instance. Returns all field names, their REST API ' +
        'names (used in searchLeads filterType and fields), data types, and whether each field is searchable. ' +
        'Call this before searchLeads when you are unsure which field name to use as filterType. ' +
        'Marketo custom fields have names ending in "_c" by convention.',
      input: DescribeLeadsInputSchema,
      handler: async (ctx) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const response = await ctx.client.get(`${baseUrl}/v1/leads/describe.json`);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate('core.kibanaConnectorSpecs.marketo.test.description', {
      defaultMessage:
        'Verifies connection to the Marketo REST API by retrieving the lead field schema.',
    }),
    handler: async (ctx) => {
      try {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const response = await ctx.client.get(`${baseUrl}/v1/leads/describe.json`, {
          validateStatus: () => true,
        });
        if (response.status === 200) {
          const data = response.data as { result?: unknown[] };
          const fieldCount = data.result?.length ?? 0;
          return {
            ok: true,
            message: `Successfully connected to Marketo REST API. Lead schema contains ${fieldCount} fields.`,
          };
        }
        return {
          ok: false,
          message:
            `Marketo API returned status ${response.status}. Verify that your client ID, client secret, ` +
            `and token URL are correct and that the LaunchPoint service has the appropriate API permissions.`,
        };
      } catch (error) {
        const err = error as { message?: string };
        return { ok: false, message: err.message ?? 'Unknown error connecting to Marketo API' };
      }
    },
  },

  skill: [
    '## Marketo Connector — usage guidance',
    '',
    '### Finding leads',
    'To look up leads: call `searchLeads` with filterType="email" and filterValues=["user@example.com"].',
    'Alternatively, filter by "id", "mktoName" (full name), or any other indexed field.',
    'Call `describeLeads` first when you do not know the correct filterType field name.',
    'Lead IDs returned by `searchLeads` can be passed to `getLead` for the full field set.',
    '',
    '### Retrieving activity history',
    'Call `getLeadActivities` with a `sinceDateTime` (ISO 8601, within the last 6 months).',
    'Provide `leadIds` to scope activities to specific leads (up to 30 at a time).',
    'Provide `activityTypeIds` to limit to specific event types (e.g. [11, 12] for email opens and clicks).',
    'The response includes a `nextPageToken` — pass it back to retrieve additional pages.',
    '',
    '### Campaigns and lists',
    'Use `getCampaigns` to list available campaigns and obtain their IDs.',
    '`getLists` returns static list IDs and names; these are used to segment leads.',
    'Marketo also has Smart Lists (dynamic) — those are not covered by this connector.',
    '',
    '### Common gotchas',
    '- The paging token for `getLeadActivities` is based on a datetime, not a record cursor.',
    '  Always start with `sinceDateTime`; pagination uses the returned `nextPageToken`.',
    '- Activity type IDs are universal (not instance-specific), but custom activity types have numeric IDs assigned at instance creation.',
    '- `searchLeads` filterValues is comma-separated; do not use more than 300 values per request.',
  ].join('\n'),
};

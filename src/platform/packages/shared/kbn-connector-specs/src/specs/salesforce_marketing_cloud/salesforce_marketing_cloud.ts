/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import type {
  LookupSubscriberInput,
  QueryDataExtensionInput,
  ListJourneysInput,
  GetJourneyInput,
  ListEmailDefinitionsInput,
} from './types';
import {
  LookupSubscriberInputSchema,
  QueryDataExtensionInputSchema,
  ListJourneysInputSchema,
  GetJourneyInputSchema,
  ListEmailDefinitionsInputSchema,
} from './types';

/** Extract the REST API base URL from the connector config. */
function getRestApiBase(config: Record<string, unknown>): string {
  const url = config?.restApiBaseUrl as string | undefined;
  if (!url || url.trim() === '') {
    throw new Error(
      'Salesforce Marketing Cloud connector is not configured: restApiBaseUrl is required.'
    );
  }
  return url.replace(/\/+$/, '');
}

export const SalesforceMarketingCloudConnector: ConnectorSpec = {
  metadata: {
    id: '.salesforce_marketing_cloud',
    displayName: 'Salesforce Marketing Cloud',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforceMarketingCloud.metadata.description',
      {
        defaultMessage:
          'Look up subscribers, query Data Extensions, and inspect journeys and email campaigns in Salesforce Marketing Cloud.',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: '',
        },
        overrides: {
          meta: {
            scope: { hidden: true },
            tokenUrl: {
              placeholder:
                'https://{subdomain}.auth.marketingcloudapis.com/v2/token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.salesforceMarketingCloud.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'OAuth 2.0 token endpoint for your SFMC tenant. Replace {subdomain} with your account subdomain ' +
                    '(e.g. mc563885gzs27c5t9-63k636ttgm). Find it in SFMC Setup > Platform > Apps > Installed Packages.',
                }
              ),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      restApiBaseUrl: UISchemas.url()
        .describe('Salesforce Marketing Cloud REST API base URL for this tenant')
        .meta({
          widget: 'text',
          placeholder: 'https://{subdomain}.rest.marketingcloudapis.com',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceMarketingCloud.config.restApiBaseUrl.label',
            { defaultMessage: 'REST API Base URL' }
          ),
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceMarketingCloud.config.restApiBaseUrl.helpText',
            {
              defaultMessage:
                'The REST API endpoint for your SFMC tenant (e.g. https://mc563885gzs27c5t9-63k636ttgm.rest.marketingcloudapis.com). ' +
                'Use the same subdomain as your Token URL.',
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['restApiBaseUrl'],
  },

  actions: {
    // ── Subscriber lookup ─────────────────────────────────────────────────────
    lookupSubscriber: {
      isTool: true,
      description:
        'Look up a subscriber (contact) in the Salesforce Marketing Cloud All Subscribers list by ' +
        'email address. Returns the subscriber record including status, subscriber key, and all ' +
        'profile attributes. Use this to check opt-in status, validate whether an email address is ' +
        'known to SFMC, or retrieve subscriber details before triggering a journey.',
      input: LookupSubscriberInputSchema,
      handler: async (ctx, input: LookupSubscriberInput) => {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        const escapedEmail = input.email.replace(/'/g, "''");
        const params: Record<string, string> = {
          '$filter': `emailAddress eq '${escapedEmail}'`,
        };
        if (input.properties && input.properties.length > 0) {
          params['$select'] = input.properties.join(',');
        }
        const response = await ctx.client.get(`${base}/contacts/v1/contacts`, { params });
        return response.data;
      },
    },

    // ── Data Extension query ──────────────────────────────────────────────────
    queryDataExtension: {
      isTool: true,
      description:
        'Query rows from a Salesforce Marketing Cloud Data Extension by its external key. ' +
        'Data Extensions are custom tables used throughout SFMC to store contacts, campaign data, ' +
        'purchase history, preferences, and more. Supports optional OData-style filtering and ' +
        'pagination. Returns the matching rows with all column values. ' +
        'Use this to read any structured data stored in SFMC.',
      input: QueryDataExtensionInputSchema,
      handler: async (ctx, input: QueryDataExtensionInput) => {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        const keySegment = encodeURIComponent(input.externalKey);
        const params: Record<string, string | number> = {
          '$pageSize': input.pageSize ?? 50,
          '$page': input.page ?? 1,
        };
        if (input.filter) {
          params['$filter'] = input.filter;
        }
        const response = await ctx.client.get(
          `${base}/data/v1/customobjectdata/key/${keySegment}/rowset`,
          { params }
        );
        return response.data;
      },
    },

    // ── Journeys ──────────────────────────────────────────────────────────────
    listJourneys: {
      isTool: true,
      description:
        'List Journey Builder journeys in Salesforce Marketing Cloud. Returns journey names, IDs, ' +
        'versions, current publication status, and associated statistics. Supports filtering by ' +
        'status ("Published", "Draft", "Stopped", etc.) and name substring. Use this to discover ' +
        'which journeys are active, or to find the ID of a journey before calling getJourney for ' +
        'full details.',
      input: ListJourneysInputSchema,
      handler: async (ctx, input: ListJourneysInput) => {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        const params: Record<string, string | number> = {
          page: input.page ?? 1,
          pageSize: input.pageSize ?? 10,
        };
        if (input.status) {
          params.status = input.status;
        }
        if (input.nameFilter) {
          params.nameFilter = input.nameFilter;
        }
        const response = await ctx.client.get(`${base}/interaction/v1/interactions`, { params });
        return response.data;
      },
    },

    getJourney: {
      isTool: true,
      description:
        'Retrieve the full definition of a Salesforce Marketing Cloud Journey Builder journey by ' +
        'its ID. Returns the complete journey configuration including all activities (emails, waits, ' +
        'decisions, splits), entry sources, schedule settings, and version history. Use listJourneys ' +
        'first to obtain the journey ID.',
      input: GetJourneyInputSchema,
      handler: async (ctx, input: GetJourneyInput) => {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        const idSegment = encodeURIComponent(input.id);
        const params: Record<string, string | number> = {};
        if (input.versionNumber != null) {
          params.versionNumber = input.versionNumber;
        }
        const response = await ctx.client.get(
          `${base}/interaction/v1/interactions/${idSegment}`,
          { params }
        );
        return response.data;
      },
    },

    // ── Email campaign definitions ────────────────────────────────────────────
    listEmailDefinitions: {
      isTool: true,
      description:
        'List email send definitions configured in Salesforce Marketing Cloud. Each definition ' +
        'represents an email campaign or transactional send setup, including the email content, ' +
        'target Data Extension, and send classification. Returns name, key, status, description, ' +
        'and creation date. Use this to discover available campaigns or verify that a specific ' +
        'send definition is active.',
      input: ListEmailDefinitionsInputSchema,
      handler: async (ctx, input: ListEmailDefinitionsInput) => {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        const params: Record<string, string | number> = {
          page: input.page ?? 1,
          pageSize: input.pageSize ?? 20,
        };
        if (input.status) {
          params.status = input.status;
        }
        const response = await ctx.client.get(`${base}/messaging/v1/email/definitions`, {
          params,
        });
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforceMarketingCloud.test.description',
      {
        defaultMessage:
          'Verifies connection to the Salesforce Marketing Cloud REST API by fetching the journey list.',
      }
    ),
    handler: async (ctx) => {
      try {
        const base = getRestApiBase(ctx.config as Record<string, unknown>);
        await ctx.client.get(`${base}/interaction/v1/interactions`, {
          params: { page: 1, pageSize: 1 },
        });
        return {
          ok: true,
          message: 'Successfully connected to Salesforce Marketing Cloud REST API.',
        };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },

  skill: [
    '## Salesforce Marketing Cloud connector — LLM usage guide',
    '',
    '### Authentication and configuration',
    'This connector uses OAuth 2.0 Client Credentials. The Token URL and REST API Base URL are both',
    'tenant-specific: replace `{subdomain}` with your account subdomain (visible in SFMC Setup ▶',
    'Platform ▶ Apps ▶ Installed Packages ▶ your package ▶ API Integration).',
    '',
    '### Subscriber lookup',
    'A "Bounced" or "Unsubscribed" status means the address will not receive future sends.',
    '',
    '### Data Extensions',
    'Data Extensions are SFMC\'s primary data storage (similar to database tables).',
    'The All Subscribers list can itself be queried as a Data Extension with key `All Subscribers`.',
    '',
    '### Journeys',
    'Journey IDs are UUIDs that stay stable across versions; use `versionNumber` to fetch a',
    'specific historical version.',
    '',
    '### Email send definitions',
    'A definition with status "active" is currently enabled for sending.',
  ].join('\n'),
};

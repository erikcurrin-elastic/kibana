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
  SearchProductsInput,
  GetProductInput,
  SearchOrdersInput,
  GetOrderInput,
  SearchCustomersInput,
} from './types';
import {
  SearchProductsInputSchema,
  GetProductInputSchema,
  SearchOrdersInputSchema,
  GetOrderInputSchema,
  SearchCustomersInputSchema,
} from './types';

const OCAPI_VERSION = 'v24.3';

/** Build the OCAPI Data API base URL from the instance URL and site ID. */
function getDataApiBase(instanceUrl: string, siteId: string): string {
  const trimmed = instanceUrl.replace(/\/+$/, '');
  const site = siteId && siteId.trim() !== '' ? encodeURIComponent(siteId.trim()) : '-';
  return `${trimmed}/s/${site}/dw/data/${OCAPI_VERSION}`;
}

/** Read and validate instance URL + siteId from the connector config. */
function getApiBase(ctx: { config?: Record<string, unknown> }): string {
  const instanceUrl = ctx.config?.instanceUrl as string | undefined;
  const siteId = (ctx.config?.siteId as string | undefined) ?? '-';
  if (!instanceUrl || instanceUrl.trim() === '') {
    throw new Error(
      'Salesforce Commerce Cloud connector is not configured: instanceUrl is required.'
    );
  }
  return getDataApiBase(instanceUrl, siteId);
}

export const SalesforceCommerceCloudConnector: ConnectorSpec = {
  metadata: {
    id: '.salesforce_commerce_cloud',
    displayName: 'Salesforce Commerce Cloud',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforceCommerceCloud.metadata.description',
      {
        defaultMessage:
          'Search products, retrieve orders, and look up customers in Salesforce Commerce Cloud',
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
        defaults: {},
        overrides: {
          meta: {
            tokenUrl: {
              placeholder: 'https://account.demandware.com/dw/oauth2/access_token',
              helpText: i18n.translate(
                'core.kibanaConnectorSpecs.salesforceCommerceCloud.auth.tokenUrl.helpText',
                {
                  defaultMessage:
                    'OAuth 2.0 token endpoint. For Business Manager accounts use the Account Manager URL. ' +
                    'For ECDN environments use your instance-specific token endpoint.',
                }
              ),
            },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      instanceUrl: UISchemas.url()
        .describe(
          'Base URL of your Salesforce Commerce Cloud instance. ' +
            'Example: https://xxxx-xxx.dx.commercecloud.salesforce.com'
        )
        .meta({
          widget: 'text',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceCommerceCloud.config.instanceUrl.label',
            {
              defaultMessage: 'Instance URL',
            }
          ),
          placeholder: 'https://xxxx-xxx.dx.commercecloud.salesforce.com',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceCommerceCloud.config.instanceUrl.helpText',
            {
              defaultMessage:
                'The hostname of your Salesforce Commerce Cloud instance. ' +
                'Find it in Business Manager under Administration > Site Development > Open Commerce API Settings.',
            }
          ),
        }),
      siteId: z
        .string()
        .max(200)
        .default('-')
        .describe(
          'SFCC site ID (e.g. SiteGenesis, RefArch). ' +
            'Use "-" for the global data scope (not site-specific).'
        )
        .meta({
          widget: 'text',
          label: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceCommerceCloud.config.siteId.label',
            {
              defaultMessage: 'Site ID',
            }
          ),
          placeholder: 'RefArch',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.salesforceCommerceCloud.config.siteId.helpText',
            {
              defaultMessage:
                'The site ID configured in Business Manager. ' +
                'Use "-" to access data across all sites (global scope). ' +
                'Find site IDs under Administration > Sites > Manage Sites.',
            }
          ),
        }),
    })
  ),

  validateUrls: {
    fields: ['instanceUrl'],
  },

  actions: {
    searchProducts: {
      isTool: true,
      description:
        'Search the Salesforce Commerce Cloud product catalog by keyword. ' +
        'Returns a list of matching products with IDs, names, prices, and availability. ' +
        'Use this to find products before retrieving full details with getProduct. ' +
        'Supports pagination via the start parameter.',
      input: SearchProductsInputSchema,
      handler: async (ctx, input: SearchProductsInput) => {
        const base = getApiBase(ctx);
        const params: Record<string, unknown> = {
          q: input.query,
          count: input.count ?? 10,
          start: input.start ?? 0,
        };
        if (input.expand && input.expand.length > 0) {
          params.expand = input.expand.join(',');
        }
        const response = await ctx.client.get(`${base}/product_search`, { params });
        return response.data;
      },
    },

    getProduct: {
      isTool: true,
      description:
        'Retrieve full details for a single product by its ID from Salesforce Commerce Cloud. ' +
        'Returns the complete product record including name, description, price tiers, images, ' +
        'variants, inventory, and custom attributes. ' +
        'Use IDs returned by searchProducts.',
      input: GetProductInputSchema,
      handler: async (ctx, input: GetProductInput) => {
        const base = getApiBase(ctx);
        const id = encodeURIComponent(input.productId.trim());
        const params: Record<string, unknown> = {};
        if (input.expand && input.expand.length > 0) {
          params.expand = input.expand.join(',');
        }
        const response = await ctx.client.get(`${base}/products/${id}`, { params });
        return response.data;
      },
    },

    searchOrders: {
      isTool: true,
      description:
        'Search orders in Salesforce Commerce Cloud using optional filters: status, customer email, ' +
        'and creation date range. Returns a list of matching orders with order numbers, totals, ' +
        'statuses, and customer information. ' +
        'Use getOrder with an order number to retrieve full line item and payment details.',
      input: SearchOrdersInputSchema,
      handler: async (ctx, input: SearchOrdersInput) => {
        const base = getApiBase(ctx);

        // Build OCAPI query from provided filters
        const mustClauses: Array<Record<string, unknown>> = [];

        if (input.status) {
          mustClauses.push({
            term_query: {
              fields: ['status'],
              operator: 'is',
              values: [input.status],
            },
          });
        }

        if (input.customerEmail) {
          mustClauses.push({
            term_query: {
              fields: ['customer_info.email'],
              operator: 'is',
              values: [input.customerEmail],
            },
          });
        }

        if (input.createdFrom || input.createdTo) {
          const rangeFilter: Record<string, unknown> = {
            field: 'creation_date',
          };
          if (input.createdFrom) {
            rangeFilter.from = input.createdFrom;
            rangeFilter.from_inclusive = true;
          }
          if (input.createdTo) {
            rangeFilter.to = input.createdTo;
            rangeFilter.to_inclusive = true;
          }
          mustClauses.push({ range_query: rangeFilter });
        }

        let query: Record<string, unknown>;
        if (mustClauses.length === 0) {
          query = { match_all_query: {} };
        } else if (mustClauses.length === 1) {
          query = mustClauses[0];
        } else {
          query = { bool_query: { must: mustClauses } };
        }

        const body: Record<string, unknown> = {
          count: input.count ?? 10,
          start: input.start ?? 0,
          query,
        };

        const response = await ctx.client.post(`${base}/order_search`, body);
        return response.data;
      },
    },

    getOrder: {
      isTool: true,
      description:
        'Retrieve full details for a single order by its order number from Salesforce Commerce Cloud. ' +
        'Returns the complete order record including line items, product details, payment instruments, ' +
        'shipment information, and customer data. ' +
        'Use order numbers returned by searchOrders.',
      input: GetOrderInputSchema,
      handler: async (ctx, input: GetOrderInput) => {
        const base = getApiBase(ctx);
        const orderNo = encodeURIComponent(input.orderNo.trim());
        const response = await ctx.client.get(`${base}/orders/${orderNo}`);
        return response.data;
      },
    },

    searchCustomers: {
      isTool: true,
      description:
        'Search customers in Salesforce Commerce Cloud by email address, name, or customer number. ' +
        'Returns a list of matching customer profiles including customer IDs, names, email addresses, ' +
        'and registration dates. ' +
        'To find all orders placed by a customer, use searchOrders with the customerEmail filter.',
      input: SearchCustomersInputSchema,
      handler: async (ctx, input: SearchCustomersInput) => {
        const base = getApiBase(ctx);
        const body: Record<string, unknown> = {
          count: input.count ?? 10,
          start: input.start ?? 0,
          query: {
            text_query: {
              fields: ['email', 'first_name', 'last_name', 'customer_no'],
              search_phrase: input.query,
            },
          },
        };
        const response = await ctx.client.post(`${base}/customer_search`, body);
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforceCommerceCloud.test.description',
      {
        defaultMessage:
          'Verifies connection to the Salesforce Commerce Cloud API by running a product search.',
      }
    ),
    handler: async (ctx) => {
      try {
        const base = getApiBase(ctx);
        await ctx.client.get(`${base}/product_search`, {
          params: { q: '*', count: 1 },
        });
        return { ok: true, message: 'Successfully connected to Salesforce Commerce Cloud API' };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },

  skill: [
    '## Salesforce Commerce Cloud connector — LLM usage guide',
    '',
    '### Finding products',
    'Use `searchProducts` to find products by keyword, SKU, or product name.',
    'Results include product IDs, names, and basic pricing. Follow up with `getProduct` using a product ID',
    'to retrieve full details: descriptions, all variants, image URLs, availability, and custom attributes.',
    '',
    '### Finding orders',
    'Use `searchOrders` with optional filters (status, customer email, date range) to locate orders.',
    'The response lists order numbers, totals, and statuses.',
    'Use `getOrder` with an order number for the complete record: line items, payment instruments, and shipments.',
    '',
    '### Finding customers',
    'Use `searchCustomers` with an email address, name, or customer number.',
    'To find all orders for a specific customer, call `searchOrders` with the `customerEmail` parameter set to their email.',
    '',
    '### Pagination',
    'All search actions support `count` (page size) and `start` (zero-based offset).',
    'To fetch the next page, increment `start` by `count` and call the action again.',
    '',
    '### Common gotchas',
    '- The `instanceUrl` must include the full URL with protocol (e.g. `https://xxxx-xxx.dx.commercecloud.salesforce.com`).',
    '- The `siteId` must exactly match a site ID configured in Business Manager. Use "-" for global scope.',
    '- Product IDs are case-sensitive in SFCC — use the exact IDs returned by `searchProducts`.',
    '- Order numbers are alphanumeric strings (e.g. "00000101") — use exact values from `searchOrders`.',
  ].join('\n'),
};

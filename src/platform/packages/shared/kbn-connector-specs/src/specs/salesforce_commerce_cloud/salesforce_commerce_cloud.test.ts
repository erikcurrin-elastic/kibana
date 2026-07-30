/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SalesforceCommerceCloudConnector } from './salesforce_commerce_cloud';

describe('SalesforceCommerceCloudConnector', () => {
  const INSTANCE_URL = 'https://xxxx-xxx.dx.commercecloud.salesforce.com';
  const SITE_ID = 'RefArch';

  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { instanceUrl: INSTANCE_URL, siteId: SITE_ID },
    log: { debug: jest.fn(), error: jest.fn(), info: jest.fn() },
  } as unknown as ActionContext;

  const DATA_API_BASE = `${INSTANCE_URL}/s/${SITE_ID}/dw/data/v24.3`;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has correct connector id', () => {
      expect(SalesforceCommerceCloudConnector.metadata.id).toBe('.salesforce_commerce_cloud');
    });

    it('requires enterprise license', () => {
      expect(SalesforceCommerceCloudConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(SalesforceCommerceCloudConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(SalesforceCommerceCloudConnector.metadata.supportedFeatureIds).toContain(
        'agentBuilder'
      );
    });

    it('is marked as technical preview', () => {
      expect(SalesforceCommerceCloudConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('uses oauth_client_credentials auth', () => {
      const types = (
        SalesforceCommerceCloudConnector.auth?.types as Array<string | { type: string }>
      ).map((t) => (typeof t === 'string' ? t : t.type));
      expect(types).toContain('oauth_client_credentials');
    });

    it('hides the scope field', () => {
      const oauthType = (
        SalesforceCommerceCloudConnector.auth?.types as Array<{
          type: string;
          overrides?: { meta?: Record<string, unknown> };
        }>
      ).find((t) => t.type === 'oauth_client_credentials');
      expect(oauthType?.overrides?.meta?.scope).toEqual({ hidden: true });
    });
  });

  describe('schema', () => {
    it('has instanceUrl and siteId fields', () => {
      if (!SalesforceCommerceCloudConnector.schema) throw new Error('schema not defined');
      const parsed = SalesforceCommerceCloudConnector.schema.parse({
        instanceUrl: INSTANCE_URL,
        siteId: 'SiteGenesis',
      });
      expect((parsed as { instanceUrl: string }).instanceUrl).toBe(INSTANCE_URL);
      expect((parsed as { siteId: string }).siteId).toBe('SiteGenesis');
    });

    it('defaults siteId to "-" when not provided', () => {
      if (!SalesforceCommerceCloudConnector.schema) throw new Error('schema not defined');
      const parsed = SalesforceCommerceCloudConnector.schema.parse({
        instanceUrl: INSTANCE_URL,
      });
      expect((parsed as { siteId: string }).siteId).toBe('-');
    });
  });

  describe('validateUrls', () => {
    it('validates the instanceUrl field', () => {
      expect(SalesforceCommerceCloudConnector.validateUrls?.fields).toContain('instanceUrl');
    });
  });

  describe('all actions are exposed as tools', () => {
    it('has isTool: true on all agent-facing actions', () => {
      const actions = SalesforceCommerceCloudConnector.actions;
      for (const [name, action] of Object.entries(actions)) {
        expect({ name, isTool: action.isTool }).toEqual({ name, isTool: true });
      }
    });
  });

  describe('searchProducts action', () => {
    it('calls the product_search endpoint with query and defaults', async () => {
      const mockResponse = {
        data: {
          count: 1,
          hits: [{ product_id: 'P001', product_name: 'Blue Jeans', price: 49.99 }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceCommerceCloudConnector.actions.searchProducts.handler(
        mockContext,
        { query: 'blue jeans', count: 10, start: 0 }
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/product_search`, {
        params: { q: 'blue jeans', count: 10, start: 0 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('includes expand parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchProducts.handler(mockContext, {
        query: 'jacket',
        expand: ['availability', 'images'],
        count: 10,
        start: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/product_search`, {
        params: { q: 'jacket', count: 10, start: 0, expand: 'availability,images' },
      });
    });

    it('supports pagination via start parameter', async () => {
      mockClient.get.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchProducts.handler(mockContext, {
        query: 'shirt',
        count: 20,
        start: 20,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/product_search`, {
        params: { q: 'shirt', count: 20, start: 20 },
      });
    });
  });

  describe('getProduct action', () => {
    it('calls the products endpoint with the product ID', async () => {
      const mockResponse = {
        data: {
          id: 'P001',
          name: 'Blue Jeans',
          price: 49.99,
          inventory: { ats: 120 },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceCommerceCloudConnector.actions.getProduct.handler(
        mockContext,
        { productId: 'P001' }
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/products/P001`, { params: {} });
      expect(result).toEqual(mockResponse.data);
    });

    it('URL-encodes product IDs with special characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await SalesforceCommerceCloudConnector.actions.getProduct.handler(mockContext, {
        productId: 'P 001',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/products/P%20001`, {
        params: {},
      });
    });

    it('includes expand parameter when provided', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await SalesforceCommerceCloudConnector.actions.getProduct.handler(mockContext, {
        productId: 'P001',
        expand: ['variations', 'prices'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/products/P001`, {
        params: { expand: 'variations,prices' },
      });
    });
  });

  describe('searchOrders action', () => {
    it('uses match_all_query when no filters are provided', async () => {
      const mockResponse = {
        data: { count: 2, hits: [{ order_no: '00000101' }, { order_no: '00000102' }] },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SalesforceCommerceCloudConnector.actions.searchOrders.handler(
        mockContext,
        { count: 10, start: 0 }
      );

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/order_search`, {
        count: 10,
        start: 0,
        query: { match_all_query: {} },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('filters by status using term_query', async () => {
      mockClient.post.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchOrders.handler(mockContext, {
        status: 'new',
        count: 10,
        start: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/order_search`, {
        count: 10,
        start: 0,
        query: {
          term_query: { fields: ['status'], operator: 'is', values: ['new'] },
        },
      });
    });

    it('filters by customer email using term_query', async () => {
      mockClient.post.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchOrders.handler(mockContext, {
        customerEmail: 'jane@example.com',
        count: 10,
        start: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/order_search`, {
        count: 10,
        start: 0,
        query: {
          term_query: {
            fields: ['customer_info.email'],
            operator: 'is',
            values: ['jane@example.com'],
          },
        },
      });
    });

    it('combines multiple filters with bool_query.must', async () => {
      mockClient.post.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchOrders.handler(mockContext, {
        status: 'completed',
        customerEmail: 'jane@example.com',
        count: 10,
        start: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/order_search`, {
        count: 10,
        start: 0,
        query: {
          bool_query: {
            must: [
              { term_query: { fields: ['status'], operator: 'is', values: ['completed'] } },
              {
                term_query: {
                  fields: ['customer_info.email'],
                  operator: 'is',
                  values: ['jane@example.com'],
                },
              },
            ],
          },
        },
      });
    });

    it('applies date range filter when createdFrom and createdTo are provided', async () => {
      mockClient.post.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchOrders.handler(mockContext, {
        createdFrom: '2024-01-01T00:00:00Z',
        createdTo: '2024-12-31T23:59:59Z',
        count: 10,
        start: 0,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/order_search`, {
        count: 10,
        start: 0,
        query: {
          range_query: {
            field: 'creation_date',
            from: '2024-01-01T00:00:00Z',
            from_inclusive: true,
            to: '2024-12-31T23:59:59Z',
            to_inclusive: true,
          },
        },
      });
    });
  });

  describe('getOrder action', () => {
    it('calls the orders endpoint with the order number', async () => {
      const mockResponse = {
        data: {
          order_no: '00000101',
          status: 'completed',
          order_total: 129.95,
          product_items: [{ product_id: 'P001', item_text: 'Blue Jeans', quantity: 2 }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceCommerceCloudConnector.actions.getOrder.handler(mockContext, {
        orderNo: '00000101',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/orders/00000101`);
      expect(result).toEqual(mockResponse.data);
    });

    it('URL-encodes order numbers with special characters', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await SalesforceCommerceCloudConnector.actions.getOrder.handler(mockContext, {
        orderNo: 'W 12345',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/orders/W%2012345`);
    });
  });

  describe('searchCustomers action', () => {
    it('calls customer_search with a text_query', async () => {
      const mockResponse = {
        data: {
          count: 1,
          hits: [
            {
              customer_id: 'C001',
              first_name: 'Jane',
              last_name: 'Doe',
              email: 'jane@example.com',
            },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SalesforceCommerceCloudConnector.actions.searchCustomers.handler(
        mockContext,
        { query: 'jane@example.com', count: 10, start: 0 }
      );

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/customer_search`, {
        count: 10,
        start: 0,
        query: {
          text_query: {
            fields: ['email', 'first_name', 'last_name', 'customer_no'],
            search_phrase: 'jane@example.com',
          },
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('supports pagination via start parameter', async () => {
      mockClient.post.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchCustomers.handler(mockContext, {
        query: 'Doe',
        count: 20,
        start: 20,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${DATA_API_BASE}/customer_search`, {
        count: 20,
        start: 20,
        query: {
          text_query: {
            fields: ['email', 'first_name', 'last_name', 'customer_no'],
            search_phrase: 'Doe',
          },
        },
      });
    });
  });

  describe('test handler', () => {
    it('returns ok when the product_search endpoint is reachable', async () => {
      mockClient.get.mockResolvedValue({ data: { count: 1, hits: [] } });

      if (!SalesforceCommerceCloudConnector.test) {
        throw new Error('test handler not defined');
      }
      const result = await SalesforceCommerceCloudConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${DATA_API_BASE}/product_search`, {
        params: { q: '*', count: 1 },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Salesforce Commerce Cloud API',
      });
    });

    it('returns not ok when the API call throws', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      if (!SalesforceCommerceCloudConnector.test) {
        throw new Error('test handler not defined');
      }
      const result = await SalesforceCommerceCloudConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect((result as { ok: boolean; message: string }).message).toBe('ECONNREFUSED');
    });

    it('returns not ok when instanceUrl is missing', async () => {
      const ctxWithoutUrl = {
        ...mockContext,
        config: { instanceUrl: '', siteId: 'RefArch' },
      } as unknown as ActionContext;

      if (!SalesforceCommerceCloudConnector.test) {
        throw new Error('test handler not defined');
      }
      const result = await SalesforceCommerceCloudConnector.test.handler(ctxWithoutUrl);

      expect(result.ok).toBe(false);
      expect((result as { ok: boolean; message: string }).message).toContain('instanceUrl');
    });
  });

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(SalesforceCommerceCloudConnector.skill).toBeDefined();
      expect(typeof SalesforceCommerceCloudConnector.skill).toBe('string');
      expect(SalesforceCommerceCloudConnector.skill).toContain('searchProducts');
      expect(SalesforceCommerceCloudConnector.skill).toContain('getProduct');
      expect(SalesforceCommerceCloudConnector.skill).toContain('searchOrders');
      expect(SalesforceCommerceCloudConnector.skill).toContain('searchCustomers');
    });
  });

  describe('global scope (siteId = -)', () => {
    const globalCtx = {
      client: mockClient,
      config: { instanceUrl: INSTANCE_URL, siteId: '-' },
      log: { debug: jest.fn(), error: jest.fn() },
    } as unknown as ActionContext;

    const GLOBAL_BASE = `${INSTANCE_URL}/s/-/dw/data/v24.3`;

    it('uses global scope URL when siteId is "-"', async () => {
      mockClient.get.mockResolvedValue({ data: { hits: [] } });

      await SalesforceCommerceCloudConnector.actions.searchProducts.handler(globalCtx, {
        query: 'test',
        count: 10,
        start: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${GLOBAL_BASE}/product_search`, {
        params: { q: 'test', count: 10, start: 0 },
      });
    });
  });
});

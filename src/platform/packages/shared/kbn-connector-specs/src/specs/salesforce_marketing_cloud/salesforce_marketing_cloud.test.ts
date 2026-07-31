/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SalesforceMarketingCloudConnector } from './salesforce_marketing_cloud';

describe('SalesforceMarketingCloudConnector', () => {
  const REST_BASE = 'https://mc563885gzs27c5t9-63k636ttgm.rest.marketingcloudapis.com';

  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { restApiBaseUrl: REST_BASE },
    secrets: {},
    log: { debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Metadata ────────────────────────────────────────────────────────────────

  describe('metadata', () => {
    it('has the correct connector ID', () => {
      expect(SalesforceMarketingCloudConnector.metadata.id).toBe('.salesforce_marketing_cloud');
    });

    it('requires enterprise license', () => {
      expect(SalesforceMarketingCloudConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(SalesforceMarketingCloudConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(SalesforceMarketingCloudConnector.metadata.supportedFeatureIds).toContain(
        'agentBuilder'
      );
    });

    it('is marked as technical preview', () => {
      expect(SalesforceMarketingCloudConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  // ── Auth ────────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('uses oauth_client_credentials', () => {
      const types = (
        SalesforceMarketingCloudConnector.auth?.types as Array<string | { type: string }>
      ).map((t) => (typeof t === 'string' ? t : t.type));
      expect(types).toContain('oauth_client_credentials');
    });

    it('hides the scope field', () => {
      const oauthType = SalesforceMarketingCloudConnector.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_client_credentials'
      ) as { overrides?: { meta?: Record<string, unknown> } } | undefined;
      expect(oauthType?.overrides?.meta?.scope).toMatchObject({ hidden: true });
    });
  });

  // ── Schema ──────────────────────────────────────────────────────────────────

  describe('schema', () => {
    it('defines a restApiBaseUrl field', () => {
      if (!SalesforceMarketingCloudConnector.schema) throw new Error('schema not defined');
      expect(() =>
        SalesforceMarketingCloudConnector.schema!.parse({ restApiBaseUrl: REST_BASE })
      ).not.toThrow();
    });
  });

  // ── Tool exposure ────────────────────────────────────────────────────────────

  it('exposes all actions as tools', () => {
    for (const [name, action] of Object.entries(SalesforceMarketingCloudConnector.actions)) {
      expect(action.isTool).toBe(true);
    }
  });

  // ── lookupSubscriber ────────────────────────────────────────────────────────

  describe('lookupSubscriber action', () => {
    const mockResponse = {
      data: {
        items: [
          {
            contactKey: 'sub-001',
            attributes: { emailAddress: 'jane.doe@example.com', status: 'Active' },
          },
        ],
        count: 1,
      },
    };

    it('calls the contacts endpoint with an email filter', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceMarketingCloudConnector.actions.lookupSubscriber.handler(
        mockContext,
        { email: 'jane.doe@example.com' }
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/contacts/v1/contacts`, {
        params: { '$filter': "emailAddress eq 'jane.doe@example.com'" },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  // ── queryDataExtension ──────────────────────────────────────────────────────

  describe('queryDataExtension action', () => {
    const mockResponse = {
      data: {
        count: 2,
        page: 1,
        pageSize: 50,
        items: [
          { keys: { EmailAddress: 'a@example.com' }, values: { Status: 'Active' } },
          { keys: { EmailAddress: 'b@example.com' }, values: { Status: 'Inactive' } },
        ],
      },
    };

    it('calls the correct rowset endpoint with default pagination', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceMarketingCloudConnector.actions.queryDataExtension.handler(
        mockContext,
        { externalKey: 'Contacts_DE' }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        `${REST_BASE}/data/v1/customobjectdata/key/Contacts_DE/rowset`,
        { params: { '$pageSize': 50, '$page': 1 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('includes filter param when provided', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceMarketingCloudConnector.actions.queryDataExtension.handler(mockContext, {
        externalKey: 'Contacts_DE',
        filter: "Status eq 'Active'",
        pageSize: 10,
        page: 2,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${REST_BASE}/data/v1/customobjectdata/key/Contacts_DE/rowset`,
        {
          params: {
            '$pageSize': 10,
            '$page': 2,
            '$filter': "Status eq 'Active'",
          },
        }
      );
    });

    it('URL-encodes the externalKey', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceMarketingCloudConnector.actions.queryDataExtension.handler(mockContext, {
        externalKey: 'All Subscribers',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${REST_BASE}/data/v1/customobjectdata/key/All%20Subscribers/rowset`,
        expect.anything()
      );
    });
  });

  // ── listJourneys ─────────────────────────────────────────────────────────────

  describe('listJourneys action', () => {
    const mockResponse = {
      data: {
        count: 3,
        page: 1,
        pageSize: 10,
        items: [
          { id: 'journey-uuid-1', name: 'Welcome Series', status: 'Published' },
          { id: 'journey-uuid-2', name: 'Re-engagement', status: 'Stopped' },
        ],
      },
    };

    it('calls the interactions endpoint with default pagination', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceMarketingCloudConnector.actions.listJourneys.handler(
        mockContext,
        {}
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/interaction/v1/interactions`, {
        params: { page: 1, pageSize: 10 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('passes status and nameFilter when provided', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceMarketingCloudConnector.actions.listJourneys.handler(mockContext, {
        status: 'Published',
        nameFilter: 'Welcome',
        page: 2,
        pageSize: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/interaction/v1/interactions`, {
        params: { page: 2, pageSize: 5, status: 'Published', nameFilter: 'Welcome' },
      });
    });
  });

  // ── getJourney ───────────────────────────────────────────────────────────────

  describe('getJourney action', () => {
    const journeyId = 'f5a2c9e1-3b7d-4f28-a1e2-9c4b0d3e5f6a';
    const mockResponse = {
      data: {
        id: journeyId,
        name: 'Welcome Series',
        version: 2,
        status: 'Published',
        activities: [],
      },
    };

    it('calls the correct journey endpoint', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceMarketingCloudConnector.actions.getJourney.handler(
        mockContext,
        { id: journeyId }
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        `${REST_BASE}/interaction/v1/interactions/${journeyId}`,
        { params: {} }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('passes versionNumber when provided', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceMarketingCloudConnector.actions.getJourney.handler(mockContext, {
        id: journeyId,
        versionNumber: 1,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${REST_BASE}/interaction/v1/interactions/${journeyId}`,
        { params: { versionNumber: 1 } }
      );
    });
  });

  // ── listEmailDefinitions ─────────────────────────────────────────────────────

  describe('listEmailDefinitions action', () => {
    const mockResponse = {
      data: {
        count: 5,
        page: 1,
        pageSize: 20,
        definitions: [
          { definitionKey: 'welcome-email', name: 'Welcome Email', status: 'active' },
          { definitionKey: 'promo-spring', name: 'Spring Promo', status: 'inactive' },
        ],
      },
    };

    it('calls the email definitions endpoint with default pagination', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceMarketingCloudConnector.actions.listEmailDefinitions.handler(
        mockContext,
        {}
      );

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/messaging/v1/email/definitions`, {
        params: { page: 1, pageSize: 20 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('passes status filter when provided', async () => {
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceMarketingCloudConnector.actions.listEmailDefinitions.handler(mockContext, {
        status: 'active',
        page: 1,
        pageSize: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/messaging/v1/email/definitions`, {
        params: { page: 1, pageSize: 50, status: 'active' },
      });
    });
  });

  // ── test handler ─────────────────────────────────────────────────────────────

  describe('test handler', () => {
    it('returns ok when the API responds successfully', async () => {
      mockClient.get.mockResolvedValue({ data: { count: 2, items: [] } });

      if (!SalesforceMarketingCloudConnector.test) throw new Error('test handler not defined');

      const result = await SalesforceMarketingCloudConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${REST_BASE}/interaction/v1/interactions`, {
        params: { page: 1, pageSize: 1 },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Salesforce Marketing Cloud REST API.',
      });
    });

    it('returns ok: false when the API throws', async () => {
      mockClient.get.mockRejectedValue(new Error('401 Unauthorized'));

      if (!SalesforceMarketingCloudConnector.test) throw new Error('test handler not defined');

      const result = await SalesforceMarketingCloudConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('401 Unauthorized');
    });

    it('throws when restApiBaseUrl is not configured', async () => {
      const ctxWithoutUrl = {
        ...mockContext,
        config: { restApiBaseUrl: '' },
      } as unknown as ActionContext;

      if (!SalesforceMarketingCloudConnector.test) throw new Error('test handler not defined');

      const result = await SalesforceMarketingCloudConnector.test.handler(ctxWithoutUrl);

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/restApiBaseUrl is required/);
    });
  });

  // ── skill ────────────────────────────────────────────────────────────────────

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(SalesforceMarketingCloudConnector.skill).toBeDefined();
      expect(typeof SalesforceMarketingCloudConnector.skill).toBe('string');
      expect(SalesforceMarketingCloudConnector.skill).toContain('queryDataExtension');
      expect(SalesforceMarketingCloudConnector.skill).toContain('listJourneys');
      expect(SalesforceMarketingCloudConnector.skill).toContain('lookupSubscriber');
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { MarketoConnector } from './marketo';

const MOCK_TOKEN_URL =
  'https://123-ABC-456.mktorest.com/identity/oauth/token';
const MOCK_BASE_URL = 'https://123-ABC-456.mktorest.com/rest';

const mockGet = jest.fn();
const mockClient = { get: mockGet };

const mockContext = {
  client: mockClient,
  log: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  secrets: { tokenUrl: MOCK_TOKEN_URL },
  config: {},
} as unknown as ActionContext;

// Helper: apply Zod defaults the way the framework does before invoking a handler.
const parse = <K extends keyof typeof MarketoConnector.actions>(
  action: K,
  raw: Record<string, unknown>
) => MarketoConnector.actions[action].input.parse(raw);

describe('MarketoConnector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Metadata ──────────────────────────────────────────────────────────────

  describe('metadata', () => {
    it('has the correct connector ID', () => {
      expect(MarketoConnector.metadata.id).toBe('.marketo');
    });

    it('requires enterprise license', () => {
      expect(MarketoConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(MarketoConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(MarketoConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(MarketoConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('is discoverable via getConnectorSpec', () => {
      const spec = getConnectorSpec('.marketo');
      expect(spec).toBe(MarketoConnector);
    });
  });

  // ─── Auth ──────────────────────────────────────────────────────────────────

  describe('auth', () => {
    it('uses oauth_client_credentials', () => {
      const authType = MarketoConnector.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_client_credentials'
      );
      expect(authType).toMatchObject({ type: 'oauth_client_credentials' });
    });

    it('hides the scope field', () => {
      const oauthType = MarketoConnector.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_client_credentials'
      ) as { overrides?: { meta?: Record<string, unknown> } } | undefined;
      expect(oauthType?.overrides?.meta?.scope).toMatchObject({ hidden: true });
    });

    it('provides a placeholder for the tokenUrl field', () => {
      const oauthType = MarketoConnector.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_client_credentials'
      ) as { overrides?: { meta?: Record<string, { placeholder?: string }> } } | undefined;
      expect(oauthType?.overrides?.meta?.tokenUrl?.placeholder).toContain('mktorest.com');
    });
  });

  // ─── Actions inventory ─────────────────────────────────────────────────────

  describe('actions', () => {
    it('exposes the expected action names', () => {
      const names = Object.keys(MarketoConnector.actions);
      expect(names).toEqual(
        expect.arrayContaining([
          'searchLeads',
          'getLead',
          'getLeadActivities',
          'getCampaigns',
          'getLists',
          'describeLeads',
        ])
      );
    });

    it('marks all actions as isTool: true', () => {
      for (const [name, action] of Object.entries(MarketoConnector.actions)) {
        expect({ name, isTool: action.isTool }).toMatchObject({ isTool: true });
      }
    });
  });

  // ─── searchLeads ───────────────────────────────────────────────────────────

  describe('searchLeads', () => {
    it('calls the correct endpoint with filterType and filterValues', async () => {
      mockGet.mockResolvedValueOnce({
        data: { result: [{ id: 1, email: 'user@example.com' }], success: true },
      });

      const input = parse('searchLeads', {
        filterType: 'email',
        filterValues: ['user@example.com'],
      });
      const result = await MarketoConnector.actions.searchLeads.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/leads.json`, {
        params: {
          filterType: 'email',
          filterValues: 'user@example.com',
        },
      });
      expect(result).toMatchObject({ success: true });
    });

    it('includes optional fields and nextPageToken when provided', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('searchLeads', {
        filterType: 'id',
        filterValues: ['1', '2', '3'],
        fields: ['firstName', 'lastName', 'email'],
        nextPageToken: 'abc123',
      });
      await MarketoConnector.actions.searchLeads.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/leads.json`, {
        params: {
          filterType: 'id',
          filterValues: '1,2,3',
          fields: 'firstName,lastName,email',
          nextPageToken: 'abc123',
        },
      });
    });

    it('validates that filterValues has at least one entry', () => {
      expect(() =>
        parse('searchLeads', { filterType: 'email', filterValues: [] })
      ).toThrow();
    });
  });

  // ─── getLead ───────────────────────────────────────────────────────────────

  describe('getLead', () => {
    it('calls the correct endpoint with the lead ID', async () => {
      mockGet.mockResolvedValueOnce({
        data: { result: [{ id: 42, email: 'lead@example.com' }], success: true },
      });

      const input = parse('getLead', { leadId: 42 });
      await MarketoConnector.actions.getLead.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/lead/42.json`, { params: {} });
    });

    it('includes optional fields parameter', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('getLead', {
        leadId: 99,
        fields: ['email', 'company'],
      });
      await MarketoConnector.actions.getLead.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/lead/99.json`, {
        params: { fields: 'email,company' },
      });
    });

    it('rejects non-positive integer lead IDs', () => {
      expect(() => parse('getLead', { leadId: -1 })).toThrow();
      expect(() => parse('getLead', { leadId: 0 })).toThrow();
    });
  });

  // ─── getLeadActivities ─────────────────────────────────────────────────────

  describe('getLeadActivities', () => {
    it('fetches a paging token and then retrieves activities', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { nextPageToken: 'PAGINGTOKEN123' } })
        .mockResolvedValueOnce({
          data: { result: [{ id: 1, activityTypeId: 11 }], nextPageToken: 'NEXT456', success: true },
        });

      const input = parse('getLeadActivities', {
        sinceDateTime: '2024-06-01T00:00:00Z',
        leadIds: [1, 2],
        activityTypeIds: [11, 12],
      });
      const result = await MarketoConnector.actions.getLeadActivities.handler(mockContext, input);

      // First call: get paging token
      expect(mockGet).toHaveBeenNthCalledWith(1, `${MOCK_BASE_URL}/v1/activities/pagingtoken.json`, {
        params: { sinceDatetime: '2024-06-01T00:00:00Z' },
      });
      // Second call: get activities
      expect(mockGet).toHaveBeenNthCalledWith(2, `${MOCK_BASE_URL}/v1/activities.json`, {
        params: expect.objectContaining({
          nextPageToken: 'PAGINGTOKEN123',
          activityTypeIds: '11,12',
          leadIds: '1,2',
        }),
      });
      expect(result).toMatchObject({ success: true });
    });

    it('uses provided nextPageToken and skips paging token fetch', async () => {
      mockGet.mockResolvedValueOnce({
        data: { result: [], nextPageToken: 'NEXT789', success: true },
      });

      const input = parse('getLeadActivities', {
        sinceDateTime: '2024-06-01T00:00:00Z',
        nextPageToken: 'EXISTING_TOKEN',
      });
      await MarketoConnector.actions.getLeadActivities.handler(mockContext, input);

      // Should only make one call (to activities, not pagingtoken)
      expect(mockGet).toHaveBeenCalledTimes(1);
      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/activities.json`, {
        params: expect.objectContaining({ nextPageToken: 'EXISTING_TOKEN' }),
      });
    });

    it('throws when paging token response is missing nextPageToken', async () => {
      mockGet.mockResolvedValueOnce({ data: {} });

      const input = parse('getLeadActivities', {
        sinceDateTime: '2024-06-01T00:00:00Z',
      });
      await expect(
        MarketoConnector.actions.getLeadActivities.handler(mockContext, input)
      ).rejects.toThrow('Marketo did not return a paging token');
    });

    it('omits activityTypeIds from params when not supplied by caller', async () => {
      mockGet
        .mockResolvedValueOnce({ data: { nextPageToken: 'PAGINGTOKEN123' } })
        .mockResolvedValueOnce({
          data: { result: [], nextPageToken: 'NEXT456', success: true },
        });

      const input = parse('getLeadActivities', {
        sinceDateTime: '2024-06-01T00:00:00Z',
      });
      await MarketoConnector.actions.getLeadActivities.handler(mockContext, input);

      const [, activitiesCallArgs] = mockGet.mock.calls;
      const sentParams = (activitiesCallArgs[1] as { params: Record<string, unknown> }).params;
      expect(sentParams).not.toHaveProperty('activityTypeIds');
    });
  });

  // ─── getCampaigns ──────────────────────────────────────────────────────────

  describe('getCampaigns', () => {
    it('calls the campaigns endpoint with default pagination', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('getCampaigns', {});
      await MarketoConnector.actions.getCampaigns.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/campaigns.json`, {
        params: { offset: 0, maxReturn: 20 },
      });
    });

    it('passes isTriggerable and programName filters', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('getCampaigns', {
        isTriggerable: true,
        programName: 'Q4 Nurture',
      });
      await MarketoConnector.actions.getCampaigns.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/campaigns.json`, {
        params: expect.objectContaining({
          isTriggerable: true,
          programName: 'Q4 Nurture',
        }),
      });
    });
  });

  // ─── getLists ──────────────────────────────────────────────────────────────

  describe('getLists', () => {
    it('calls the lists endpoint with default pagination', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('getLists', {});
      await MarketoConnector.actions.getLists.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/lists.json`, {
        params: { offset: 0, maxReturn: 20 },
      });
    });

    it('passes optional name filter', async () => {
      mockGet.mockResolvedValueOnce({ data: { result: [], success: true } });

      const input = parse('getLists', { name: 'Newsletter Subscribers' });
      await MarketoConnector.actions.getLists.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/lists.json`, {
        params: expect.objectContaining({ name: 'Newsletter Subscribers' }),
      });
    });
  });

  // ─── describeLeads ─────────────────────────────────────────────────────────

  describe('describeLeads', () => {
    it('calls the leads describe endpoint', async () => {
      mockGet.mockResolvedValueOnce({
        data: { result: [{ displayName: 'Email Address', name: 'email', dataType: 'email' }], success: true },
      });

      const input = parse('describeLeads', {});
      const result = await MarketoConnector.actions.describeLeads.handler(mockContext, input);

      expect(mockGet).toHaveBeenCalledWith(`${MOCK_BASE_URL}/v1/leads/describe.json`);
      expect(result).toMatchObject({ success: true });
    });
  });

  // ─── test handler ──────────────────────────────────────────────────────────

  describe('test handler', () => {
    it('returns ok with field count on success', async () => {
      mockGet.mockResolvedValueOnce({
        status: 200,
        data: {
          result: [{ name: 'email' }, { name: 'firstName' }, { name: 'lastName' }],
          success: true,
        },
      });

      if (!MarketoConnector.test) throw new Error('test handler not defined');
      const result = await MarketoConnector.test.handler(mockContext);

      expect(result).toMatchObject({
        ok: true,
        message: expect.stringContaining('3 fields'),
      });
    });

    it('returns ok: false when the API returns a non-200 status', async () => {
      mockGet.mockResolvedValueOnce({ status: 401, data: {} });

      if (!MarketoConnector.test) throw new Error('test handler not defined');
      const result = await MarketoConnector.test.handler(mockContext);

      expect(result).toMatchObject({ ok: false });
    });

    it('returns ok: false and message when the request throws', async () => {
      mockGet.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      if (!MarketoConnector.test) throw new Error('test handler not defined');
      const result = await MarketoConnector.test.handler(mockContext);

      expect(result).toMatchObject({ ok: false, message: 'ECONNREFUSED' });
    });

    it('returns ok: false when tokenUrl is missing', async () => {
      const ctxNoToken = {
        ...mockContext,
        secrets: {},
      } as unknown as ActionContext;
      if (!MarketoConnector.test) throw new Error('test handler not defined');
      const result = await MarketoConnector.test.handler(ctxNoToken);
      expect(result).toMatchObject({
        ok: false,
        message: expect.stringContaining('Marketo connector is not configured'),
      });
    });
  });

  // ─── skill property ────────────────────────────────────────────────────────

  describe('skill property', () => {
    it('is defined and is a string', () => {
      expect(typeof MarketoConnector.skill).toBe('string');
    });

    it('mentions key action names for agent guidance', () => {
      expect(MarketoConnector.skill).toContain('searchLeads');
      expect(MarketoConnector.skill).toContain('getLeadActivities');
      expect(MarketoConnector.skill).toContain('describeLeads');
    });

    it('mentions sinceDateTime pagination guidance', () => {
      expect(MarketoConnector.skill).toContain('sinceDateTime');
    });
  });
});

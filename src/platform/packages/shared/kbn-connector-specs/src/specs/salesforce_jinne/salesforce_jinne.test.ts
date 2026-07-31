/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SalesforceJinneConnector } from './salesforce_jinne';

describe('SalesforceJinneConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  };

  const baseUrl = 'https://myorg.my.salesforce.com';
  const mockContext = {
    client: mockClient,
    config: {},
    secrets: { tokenUrl: `${baseUrl}/services/oauth2/token` },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should expose all agent-facing actions as tools', () => {
    const expectedTools = ['listAgents', 'createSession', 'sendMessage', 'getSessionMessages'];
    for (const actionName of expectedTools) {
      expect(SalesforceJinneConnector.actions[actionName].isTool).toBe(true);
    }
  });

  it('should NOT expose endSession as a tool (destructive action)', () => {
    expect(SalesforceJinneConnector.actions.endSession.isTool).toBeFalsy();
  });

  describe('metadata', () => {
    it('has correct id', () => {
      expect(SalesforceJinneConnector.metadata.id).toBe('.salesforce_jinne');
    });

    it('requires enterprise license', () => {
      expect(SalesforceJinneConnector.metadata.minimumLicense).toBe('enterprise');
    });

    it('is marked as technical preview', () => {
      expect(SalesforceJinneConnector.metadata.isTechnicalPreview).toBe(true);
    });

    it('supports workflows and agentBuilder', () => {
      expect(SalesforceJinneConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(SalesforceJinneConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
    });
  });

  describe('auth', () => {
    it('supports oauth_authorization_code with Salesforce placeholders and hidden scope', () => {
      const oauthType = (
        SalesforceJinneConnector.auth?.types as Array<
          | string
          | {
              type: string;
              defaults?: Record<string, unknown>;
              overrides?: Record<string, unknown>;
            }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          scope: 'api refresh_token',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/authorize',
            },
            tokenUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/token',
            },
            scope: { hidden: true },
          },
        },
      });
    });

    it('supports oauth_client_credentials', () => {
      const types = (SalesforceJinneConnector.auth?.types as Array<string | { type: string }>).map(
        (t) => (typeof t === 'string' ? t : t.type)
      );
      expect(types).toContain('oauth_client_credentials');
    });
  });

  describe('listAgents action', () => {
    it('calls the agents endpoint with default pageSize', async () => {
      const mockResponse = {
        data: { agents: [{ id: '0X9xx000000001', name: 'Support Agent' }], nextPageUrl: null },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = SalesforceJinneConnector.actions.listAgents.input.parse({});
      const result = await SalesforceJinneConnector.actions.listAgents.handler(
        mockContext,
        input
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/agents`,
        { params: { pageSize: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('follows nextPageUrl when provided', async () => {
      const nextPageUrl = `${baseUrl}/einstein/ai-agent/v1/agents?page=2`;
      const mockResponse = { data: { agents: [], nextPageUrl: null } };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = SalesforceJinneConnector.actions.listAgents.input.parse({ nextPageUrl });
      await SalesforceJinneConnector.actions.listAgents.handler(mockContext, input);

      expect(mockClient.get).toHaveBeenCalledWith(nextPageUrl, {});
    });
  });

  describe('createSession action', () => {
    it('posts to the sessions endpoint with agentId', async () => {
      const mockResponse = {
        data: { sessionId: '0Mdxx000000001', agentId: '0X9xx000000001', status: 'Active' },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SalesforceJinneConnector.actions.createSession.handler(mockContext, {
        agentId: '0X9xx000000001',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions`,
        { agentId: '0X9xx000000001' },
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('includes externalSessionKey when provided', async () => {
      const mockResponse = {
        data: { sessionId: '0Mdxx000000001' },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await SalesforceJinneConnector.actions.createSession.handler(mockContext, {
        agentId: '0X9xx000000001',
        externalSessionKey: 'case-00012345',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions`,
        { agentId: '0X9xx000000001', externalSessionKey: 'case-00012345' },
        {}
      );
    });
  });

  describe('sendMessage action', () => {
    it('posts the message to the session messages endpoint', async () => {
      const mockResponse = {
        data: {
          messages: [
            { role: 'assistant', content: [{ type: 'text', text: 'Here are the results...' }] },
          ],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await SalesforceJinneConnector.actions.sendMessage.handler(mockContext, {
        sessionId: '0Mdxx000000001',
        message: 'List open opportunities for Acme Corp',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions/0Mdxx000000001/messages`,
        {
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'List open opportunities for Acme Corp' }],
          },
        },
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('includes variables when provided', async () => {
      const mockResponse = { data: { messages: [] } };
      mockClient.post.mockResolvedValue(mockResponse);

      const variables = [{ name: 'RecordId', type: 'Text', value: '001xx000001AbcDEF' }];
      await SalesforceJinneConnector.actions.sendMessage.handler(mockContext, {
        sessionId: '0Mdxx000000001',
        message: 'Summarise this record',
        variables,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions/0Mdxx000000001/messages`,
        expect.objectContaining({ variables }),
        {}
      );
    });

    it('does not include variables key when omitted', async () => {
      const mockResponse = { data: { messages: [] } };
      mockClient.post.mockResolvedValue(mockResponse);

      await SalesforceJinneConnector.actions.sendMessage.handler(mockContext, {
        sessionId: '0Mdxx000000001',
        message: 'Hello',
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body).not.toHaveProperty('variables');
    });
  });

  describe('getSessionMessages action', () => {
    it('fetches messages for a session', async () => {
      const mockResponse = {
        data: {
          messages: [
            { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
            { role: 'assistant', content: [{ type: 'text', text: 'Hi there!' }] },
          ],
          nextPageUrl: null,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = SalesforceJinneConnector.actions.getSessionMessages.input.parse({
        sessionId: '0Mdxx000000001',
      });
      const result = await SalesforceJinneConnector.actions.getSessionMessages.handler(
        mockContext,
        input
      );

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions/0Mdxx000000001/messages`,
        { params: { pageSize: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('follows nextPageUrl when provided', async () => {
      const nextPageUrl = `${baseUrl}/einstein/ai-agent/v1/sessions/0Mdxx000000001/messages?page=2`;
      const mockResponse = { data: { messages: [], nextPageUrl: null } };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = SalesforceJinneConnector.actions.getSessionMessages.input.parse({
        sessionId: '0Mdxx000000001',
        nextPageUrl,
      });
      await SalesforceJinneConnector.actions.getSessionMessages.handler(mockContext, input);

      expect(mockClient.get).toHaveBeenCalledWith(nextPageUrl, {});
    });
  });

  describe('endSession action', () => {
    it('sends a DELETE request to the session endpoint', async () => {
      const mockResponse = { data: { status: 'Ended' } };
      mockClient.delete.mockResolvedValue(mockResponse);

      const result = await SalesforceJinneConnector.actions.endSession.handler(mockContext, {
        sessionId: '0Mdxx000000001',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/sessions/0Mdxx000000001`,
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('test handler', () => {
    it('returns ok when the agents endpoint is accessible', async () => {
      mockClient.get.mockResolvedValue({
        data: { agents: [{ id: '0X9xx000000001' }] },
      });

      if (!SalesforceJinneConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceJinneConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/einstein/ai-agent/v1/agents`,
        { params: { pageSize: 1 } }
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Salesforce Jinne. 1 agent(s) visible.',
      });
    });

    it('returns ok with zero agents when none are configured', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      if (!SalesforceJinneConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceJinneConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Salesforce Jinne. 0 agent(s) visible.',
      });
    });

    it('returns failure when the API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      if (!SalesforceJinneConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceJinneConnector.test.handler(mockContext);

      expect(result).toEqual({
        ok: false,
        message: 'Unauthorized',
      });
    });

    it('throws when tokenUrl is not configured', async () => {
      const ctxWithoutTokenUrl = {
        ...mockContext,
        secrets: {},
      } as unknown as ActionContext;

      if (!SalesforceJinneConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceJinneConnector.test.handler(ctxWithoutTokenUrl);
      expect(result.ok).toBe(false);
      expect(result.message).toContain('tokenUrl');
    });
  });

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(SalesforceJinneConnector.skill).toBeDefined();
      expect(typeof SalesforceJinneConnector.skill).toBe('string');
      expect(SalesforceJinneConnector.skill).toContain('listAgents');
      expect(SalesforceJinneConnector.skill).toContain('createSession');
      expect(SalesforceJinneConnector.skill).toContain('sendMessage');
    });
  });
});

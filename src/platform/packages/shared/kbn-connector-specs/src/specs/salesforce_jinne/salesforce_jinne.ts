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
  ListAgentsInput,
  ListAgentsResponse,
  CreateSessionInput,
  SendMessageInput,
  GetSessionMessagesInput,
  EndSessionInput,
} from './types';
import {
  ListAgentsInputSchema,
  CreateSessionInputSchema,
  SendMessageInputSchema,
  GetSessionMessagesInputSchema,
  EndSessionInputSchema,
} from './types';

const JINNE_API_VERSION = 'v1';

/** Derive the Salesforce instance base URL from the OAuth token URL. */
function getBaseUrl(tokenUrl: string | undefined): string {
  if (!tokenUrl || tokenUrl.trim() === '') {
    throw new Error(
      'Salesforce Jinne connector is not configured: tokenUrl (OAuth token endpoint) is required.'
    );
  }
  const base = tokenUrl.includes('/services/oauth2/token')
    ? tokenUrl.replace(/\/services\/oauth2\/token.*$/, '')
    : tokenUrl;
  return base.replace(/\/+$/, '');
}

/** Resolve a Salesforce nextPageUrl (absolute or relative path) to a full URL.
 *  Absolute URLs are validated to share the same hostname as baseUrl to prevent SSRF. */
function resolveNextPageUrl(baseUrl: string, nextPageUrl: string): string {
  if (nextPageUrl.startsWith('http://') || nextPageUrl.startsWith('https://')) {
    const allowedHost = new URL(baseUrl).hostname;
    const givenHost = new URL(nextPageUrl).hostname;
    if (givenHost !== allowedHost) {
      throw new Error(
        `nextPageUrl host "${givenHost}" does not match connector host "${allowedHost}"`
      );
    }
    return nextPageUrl;
  }
  return `${baseUrl}${nextPageUrl}`;
}

export const SalesforceJinneConnector: ConnectorSpec = {
  metadata: {
    id: '.salesforce_jinne',
    displayName: 'Salesforce Jinne',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforce_jinne.metadata.description',
      {
        defaultMessage:
          'List AI agents, start conversation sessions, send messages, and retrieve transcripts in Salesforce Jinne',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        isRecommended: true,
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
      },
      {
        type: 'oauth_client_credentials',
        defaults: {
          scope: 'api',
        },
        overrides: {
          meta: {
            tokenUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/token',
            },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  actions: {
    listAgents: {
      isTool: true,
      description:
        'List all Jinne AI agents configured in the Salesforce org. ' +
        'Returns each agent\'s ID, name, description, and status. ' +
        'Use this first to discover which agents are available before calling createSession.',
      input: ListAgentsInputSchema,
      handler: async (ctx, input: ListAgentsInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (input.nextPageUrl) {
          const url = resolveNextPageUrl(baseUrl, input.nextPageUrl);
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const response = await ctx.client.get(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/agents`,
          {
            params: {
              pageSize: input.maxResults ?? 20,
            },
          }
        );
        return response.data;
      },
    },

    createSession: {
      isTool: true,
      description:
        'Start a new conversation session with a specific Jinne AI agent. ' +
        'Returns the session ID and initial agent response, if any. ' +
        'Use the session ID from the response with sendMessage to continue the conversation. ' +
        'Each session maintains its own context; create a new session for each independent conversation.',
      input: CreateSessionInputSchema,
      handler: async (ctx, input: CreateSessionInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const body: Record<string, unknown> = {
          agentId: input.agentId,
        };
        if (input.externalSessionKey) {
          body.externalSessionKey = input.externalSessionKey;
        }
        const response = await ctx.client.post(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/sessions`,
          body,
          {}
        );
        return response.data;
      },
    },

    sendMessage: {
      isTool: true,
      description:
        'Send a message to an active Jinne AI agent session and receive the agent\'s response. ' +
        'Returns the agent\'s reply text and any structured outputs (actions taken, records retrieved). ' +
        'The agent has access to your Salesforce data and any tools configured in its definition. ' +
        'Use createSession to obtain a sessionId before calling this action. ' +
        'Multi-turn conversations are supported: call sendMessage repeatedly on the same sessionId.',
      input: SendMessageInputSchema,
      handler: async (ctx, input: SendMessageInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const body: Record<string, unknown> = {
          message: {
            role: 'user',
            content: [{ type: 'text', text: input.message }],
          },
        };
        if (input.variables && input.variables.length > 0) {
          body.variables = input.variables;
        }
        const response = await ctx.client.post(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/sessions/${encodeURIComponent(
            input.sessionId
          )}/messages`,
          body,
          {}
        );
        return response.data;
      },
    },

    getSessionMessages: {
      isTool: true,
      description:
        'Retrieve the conversation transcript (all messages) for an existing Jinne session. ' +
        'Returns messages in chronological order, including both user messages and agent replies. ' +
        'Useful for reviewing what was discussed or resuming a conversation that occurred in a previous turn.',
      input: GetSessionMessagesInputSchema,
      handler: async (ctx, input: GetSessionMessagesInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        if (input.nextPageUrl) {
          const url = resolveNextPageUrl(baseUrl, input.nextPageUrl);
          const response = await ctx.client.get(url, {});
          return response.data;
        }
        const response = await ctx.client.get(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/sessions/${encodeURIComponent(
            input.sessionId
          )}/messages`,
          {
            params: {
              pageSize: input.maxResults ?? 20,
            },
          }
        );
        return response.data;
      },
    },

    endSession: {
      isTool: false, // Intentionally hidden: ending a session is destructive and irreversible.
      // Agents should call sendMessage until the conversation is complete, not proactively end sessions.
      description:
        'End an active Jinne AI agent session. ' +
        'Finalizes the conversation transcript and frees up agent capacity. ' +
        'This action is irreversible — the session cannot be resumed after you end it. ' +
        'Only call this when the conversation is fully complete.',
      input: EndSessionInputSchema,
      handler: async (ctx, input: EndSessionInput) => {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const response = await ctx.client.delete(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/sessions/${encodeURIComponent(
            input.sessionId
          )}`,
          {}
        );
        return response.data;
      },
    },
  },

  test: {
    description: i18n.translate(
      'core.kibanaConnectorSpecs.salesforce_jinne.test.description',
      {
        defaultMessage: 'Verifies Salesforce Jinne connection by listing available agents',
      }
    ),
    handler: async (ctx) => {
      ctx.log.debug('Salesforce Jinne test handler');

      try {
        const baseUrl = getBaseUrl(ctx.secrets?.tokenUrl as string | undefined);
        const response = await ctx.client.get(
          `${baseUrl}/einstein/ai-agent/${JINNE_API_VERSION}/agents`,
          { params: { pageSize: 1 } }
        );
        const data = response.data as ListAgentsResponse;
        const count = data.agents ? data.agents.length : 0;
        return {
          ok: true,
          message: `Successfully connected to Salesforce Jinne. ${count} agent(s) visible.`,
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
    '## Salesforce Jinne connector — LLM usage guide',
    '',
    '### Typical conversation workflow',
    '1. Call `listAgents` to discover which Jinne AI agents are available and find the right agent ID.',
    '2. Call `createSession` with the agent ID to start a conversation. Save the returned `sessionId`.',
    '3. Call `sendMessage` with the `sessionId` and your question or instruction.',
    '   The agent responds using its configured Salesforce data access and built-in tools.',
    '4. Continue calling `sendMessage` on the same `sessionId` for multi-turn conversations.',
    '5. When the conversation is complete, the session will expire automatically.',
    '   Only call `endSession` if you need to release capacity immediately.',
    '',
    '### Agent capabilities',
    'Each Jinne agent has its own configuration, data sources, and allowed actions.',
    'If an agent cannot answer a question, try a different agent (use `listAgents` to browse options).',
    '',
    '### Input variables',
    'Use the `variables` parameter in `sendMessage` to pass structured context alongside a message.',
    'For example, pass a Salesforce record ID so the agent can look up the specific record:',
    '  `variables: [{ name: "RecordId", type: "Text", value: "001xx000001AbcDEF" }]`',
    '',
    '### Pagination',
    'Both `listAgents` and `getSessionMessages` may return a `nextPageUrl` in their response.',
    'Pass it back in the next call to fetch the following page of results.',
  ].join('\n'),
};


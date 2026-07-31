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

export const ListAgentsInputSchema = lazySchema(() =>
  z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of agents to return (1–100, default 20)'),
    nextPageUrl: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination URL from a previous listAgents response. Pass this to fetch the next page of results.'),
  })
);
export type ListAgentsInput = z.infer<typeof ListAgentsInputSchema>;

export const CreateSessionInputSchema = lazySchema(() =>
  z.object({
    agentId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The unique identifier of the Jinne AI agent to start a conversation with. ' +
          'Obtain this from the listAgents action. Example: "0X9xx000000001"'
      ),
    externalSessionKey: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'A caller-defined session key to correlate this session with your external system. ' +
          'Must be unique per agent. If omitted, Salesforce generates one. Example: "case-00012345"'
      ),
  })
);
export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const SendMessageInputSchema = lazySchema(() =>
  z.object({
    sessionId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The Jinne session ID returned by createSession. Example: "0Mdxx000000001"'
      ),
    message: z
      .string()
      .min(1)
      .max(10000)
      .describe(
        'The message or question to send to the AI agent. ' +
          'Write in natural language; the agent has access to your Salesforce data and configured actions. ' +
          'Example: "Summarize the open opportunities for Acme Corp"'
      ),
    variables: z
      .array(
        z.object({
          name: z.string().min(1).max(200).describe('Variable name as defined in the agent configuration'),
          type: z
            .string()
            .min(1)
            .max(50)
            .describe('Variable type, e.g. "Text", "Number", "Boolean", "DateTime"'),
          value: z
            .string()
            .min(1)
            .max(2000)
            .describe('Variable value as a string (numbers and booleans should be stringified)'),
        })
      )
      .optional()
      .describe(
        'Optional input variables to inject into the agent session for context. ' +
          'Use these to pass structured data (record IDs, filter values) alongside the message.'
      ),
  })
);
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const GetSessionMessagesInputSchema = lazySchema(() =>
  z.object({
    sessionId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The Jinne session ID returned by createSession. Example: "0Mdxx000000001"'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Maximum number of messages to return (1–100, default 20)'),
    nextPageUrl: z
      .string()
      .max(2048)
      .optional()
      .describe('Pagination URL from a previous getSessionMessages response'),
  })
);
export type GetSessionMessagesInput = z.infer<typeof GetSessionMessagesInputSchema>;

export const EndSessionInputSchema = lazySchema(() =>
  z.object({
    sessionId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The Jinne session ID returned by createSession. Ending the session frees up agent capacity ' +
          'and finalizes the conversation transcript. Example: "0Mdxx000000001"'
      ),
  })
);
export type EndSessionInput = z.infer<typeof EndSessionInputSchema>;

export type ListAgentsResponse = {
  agents?: unknown[];
  nextPageUrl?: string | null;
};

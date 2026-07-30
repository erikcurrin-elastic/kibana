/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * OpenText Documentum Connector
 *
 * Provides integration with OpenText Documentum via the Documentum REST Services API.
 * Features include:
 * - DQL (Documentum Query Language) search across repository objects
 * - Retrieve object properties by object ID
 * - Download document content (text auto-decoded, binary base64-encoded)
 * - List top-level cabinets
 * - Browse folder contents
 * - List available repositories
 *
 * Uses HTTP Basic authentication (username/password).
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../../connector_spec';
import {
  SearchInputSchema,
  GetObjectInputSchema,
  GetContentInputSchema,
  ListCabinetsInputSchema,
  ListFolderContentsInputSchema,
  ListRepositoriesInputSchema,
} from './types';
import type {
  SearchInput,
  GetObjectInput,
  GetContentInput,
  ListCabinetsInput,
  ListFolderContentsInput,
} from './types';

/** Build the base REST URL for a repository: {baseUrl}/repositories/{repo} */
const repoUrl = (baseUrl: string, repositoryName: string) =>
  `${baseUrl.replace(/\/$/, '')}/repositories/${encodeURIComponent(repositoryName)}`;

export const OpentextDocumentum: ConnectorSpec = {
  metadata: {
    id: '.opentext_documentum',
    displayName: 'OpenText Documentum',
    description: i18n.translate(
      'core.kibanaConnectorSpecs.opentextDocumentum.metadata.description',
      {
        defaultMessage:
          'Search documents, list cabinets, and retrieve content from an OpenText Documentum repository',
      }
    ),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [{ type: 'basic', defaults: {} }],
  },

  schema: lazySchema(() =>
    z.object({
      baseUrl: z
        .string()
        .url()
        .max(2048)
        .describe(
          'Base URL of the Documentum REST Services endpoint (for example, https://documentum.company.com/dctm-rest)'
        )
        .meta({
          label: 'Documentum REST Services URL',
          widget: 'text',
          placeholder: 'https://documentum.company.com/dctm-rest',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.opentextDocumentum.config.baseUrl.helpText',
            {
              defaultMessage:
                'The base URL of the Documentum REST Services (dctm-rest) deployment, without a trailing slash.',
            }
          ),
        }),
      repositoryName: z
        .string()
        .min(1)
        .max(200)
        .describe('Default Documentum repository name to use when not specified per-action')
        .meta({
          label: 'Default Repository Name',
          widget: 'text',
          placeholder: 'DOCUMENTUM',
          helpText: i18n.translate(
            'core.kibanaConnectorSpecs.opentextDocumentum.config.repositoryName.helpText',
            {
              defaultMessage:
                'The name of the Documentum repository to query by default. Use the listRepositories action to discover available repository names.',
            }
          ),
        }),
    })
  ),

  actions: {
    // ── Discovery ─────────────────────────────────────────────────────────────
    listRepositories: {
      isTool: true,
      description:
        'List all Documentum repositories available on this server. ' +
        'Use this first to confirm connectivity and to discover valid repository names before running queries.',
      input: ListRepositoriesInputSchema,
      handler: async (ctx) => {
        const { baseUrl } = ctx.config as { baseUrl: string; repositoryName: string };
        const url = `${baseUrl.replace(/\/$/, '')}/repositories`;
        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
        });
        return response.data;
      },
    },

    // ── Search ────────────────────────────────────────────────────────────────
    search: {
      isTool: true,
      description:
        'Execute a DQL (Documentum Query Language) query against a Documentum repository. ' +
        'Returns matching objects with their properties. DQL is SQL-like; use the FOLDER() predicate to scope to a path, ' +
        'CONTAINS() for full-text search, and ENABLE (RETURN_TOP N) to limit results. ' +
        'Always include r_object_id in the SELECT list so results can be passed to getObject or getContent. ' +
        'Example: SELECT r_object_id, object_name, r_modify_date FROM dm_document WHERE CONTAINS(object_name, \'annual report\') ENABLE (RETURN_TOP 20)',
      input: SearchInputSchema,
      handler: async (ctx, input: SearchInput) => {
        const { baseUrl, repositoryName: defaultRepo } = ctx.config as {
          baseUrl: string;
          repositoryName: string;
        };
        const repo = input.repositoryName ?? defaultRepo;
        const url = `${repoUrl(baseUrl, repo)}/dql`;

        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
          params: {
            dql: input.dql,
            'items-per-page': input.maxResults ?? 20,
          },
        });
        return response.data;
      },
    },

    // ── Object metadata ───────────────────────────────────────────────────────
    getObject: {
      isTool: true,
      description:
        'Retrieve the full properties (metadata) of a Documentum object by its r_object_id. ' +
        'Returns all attributes of the object, such as object_name, r_creation_date, r_modify_date, r_content_size, a_content_type, and custom attributes. ' +
        'Use this after search to get complete metadata for a specific document or folder.',
      input: GetObjectInputSchema,
      handler: async (ctx, input: GetObjectInput) => {
        const { baseUrl, repositoryName: defaultRepo } = ctx.config as {
          baseUrl: string;
          repositoryName: string;
        };
        const repo = input.repositoryName ?? defaultRepo;
        const url = `${repoUrl(baseUrl, repo)}/objects/${encodeURIComponent(input.objectId)}`;

        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
        });
        return response.data;
      },
    },

    // ── Content download ──────────────────────────────────────────────────────
    getContent: {
      isTool: true,
      description:
        'Download the primary content of a Documentum document by its r_object_id. ' +
        'Text-based content (text/*, application/json) is returned as UTF-8 string. ' +
        'Binary content (PDF, Word, images, etc.) is returned as base64-encoded data with a mimeType field indicating the format. ' +
        'Use getObject first to check the a_content_type and r_content_size attributes before downloading.',
      input: GetContentInputSchema,
      handler: async (ctx, input: GetContentInput) => {
        const { baseUrl, repositoryName: defaultRepo } = ctx.config as {
          baseUrl: string;
          repositoryName: string;
        };
        const repo = input.repositoryName ?? defaultRepo;
        const url = `${repoUrl(baseUrl, repo)}/objects/${encodeURIComponent(
          input.objectId
        )}/content-media`;

        const response = await ctx.client.get(url, {
          responseType: 'arraybuffer',
        });

        const buffer = Buffer.from(response.data as ArrayBuffer);
        const rawContentType: string =
          (response.headers as Record<string, string>)?.['content-type'] ?? '';
        const mimeType = rawContentType.split(';')[0].trim();
        const isText =
          mimeType.startsWith('text/') ||
          mimeType === 'application/json' ||
          mimeType === 'application/xml';

        return {
          mimeType,
          encoding: isText ? 'utf-8' : 'base64',
          content: isText ? buffer.toString('utf8') : buffer.toString('base64'),
        };
      },
    },

    // ── Cabinet / folder browsing ─────────────────────────────────────────────
    listCabinets: {
      isTool: true,
      description:
        'List all top-level cabinets in the Documentum repository. ' +
        'Cabinets are the root containers in Documentum (analogous to top-level directories). ' +
        'Returns each cabinet\'s r_object_id, object_name, r_creation_date, and r_modify_date. ' +
        'Use this to discover the repository structure before browsing folder contents with listFolderContents.',
      input: ListCabinetsInputSchema,
      handler: async (ctx, input: ListCabinetsInput) => {
        const { baseUrl, repositoryName: defaultRepo } = ctx.config as {
          baseUrl: string;
          repositoryName: string;
        };
        const repo = input.repositoryName ?? defaultRepo;
        const url = `${repoUrl(baseUrl, repo)}/cabinets`;

        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
          params: { 'items-per-page': input.maxResults ?? 50 },
        });
        return response.data;
      },
    },

    listFolderContents: {
      isTool: true,
      description:
        'List the contents of a Documentum folder or cabinet by its r_object_id. ' +
        'Returns child objects with their r_object_id, object_name, r_object_type, r_creation_date, r_modify_date, and a_content_type. ' +
        'Use this to browse the repository hierarchy after listCabinets. ' +
        'Filter by objectType (e.g., dm_document) to list only documents or only folders.',
      input: ListFolderContentsInputSchema,
      handler: async (ctx, input: ListFolderContentsInput) => {
        const { baseUrl, repositoryName: defaultRepo } = ctx.config as {
          baseUrl: string;
          repositoryName: string;
        };
        const repo = input.repositoryName ?? defaultRepo;

        // Use DQL to list contents of a specific folder by object ID
        const typeFilter = input.objectType ? ` AND TYPE(${input.objectType})` : '';
        const dql =
          `SELECT r_object_id, object_name, r_object_type, r_creation_date, r_modify_date, a_content_type ` +
          `FROM dm_sysobject ` +
          `WHERE FOLDER ID '${input.folderId}'${typeFilter} ` +
          `ENABLE (RETURN_TOP ${input.maxResults ?? 50})`;

        const url = `${repoUrl(baseUrl, repo)}/dql`;

        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
          params: {
            dql,
            'items-per-page': input.maxResults ?? 50,
          },
        });
        return response.data;
      },
    },
  },

  skill: [
    '## OpenText Documentum Connector — usage guidance',
    '',
    '### Exploring the repository structure',
    'Start with `listRepositories` to confirm connectivity and get repository names.',
    'Then `listCabinets` to see top-level containers.',
    'Use `listFolderContents` with a cabinet or folder r_object_id to browse deeper.',
    '',
    '### Searching with DQL',
    'Use the `search` action with a DQL query. DQL is SQL-like:',
    '- Full-text search: `SELECT r_object_id, object_name FROM dm_document WHERE CONTAINS(object_name, \'keyword\') ENABLE (RETURN_TOP 20)`',
    '- Path-scoped search: `SELECT r_object_id, object_name FROM dm_document WHERE FOLDER(\'/Default/Reports\') ENABLE (RETURN_TOP 20)`',
    '- Date filter: `SELECT r_object_id, object_name, r_modify_date FROM dm_document WHERE r_modify_date > DATE(\'2024-01-01\') ENABLE (RETURN_TOP 20)`',
    '- Always include `r_object_id` in the SELECT list — it is required to call `getObject` or `getContent`.',
    '',
    '### Reading document content',
    '1. Call `search` or `listFolderContents` to get r_object_id values.',
    '2. Call `getObject` to inspect metadata (a_content_type, r_content_size) before downloading.',
    '3. Call `getContent` to download document content. Text is returned as-is; binary (PDF, Word) is base64-encoded.',
    '',
    '### Common gotchas',
    '- Object IDs (r_object_id) are 16-character hex strings, e.g. 0900001680001234.',
    '- Documentum object types use `dm_` prefix: dm_document, dm_folder, dm_cabinet.',
    '- The FOLDER() predicate in DQL accepts a cabinet/folder path string (e.g., \'/Default\') or an ID expression.',
    '- If search returns no results, verify the repository name and that the user has read access to the target folder.',
    '- Per-action repositoryName overrides the connector default — useful when working with multiple repositories.',
  ].join('\n'),

  test: {
    description: i18n.translate(
      'core.kibanaConnectorSpecs.opentextDocumentum.test.description',
      {
        defaultMessage:
          'Verifies the connection to the Documentum REST Services by listing available repositories.',
      }
    ),
    handler: async (ctx) => {
      try {
        const { baseUrl } = ctx.config as { baseUrl: string; repositoryName: string };
        const url = `${baseUrl.replace(/\/$/, '')}/repositories`;
        const response = await ctx.client.get(url, {
          headers: { Accept: 'application/json' },
        });
        const entries: unknown[] = (response.data as { entries?: unknown[] })?.entries ?? [];
        return {
          ok: true,
          message: `Successfully connected to OpenText Documentum. ${entries.length} repository/repositories available.`,
        };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { ok: false, message };
      }
    },
  },
};

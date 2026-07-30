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

/**
 * Common Documentum object type names and their purpose, for use in field descriptions.
 */
const OBJECT_TYPE_DESCRIPTION =
  'The Documentum object type to query. Common types: ' +
  'dm_document (documents and files), ' +
  'dm_folder (folders), ' +
  'dm_cabinet (top-level cabinet containers), ' +
  'dm_sysobject (base object type — all content objects), ' +
  'dm_note (notes). ' +
  'Custom object types defined in the repository are also supported.';

export const SearchInputSchema = lazySchema(() =>
  z.object({
    dql: z
      .string()
      .min(1)
      .max(4000)
      .describe(
        'DQL (Documentum Query Language) query string. DQL is SQL-like. ' +
          'Example: "SELECT r_object_id, object_name, r_modify_date FROM dm_document WHERE folder(\'/Default/Reports\') ENABLE (RETURN_TOP 20)" — ' +
          'use FOLDER() predicate to scope to a path, CONTAINS() for full-text search, and ENABLE (RETURN_TOP N) to limit results. ' +
          'For full-text search: "SELECT r_object_id, object_name FROM dm_document WHERE CONTAINS(object_name, \'budget\') ENABLE (RETURN_TOP 20)". ' +
          'Always include r_object_id in the SELECT list so results can be used with getObject or getContent.'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .default(20)
      .describe('Maximum number of results to return (1–500, default 20)'),
    repositoryName: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'Name of the Documentum repository to query. Overrides the repository configured on the connector. ' +
          'Use listRepositories to discover available repository names.'
      ),
  })
);
export type SearchInput = z.infer<typeof SearchInputSchema>;

export const GetObjectInputSchema = lazySchema(() =>
  z.object({
    objectId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The Documentum object ID (r_object_id) of the object to retrieve. ' +
          'Object IDs are 16-character hex strings returned by search queries.'
      ),
    repositoryName: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'Name of the Documentum repository. Overrides the repository configured on the connector.'
      ),
  })
);
export type GetObjectInput = z.infer<typeof GetObjectInputSchema>;

export const GetContentInputSchema = lazySchema(() =>
  z.object({
    objectId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'The Documentum object ID (r_object_id) of the document whose content to download. ' +
          'Object IDs are 16-character hex strings returned by search or listFolderContents.'
      ),
    repositoryName: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'Name of the Documentum repository. Overrides the repository configured on the connector.'
      ),
  })
);
export type GetContentInput = z.infer<typeof GetContentInputSchema>;

export const ListCabinetsInputSchema = lazySchema(() =>
  z.object({
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe('Maximum number of cabinets to return (1–200, default 50)'),
    repositoryName: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'Name of the Documentum repository. Overrides the repository configured on the connector.'
      ),
  })
);
export type ListCabinetsInput = z.infer<typeof ListCabinetsInputSchema>;

export const ListFolderContentsInputSchema = lazySchema(() =>
  z.object({
    folderId: z
      .string()
      .regex(/^[0-9a-f]{16}$/i)
      .describe(
        'The Documentum object ID (r_object_id) of the folder or cabinet to list. ' +
          'Must be a 16-character hexadecimal string (e.g. 0900001680001234). ' +
          'Use listCabinets to get cabinet IDs, or search to find folder IDs.'
      ),
    objectType: z
      .string()
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
      .max(200)
      .optional()
      .describe(
        OBJECT_TYPE_DESCRIPTION +
          ' Leave empty to list all content objects. Common value: dm_document to list only documents.'
      ),
    maxResults: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(50)
      .describe('Maximum number of items to return (1–200, default 50)'),
    repositoryName: z
      .string()
      .min(1)
      .max(200)
      .optional()
      .describe(
        'Name of the Documentum repository. Overrides the repository configured on the connector.'
      ),
  })
);
export type ListFolderContentsInput = z.infer<typeof ListFolderContentsInputSchema>;

export const ListRepositoriesInputSchema = lazySchema(() => z.object({}));
export type ListRepositoriesInput = z.infer<typeof ListRepositoriesInputSchema>;

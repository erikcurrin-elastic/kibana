/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { OpentextDocumentum } from './opentext_documentum';

interface DqlResponse {
  entries: Array<{
    id: string;
    title: string;
    content: { properties: Record<string, unknown> };
  }>;
}

interface ObjectResponse {
  properties: Record<string, unknown>;
}

interface ContentResponse {
  mimeType: string;
  encoding: string;
  content: string;
}

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('OpentextDocumentum', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: {
      baseUrl: 'https://documentum.company.com/dctm-rest',
      repositoryName: 'DOCUMENTUM',
    },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has correct id and minimum license', () => {
      expect(OpentextDocumentum.metadata.id).toBe('.opentext_documentum');
      expect(OpentextDocumentum.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(OpentextDocumentum.metadata.supportedFeatureIds).toContain('workflows');
      expect(OpentextDocumentum.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(OpentextDocumentum.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('uses basic authentication', () => {
      const types = (OpentextDocumentum.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('basic');
    });
  });

  describe('schema', () => {
    it('has baseUrl and repositoryName fields', () => {
      if (!OpentextDocumentum.schema) throw new Error('schema not defined');
      const parsed = OpentextDocumentum.schema.parse({
        baseUrl: 'https://documentum.company.com/dctm-rest',
        repositoryName: 'DOCUMENTUM',
      });
      expect((parsed as { baseUrl: string }).baseUrl).toBe(
        'https://documentum.company.com/dctm-rest'
      );
      expect((parsed as { repositoryName: string }).repositoryName).toBe('DOCUMENTUM');
    });

    it('rejects invalid baseUrl', () => {
      if (!OpentextDocumentum.schema) throw new Error('schema not defined');
      expect(() =>
        OpentextDocumentum.schema.parse({
          baseUrl: 'not-a-url',
          repositoryName: 'DOCUMENTUM',
        })
      ).toThrow();
    });
  });

  describe('listRepositories action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.listRepositories.isTool).toBe(true);
    });

    it('calls the repositories endpoint', async () => {
      const mockResponse = {
        data: {
          entries: [
            { id: 'repo-1', title: 'DOCUMENTUM' },
            { id: 'repo-2', title: 'STAGING' },
          ],
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await OpentextDocumentum.actions.listRepositories.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories',
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('propagates API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Connection refused'));

      await expect(
        OpentextDocumentum.actions.listRepositories.handler(mockContext, {})
      ).rejects.toThrow('Connection refused');
    });
  });

  describe('search action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.search.isTool).toBe(true);
    });

    it('executes a DQL query with default maxResults', async () => {
      const mockResponse = {
        data: {
          entries: [
            {
              id: 'entry-1',
              title: 'Annual Report',
              content: {
                properties: { r_object_id: '0900001680001234', object_name: 'Annual Report' },
              },
            },
          ],
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = OpentextDocumentum.actions.search.input.parse({
        dql: "SELECT r_object_id, object_name FROM dm_document WHERE CONTAINS(object_name, 'annual report') ENABLE (RETURN_TOP 20)",
      });
      const result = (await OpentextDocumentum.actions.search.handler(
        mockContext,
        input
      )) as DqlResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/DOCUMENTUM/dql',
        expect.objectContaining({
          headers: { Accept: 'application/json' },
          params: expect.objectContaining({
            dql: expect.stringContaining('annual report'),
            'items-per-page': 20,
          }),
        })
      );
      expect(result.entries).toHaveLength(1);
    });

    it('uses a per-action repositoryName override', async () => {
      const mockResponse = { data: { entries: [] }, headers: {} };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = OpentextDocumentum.actions.search.input.parse({
        dql: 'SELECT r_object_id FROM dm_document ENABLE (RETURN_TOP 5)',
        repositoryName: 'STAGING',
        maxResults: 5,
      });
      await OpentextDocumentum.actions.search.handler(mockContext, input);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/STAGING/dql',
        expect.objectContaining({
          params: expect.objectContaining({ 'items-per-page': 5 }),
        })
      );
    });

    it('propagates API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('DQL syntax error'));

      await expect(
        OpentextDocumentum.actions.search.handler(mockContext, {
          dql: 'INVALID DQL',
          maxResults: 20,
        })
      ).rejects.toThrow('DQL syntax error');
    });
  });

  describe('getObject action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.getObject.isTool).toBe(true);
    });

    it('retrieves object properties by object ID', async () => {
      const mockResponse = {
        data: {
          properties: {
            r_object_id: '0900001680001234',
            object_name: 'Q4 Report',
            r_object_type: 'dm_document',
            a_content_type: 'pdf',
            r_content_size: 102400,
          },
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = OpentextDocumentum.actions.getObject.input.parse({
        objectId: '0900001680001234',
      });
      const result = (await OpentextDocumentum.actions.getObject.handler(
        mockContext,
        input
      )) as ObjectResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/DOCUMENTUM/objects/0900001680001234',
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect(result.properties.object_name).toBe('Q4 Report');
    });

    it('propagates not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Object not found'));

      await expect(
        OpentextDocumentum.actions.getObject.handler(mockContext, { objectId: 'invalid-id' })
      ).rejects.toThrow('Object not found');
    });
  });

  describe('getContent action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.getContent.isTool).toBe(true);
    });

    it('returns text content as utf-8', async () => {
      const textContent = 'This is the document body.';
      const buffer = Buffer.from(textContent, 'utf8');
      mockClient.get.mockResolvedValue({
        data: buffer,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });

      const input = OpentextDocumentum.actions.getContent.input.parse({
        objectId: '0900001680001234',
      });
      const result = (await OpentextDocumentum.actions.getContent.handler(
        mockContext,
        input
      )) as ContentResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/DOCUMENTUM/objects/0900001680001234/content-media',
        { responseType: 'arraybuffer' }
      );
      expect(result.mimeType).toBe('text/plain');
      expect(result.encoding).toBe('utf-8');
      expect(result.content).toBe(textContent);
    });

    it('returns binary content as base64', async () => {
      const pdfBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]);
      mockClient.get.mockResolvedValue({
        data: pdfBytes,
        headers: { 'content-type': 'application/pdf' },
      });

      const input = OpentextDocumentum.actions.getContent.input.parse({
        objectId: '0900001680005678',
      });
      const result = (await OpentextDocumentum.actions.getContent.handler(
        mockContext,
        input
      )) as ContentResponse;

      expect(result.mimeType).toBe('application/pdf');
      expect(result.encoding).toBe('base64');
      expect(result.content).toBe(pdfBytes.toString('base64'));
    });

    it('propagates download errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(
        OpentextDocumentum.actions.getContent.handler(mockContext, {
          objectId: '0900001680001234',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('listCabinets action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.listCabinets.isTool).toBe(true);
    });

    it('lists cabinets with default maxResults', async () => {
      const mockResponse = {
        data: {
          entries: [
            {
              id: 'cab-1',
              title: 'Default',
              content: { properties: { r_object_id: '0b00001680000001' } },
            },
            {
              id: 'cab-2',
              title: 'Archive',
              content: { properties: { r_object_id: '0b00001680000002' } },
            },
          ],
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await OpentextDocumentum.actions.listCabinets.handler(mockContext, {
        maxResults: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/DOCUMENTUM/cabinets',
        {
          headers: { Accept: 'application/json' },
          params: { 'items-per-page': 50 },
        }
      );
      expect((result as DqlResponse).entries).toHaveLength(2);
    });

    it('propagates API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Repository not found'));

      await expect(
        OpentextDocumentum.actions.listCabinets.handler(mockContext, {})
      ).rejects.toThrow('Repository not found');
    });
  });

  describe('listFolderContents action', () => {
    it('is exposed as a tool', () => {
      expect(OpentextDocumentum.actions.listFolderContents.isTool).toBe(true);
    });

    it('lists folder contents via DQL', async () => {
      const mockResponse = {
        data: {
          entries: [
            {
              id: 'obj-1',
              title: 'Q4 Report.pdf',
              content: { properties: { r_object_type: 'dm_document' } },
            },
            {
              id: 'obj-2',
              title: 'Sub-folder',
              content: { properties: { r_object_type: 'dm_folder' } },
            },
          ],
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = OpentextDocumentum.actions.listFolderContents.input.parse({
        folderId: '0b00001680000001',
      });
      const result = (await OpentextDocumentum.actions.listFolderContents.handler(
        mockContext,
        input
      )) as DqlResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories/DOCUMENTUM/dql',
        expect.objectContaining({
          params: expect.objectContaining({
            dql: expect.stringContaining("FOLDER ID '0b00001680000001'"),
          }),
        })
      );
      expect(result.entries).toHaveLength(2);
    });

    it('filters by objectType when provided', async () => {
      const mockResponse = { data: { entries: [] }, headers: {} };
      mockClient.get.mockResolvedValue(mockResponse);

      const input = OpentextDocumentum.actions.listFolderContents.input.parse({
        folderId: '0b00001680000001',
        objectType: 'dm_document',
        maxResults: 10,
      });
      await OpentextDocumentum.actions.listFolderContents.handler(mockContext, input);

      const callArgs = mockClient.get.mock.calls[0][1] as { params: { dql: string } };
      expect(callArgs.params.dql).toContain('TYPE(dm_document)');
    });

    it('propagates API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Folder not found'));

      await expect(
        OpentextDocumentum.actions.listFolderContents.handler(mockContext, {
          folderId: 'nonexistent-id',
          maxResults: 50,
        })
      ).rejects.toThrow('Folder not found');
    });
  });

  describe('test handler', () => {
    it('returns ok with repository count on success', async () => {
      const mockResponse = {
        data: {
          entries: [{ id: 'repo-1', title: 'DOCUMENTUM' }],
        },
        headers: {},
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!OpentextDocumentum.test) throw new Error('test handler not defined');
      const result = (await OpentextDocumentum.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://documentum.company.com/dctm-rest/repositories',
        {
          headers: { Accept: 'application/json' },
        }
      );
      expect(result.ok).toBe(true);
      expect(result.message).toContain('Successfully connected to OpenText Documentum');
    });

    it('returns failure on API error', async () => {
      mockClient.get.mockRejectedValue(new Error('Authentication failed'));

      if (!OpentextDocumentum.test) throw new Error('test handler not defined');
      const result = (await OpentextDocumentum.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Authentication failed');
    });
  });

  describe('skill property', () => {
    it('is defined and provides DQL guidance', () => {
      expect(OpentextDocumentum.skill).toBeDefined();
      expect(typeof OpentextDocumentum.skill).toBe('string');
      expect(OpentextDocumentum.skill).toContain('search');
      expect(OpentextDocumentum.skill).toContain('DQL');
    });
  });
});

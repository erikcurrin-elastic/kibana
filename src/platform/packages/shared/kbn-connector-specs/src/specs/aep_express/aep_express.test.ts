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
import { AepExpress } from './aep_express';

// Mock withMcpClient so handlers don't need a real MCP transport.
// callToolJson/callToolContent also route through withMcpClient internally.
const mockCallTool = jest.fn();
const mockListTools = jest.fn();

jest.mock('../../lib/mcp/with_mcp_client', () => ({
  withMcpClient: jest.fn(async (_ctx: unknown, fn: (mcp: unknown) => Promise<unknown>) => {
    return fn({ callTool: mockCallTool, listTools: mockListTools });
  }),
}));

// Apply Zod defaults the way the framework does before invoking a handler.
const parse = <K extends keyof typeof AepExpress.actions>(action: K, raw: Record<string, unknown>) =>
  AepExpress.actions[action].input.parse(raw);

describe('AEP Express', () => {
  const mockContext = {
    client: {},
    log: {},
    config: { serverUrl: 'https://adobe-creativity.adobe.io/mcp' },
  } as unknown as ActionContext;

  const mockJson = { id: 'design-abc-123', title: 'My Design' };
  const mockContent = [{ type: 'text', text: JSON.stringify(mockJson) }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCallTool.mockResolvedValue({ content: mockContent });
    mockListTools.mockResolvedValue({ tools: [{ name: 'search_templates' }, { name: 'create_design' }] });
  });

  it('should be defined', () => {
    expect(AepExpress).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.aep_express');
    expect(spec).toBe(AepExpress);
    expect(spec?.actions.searchTemplates).toBeDefined();
    expect(spec?.actions.searchTemplates.isTool).toBe(true);
  });

  describe('metadata', () => {
    it('has correct id and minimum license', () => {
      expect(AepExpress.metadata.id).toBe('.aep_express');
      expect(AepExpress.metadata.minimumLicense).toBe('enterprise');
    });

    it('supports workflows and agentBuilder', () => {
      expect(AepExpress.metadata.supportedFeatureIds).toContain('workflows');
      expect(AepExpress.metadata.supportedFeatureIds).toContain('agentBuilder');
    });

    it('is marked as technical preview', () => {
      expect(AepExpress.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('uses oauth_authorization_code with correct Adobe IMS defaults', () => {
      const oauthType = AepExpress.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      );
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
          tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
        },
      });
    });

    it('hides all OAuth URL and scope fields', () => {
      const oauthType = AepExpress.auth?.types.find(
        (t) => typeof t === 'object' && t.type === 'oauth_authorization_code'
      ) as { overrides?: { meta?: Record<string, unknown> } } | undefined;
      expect(oauthType?.overrides?.meta).toMatchObject({
        authorizationUrl: { hidden: true },
        tokenUrl: { hidden: true },
        scope: { hidden: true },
      });
    });
  });

  describe('schema', () => {
    it('has a serverUrl field with correct default', () => {
      if (!AepExpress.schema) throw new Error('schema not defined');
      const parsed = AepExpress.schema.parse({});
      expect((parsed as { serverUrl?: string }).serverUrl).toBe(
        'https://adobe-creativity.adobe.io/mcp'
      );
    });
  });

  describe('validateUrls', () => {
    it('validates the serverUrl field', () => {
      expect(AepExpress.validateUrls?.fields).toContain('serverUrl');
    });
  });

  describe('searchTemplates action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.searchTemplates.isTool).toBe(true);
    });

    it('calls search_templates with query and default maxResults', async () => {
      const input = parse('searchTemplates', { query: 'social media post' });
      await AepExpress.actions.searchTemplates.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'search_templates',
        arguments: { query: 'social media post', category: undefined, max_results: 20 },
      });
    });

    it('passes optional category filter', async () => {
      const input = parse('searchTemplates', { query: 'banner', category: 'marketing', maxResults: 5 });
      await AepExpress.actions.searchTemplates.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'search_templates',
        arguments: { query: 'banner', category: 'marketing', max_results: 5 },
      });
    });
  });

  describe('createDesign action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.createDesign.isTool).toBe(true);
    });

    it('calls create_design with templateId and title', async () => {
      const input = parse('createDesign', { templateId: 'tmpl-123', title: 'Q3 Banner' });
      await AepExpress.actions.createDesign.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_design',
        arguments: { template_id: 'tmpl-123', title: 'Q3 Banner', width: undefined, height: undefined },
      });
    });

    it('calls create_design with custom dimensions for blank canvas', async () => {
      const input = parse('createDesign', { width: 1080, height: 1080 });
      await AepExpress.actions.createDesign.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'create_design',
        arguments: { template_id: undefined, title: undefined, width: 1080, height: 1080 },
      });
    });
  });

  describe('getDesign action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.getDesign.isTool).toBe(true);
    });

    it('calls get_design with the design ID', async () => {
      const input = parse('getDesign', { designId: 'design-abc-123' });
      await AepExpress.actions.getDesign.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'get_design',
        arguments: { design_id: 'design-abc-123' },
      });
    });
  });

  describe('exportDesign action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.exportDesign.isTool).toBe(true);
    });

    it('calls export_design with defaults (png format)', async () => {
      const input = parse('exportDesign', { designId: 'design-abc-123' });
      await AepExpress.actions.exportDesign.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'export_design',
        arguments: { design_id: 'design-abc-123', format: 'png', quality: undefined },
      });
    });

    it('calls export_design with pdf format', async () => {
      const input = parse('exportDesign', { designId: 'design-abc-123', format: 'pdf' });
      await AepExpress.actions.exportDesign.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'export_design',
        arguments: { design_id: 'design-abc-123', format: 'pdf', quality: undefined },
      });
    });
  });

  describe('generateImage action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.generateImage.isTool).toBe(true);
    });

    it('calls generate_image with prompt and default aspect ratio', async () => {
      const input = parse('generateImage', { prompt: 'A mountain at sunset' });
      await AepExpress.actions.generateImage.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'generate_image',
        arguments: { prompt: 'A mountain at sunset', style: undefined, aspect_ratio: '1:1' },
      });
    });

    it('passes optional style and aspect ratio', async () => {
      const input = parse('generateImage', {
        prompt: 'Watercolor flowers',
        style: 'watercolor',
        aspectRatio: '4:3',
      });
      await AepExpress.actions.generateImage.handler(mockContext, input);

      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'generate_image',
        arguments: { prompt: 'Watercolor flowers', style: 'watercolor', aspect_ratio: '4:3' },
      });
    });
  });

  describe('listTools action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.listTools.isTool).toBe(true);
    });

    it('returns the list of available tools', async () => {
      const result = await AepExpress.actions.listTools.handler(mockContext, {});
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual([{ name: 'search_templates' }, { name: 'create_design' }]);
    });
  });

  describe('callTool action', () => {
    it('is exposed as a tool', () => {
      expect(AepExpress.actions.callTool.isTool).toBe(true);
    });

    it('calls the named tool with provided arguments', async () => {
      await AepExpress.actions.callTool.handler(mockContext, {
        name: 'remove_background',
        arguments: { design_id: 'design-abc-123' },
      });
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'remove_background',
        arguments: { design_id: 'design-abc-123' },
      });
    });

    it('calls the named tool with empty arguments when omitted', async () => {
      await AepExpress.actions.callTool.handler(mockContext, { name: 'list_my_designs' });
      expect(mockCallTool).toHaveBeenCalledWith({
        name: 'list_my_designs',
        arguments: {},
      });
    });
  });

  describe('test handler', () => {
    it('returns ok with tool count on successful connection', async () => {
      if (!AepExpress.test) throw new Error('test handler not defined');
      const result = await AepExpress.test.handler(mockContext);
      expect(mockListTools).toHaveBeenCalled();
      expect(result).toEqual({
        ok: true,
        message: 'Connected to Adobe Express MCP server. 2 tools available.',
      });
    });

    it('propagates errors thrown by withMcpClient', async () => {
      const { withMcpClient } = jest.requireMock('../../lib/mcp/with_mcp_client');
      withMcpClient.mockRejectedValueOnce(new Error('connection refused'));
      if (!AepExpress.test) throw new Error('test handler not defined');
      await expect(AepExpress.test.handler(mockContext)).rejects.toThrow('connection refused');
    });
  });

  describe('skill property', () => {
    it('is defined and contains multi-step guidance', () => {
      expect(AepExpress.skill).toBeDefined();
      expect(typeof AepExpress.skill).toBe('string');
      expect(AepExpress.skill).toContain('searchTemplates');
      expect(AepExpress.skill).toContain('createDesign');
      expect(AepExpress.skill).toContain('exportDesign');
      expect(AepExpress.skill).toContain('generateImage');
    });
  });
});

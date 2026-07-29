/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * AEP Express (Adobe Express) MCP Connector
 *
 * An MCP-native connector that connects to the official Adobe for Creativity
 * remote MCP server, exposing Adobe Express design and creative capabilities.
 *
 * Auth: OAuth 2.0 Authorization Code flow (Adobe IMS)
 * MCP Server: https://adobe-creativity.adobe.io/mcp
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import { UISchemas, type ConnectorSpec } from '../../connector_spec';
import { withMcpClient, callToolContent, callToolJson } from '../../lib/mcp';
import type {
  CallToolInput,
  CreateDesignInput,
  ExportDesignInput,
  GenerateImageInput,
  GetDesignInput,
  SearchTemplatesInput,
} from './types';
import {
  CallToolInputSchema,
  CreateDesignInputSchema,
  ExportDesignInputSchema,
  GenerateImageInputSchema,
  GetDesignInputSchema,
  ListToolsInputSchema,
  SearchTemplatesInputSchema,
} from './types';

const AEP_EXPRESS_MCP_SERVER_URL = 'https://adobe-creativity.adobe.io/mcp';

export const AepExpress: ConnectorSpec = {
  metadata: {
    id: '.aep_express',
    displayName: 'AEP Express',
    description: i18n.translate('core.kibanaConnectorSpecs.aepExpress.metadata.description', {
      defaultMessage:
        'Search templates, create and export designs, and generate images with Adobe Express',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    supportedFeatureIds: ['workflows', 'agentBuilder'],
  },

  auth: {
    types: [
      {
        type: 'oauth_authorization_code',
        defaults: {
          authorizationUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
          tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
          scope: 'AdobeID openid creative_sdk',
        },
        overrides: {
          meta: {
            authorizationUrl: { hidden: true },
            tokenUrl: { hidden: true },
            scope: { hidden: true },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      serverUrl: UISchemas.url()
        .default(AEP_EXPRESS_MCP_SERVER_URL)
        .describe('Adobe Express MCP Server URL')
        .meta({
          widget: 'text',
          placeholder: AEP_EXPRESS_MCP_SERVER_URL,
          hidden: true,
          label: i18n.translate('connectorSpecs.aepExpress.config.serverUrl.label', {
            defaultMessage: 'MCP server URL',
          }),
          helpText: i18n.translate('connectorSpecs.aepExpress.config.serverUrl.helpText', {
            defaultMessage: 'The URL of the official Adobe for Creativity remote MCP server.',
          }),
        }),
    })
  ),

  validateUrls: {
    fields: ['serverUrl'],
  },

  actions: {
    // ── Discovery ─────────────────────────────────────────────────────────────
    searchTemplates: {
      isTool: true,
      description:
        'Search the Adobe Express template library by keyword or category. Returns matching templates with IDs, ' +
        'titles, and preview URLs. Use this to find a starting template before creating a design.',
      input: SearchTemplatesInputSchema,
      handler: async (ctx, input: SearchTemplatesInput) => {
        return callToolJson(ctx, 'search_templates', {
          query: input.query,
          category: input.category,
          max_results: input.maxResults,
        });
      },
    },

    // ── Design creation ────────────────────────────────────────────────────────
    createDesign: {
      isTool: true,
      description:
        'Create a new Adobe Express design, optionally based on a template. Returns the design ID and an editable ' +
        'design URL. Use searchTemplates first to find a templateId, or omit it to start with a blank canvas.',
      input: CreateDesignInputSchema,
      handler: async (ctx, input: CreateDesignInput) => {
        return callToolJson(ctx, 'create_design', {
          template_id: input.templateId,
          title: input.title,
          width: input.width,
          height: input.height,
        });
      },
    },

    // ── Design retrieval ───────────────────────────────────────────────────────
    getDesign: {
      isTool: true,
      description:
        'Retrieve metadata and status for an existing Adobe Express design by ID. Returns title, dimensions, ' +
        'creation date, and a shareable link. Use the designId from createDesign or searchTemplates.',
      input: GetDesignInputSchema,
      handler: async (ctx, input: GetDesignInput) => {
        return callToolJson(ctx, 'get_design', {
          design_id: input.designId,
        });
      },
    },

    // ── Export ─────────────────────────────────────────────────────────────────
    exportDesign: {
      isTool: true,
      description:
        'Export an Adobe Express design as a downloadable file. Supports PNG, JPG, PDF, and MP4 formats. ' +
        'WARNING: Returns base64-encoded binary content — only call this when you have a plan to store or ' +
        'process the data (e.g. via an Elasticsearch ingest pipeline or a downstream storage step). ' +
        'If the action fails with a response size error, reduce quality or switch to a lower-fidelity format.',
      input: ExportDesignInputSchema,
      handler: async (ctx, input: ExportDesignInput) => {
        return callToolContent(ctx, 'export_design', {
          design_id: input.designId,
          format: input.format,
          quality: input.quality,
        });
      },
    },

    // ── AI generation ──────────────────────────────────────────────────────────
    generateImage: {
      isTool: true,
      description:
        'Generate an image using Adobe Firefly AI from a text prompt. Returns a generated image that can be ' +
        'inserted into an Express design or downloaded directly. Specify a style and aspect ratio to control ' +
        'the output appearance. WARNING: Returns base64-encoded image content — only call this when you have ' +
        'a plan to use or store the resulting image.',
      input: GenerateImageInputSchema,
      handler: async (ctx, input: GenerateImageInput) => {
        return callToolContent(ctx, 'generate_image', {
          prompt: input.prompt,
          style: input.style,
          aspect_ratio: input.aspectRatio,
        });
      },
    },

    // ── Escape hatches (always include) ───────────────────────────────────────
    listTools: {
      isTool: true,
      description:
        'List all tools available on the Adobe Express MCP server. Use this to discover capabilities ' +
        'not exposed as named actions, such as image editing, text effects, background removal, and ' +
        'design publishing operations.',
      input: ListToolsInputSchema,
      handler: async (ctx) => {
        return withMcpClient(ctx, async (mcp) => {
          const { tools } = await mcp.listTools();
          return tools;
        });
      },
    },

    callTool: {
      isTool: true,
      description:
        'Call any tool on the Adobe Express MCP server directly by name. Use this as an escape hatch ' +
        'for tools not yet exposed as named actions — such as remove_background, resize_design, or ' +
        'add_text_element. Use listTools first to discover available tool names and their arguments.',
      input: CallToolInputSchema,
      handler: async (ctx, input: CallToolInput) => {
        return callToolContent(ctx, input.name, input.arguments);
      },
    },
  },

  test: {
    description: i18n.translate('connectorSpecs.aepExpress.test.description', {
      defaultMessage:
        'Verifies connection to the Adobe Express MCP server by listing available tools.',
    }),
    handler: async (ctx) => {
      return withMcpClient(ctx, async (mcp) => {
        const { tools } = await mcp.listTools();
        return {
          ok: true,
          message: `Connected to Adobe Express MCP server. ${tools.length} tools available.`,
        };
      });
    },
  },

  skill: [
    '## AEP Express Connector — usage guidance',
    '',
    '### Creating a design from a template',
    'To create a branded design: call `searchTemplates` with a keyword (e.g. "social media post"),',
    'pick a templateId from the results, then call `createDesign` with that templateId.',
    'Retrieve the editable URL from the `createDesign` response to open the design in Adobe Express.',
    '',
    '### Exporting finished designs',
    'Use `exportDesign` after the design is ready. Choose "png" for web images, "pdf" for print, or',
    '"mp4" for animated exports. The returned content is base64-encoded — pass it to an Elasticsearch',
    'ingest pipeline attachment processor or store it in a document field.',
    '',
    '### Generating images with Firefly AI',
    'Call `generateImage` with a descriptive prompt to produce AI-generated imagery.',
    'Use the `style` parameter (e.g. "photographic", "watercolor") and `aspectRatio` to control the result.',
    'The returned image is base64-encoded binary content.',
    '',
    '### Discovering additional tools',
    'The Adobe Express MCP server exposes 50+ tools across Express, Firefly, Photoshop, Lightroom,',
    'Illustrator, Premiere, InDesign, and Adobe Stock. Use `listTools` to see the full list,',
    'then `callTool` to invoke any tool not yet exposed as a named action.',
    '',
    '### Common gotchas',
    '- Design IDs and template IDs are opaque strings — always use the values returned by the API.',
    '- Choose export format by use case: PNG for web images, PDF for print documents, MP4 for animations.',
    '- Adobe Firefly image generation is subject to content policy — if a prompt is rejected,',
    '  simplify or generalize it and retry.',
    '- If an auth or token-expired error is returned, inform the user and ask them to re-authenticate',
    '  through the connector configuration before retrying.',
  ].join('\n'),
};

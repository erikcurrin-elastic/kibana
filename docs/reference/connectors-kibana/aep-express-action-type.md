---
navigation_title: "AEP Express"
type: reference
description: "Use the AEP Express connector to search templates, create and export designs, and generate AI images with Adobe Firefly through the Adobe for Creativity remote MCP server."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# AEP Express connector [aep-express-action-type]

The AEP Express connector connects to Adobe Express through the official Adobe for Creativity remote Model Context Protocol (MCP) server at `https://adobe-creativity.adobe.io/mcp`. Agents and workflows use the connector to search design templates, create new designs, export finished assets, and generate images using Adobe Firefly AI. Authentication uses Adobe IMS OAuth 2.0, so Adobe IMS OAuth 2.0 scopes each connector instance to a specific Adobe account.

## Creating connectors in {{kib}} [define-aep-express-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [aep-express-connector-configuration]

AEP Express connectors have the following configuration properties:

**Authentication**
:   Authenticates through Adobe IMS OAuth 2.0 Authorization Code flow. Requires a Client ID and Client Secret from a registered Adobe Developer Console app. For setup instructions, see [OAuth credentials](#aep-express-oauth-credentials).

## Connector actions [aep-express-connector-actions]

The AEP Express connector exposes the following actions:

### Template discovery

`searchTemplates`
:   Search the Adobe Express template library by keyword or category. Returns matching templates with IDs, titles, and preview URLs. Use this to find a starting template before creating a design.

### Design management

`createDesign`
:   Create a new Adobe Express design, optionally based on a template. Specify a `templateId` from `searchTemplates` to start from a template, or supply `width` and `height` to create a blank canvas. Returns the design ID and an editable design URL.

`getDesign`
:   Retrieve metadata and status for an existing Adobe Express design by ID. Returns the design title, dimensions, creation date, and a shareable link. Use the design ID from `createDesign` or `searchTemplates`.

### Export

`exportDesign`
:   Export an Adobe Express design as a downloadable file. Supports PNG (default), JPG, PDF, and MP4 formats. Returns base64-encoded binary content — only call this action when you have a plan to store or process the output, such as passing it to an Elasticsearch ingest pipeline attachment processor.

### Artificial intelligence (AI) image generation

`generateImage`
:   Generate an image using Adobe Firefly AI from a text prompt. Control the visual style and aspect ratio with optional parameters. Returns base64-encoded image content — use this only when you have a plan to use or store the image.

### Utilities

`listTools`
:   List all tools available on the Adobe Express MCP server. Use this to discover capabilities the connector doesn't expose as named actions, including image editing, text effects, background removal, and design publishing operations.

`callTool`
:   Call any tool on the Adobe Express MCP server directly by name. Use this as a fallback for tools the connector doesn't yet expose as named actions (such as `remove_background`, `resize_design`, or `add_text_element`). Use `listTools` first to discover available tool names and their arguments.

## Connector networking configuration [aep-express-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or Transport Layer Security (TLS) settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Getting OAuth credentials [aep-express-oauth-credentials]

To use the AEP Express connector, you must register an application in the Adobe Developer Console to obtain a Client ID and Client Secret.

1. Sign in to the [Adobe Developer Console](https://developer.adobe.com/console/) with your Adobe account.
2. Select **Create new project**, then select **Add API**.
3. Select **Creative Cloud** from the API catalog, then select **Adobe Express** or **Creative SDK**.
4. Select **OAuth 2.0** as the authentication method and select **Web** as the platform.
5. Add `https://<your-kibana-host>/api/actions/connector/_oauth_callback` to the list of **Redirect URIs**.
6. Complete the project setup and navigate to the **Credentials** section.
7. Note the following values for use in {{kib}}:

   | Adobe Developer Console label | {{kib}} field |
   |-------------------------------|---------------|
   | **Client ID**                 | **Client ID**     |
   | **Client Secret**             | **Client Secret** |

8. In {{kib}}, enter the values from the preceding table.
9. Complete the authorization flow to connect your Adobe account.

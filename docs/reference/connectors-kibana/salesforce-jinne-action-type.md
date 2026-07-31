---
navigation_title: "Salesforce Jinne"
type: reference
description: "Use the Salesforce Jinne connector to list AI agents, start conversation sessions, send messages, and retrieve transcripts from Salesforce Jinne."
applies_to:
  stack: preview 9.6
  serverless: preview
products:
  - id: kibana
---

# Salesforce Jinne connector [salesforce-jinne-action-type]

The Salesforce Jinne connector communicates with the Salesforce Einstein AI Agent REST API to interact with Jinne AI agents configured in your Salesforce org. It supports listing agents, starting conversation sessions, sending messages, retrieving conversation transcripts, and ending sessions.

## Create connectors in {{kib}} [define-salesforce-jinne-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [salesforce-jinne-connector-configuration]

The Salesforce Jinne connector supports **OAuth 2.0 authorization code** (recommended) and **OAuth 2.0 Client Credentials** authentication in {{kib}}. The fields you fill in depend on which auth type you select.

Token URL
:   The OAuth 2.0 token endpoint for your Salesforce instance. Use your **domain** plus `/services/oauth2/token`.
    Examples: `https://login.salesforce.com/services/oauth2/token` (production),
    `https://test.salesforce.com/services/oauth2/token` (sandbox), or
    `https://yourcompany.my.salesforce.com/services/oauth2/token` (My Domain).

Authorization URL
:   Required when you use **OAuth 2.0 authorization code** authentication. Use the same **domain** as for Token URL, with
    `/services/oauth2/authorize`. Omit this when you use client credentials only.

Client ID
:   The **Consumer Key** from your Salesforce External Client App OAuth settings.

Client Secret
:   The **Consumer Secret** from your Salesforce External Client App OAuth settings.

The connector uses the token URL to obtain access tokens and to derive the Salesforce instance base URL for API calls.

## Test connectors [salesforce-jinne-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.

The Salesforce Jinne connector has the following actions:

List agents
:   List all Jinne AI agents configured in the Salesforce org. Returns each agent's ID, name, description, and status. Use this action first to discover which agents are available before starting a conversation.
    - `maxResults` (optional): Maximum number of agents to return (1–100). Defaults to 20.
    - `nextPageUrl` (optional): Pagination URL from a previous `listAgents` response.

Create session
:   Start a new conversation session with a specific Jinne AI agent. Returns the `sessionId` and any initial agent response. Pass the `sessionId` to `sendMessage` to begin the conversation.
    - `agentId` (required): The ID of the Jinne agent to converse with (from `listAgents`).
    - `externalSessionKey` (optional): A caller-defined key to correlate the session with your external system. Must be unique per agent.

Send message
:   Send a message to an active Jinne AI agent session and receive the agent's response. The agent has access to your Salesforce data and any tools configured in its definition. Call this action repeatedly on the same `sessionId` for multi-turn conversations.
    - `sessionId` (required): The session ID returned by `createSession`.
    - `message` (required): The message or question to send to the agent (up to 10,000 characters).
    - `variables` (optional): Structured input variables to pass alongside the message (for example, a Salesforce record ID for the agent to look up).

Get session messages
:   Retrieve the conversation transcript for an existing Jinne session, including both user messages and agent replies in chronological order.
    - `sessionId` (required): The session ID returned by `createSession`.
    - `maxResults` (optional): Maximum number of messages to return (1–100). Defaults to 20.
    - `nextPageUrl` (optional): Pagination URL from a previous `getSessionMessages` response.

End session
:   End an active Jinne AI agent session. This action finalizes the conversation transcript and frees up agent capacity. The session cannot be resumed after you end it; call this only when the conversation is fully complete.
    - `sessionId` (required): The session ID returned by `createSession`.

## Connector networking configuration [salesforce-jinne-connector-networking-configuration]

Use the **Action configuration settings** in the configuration reference for alerting to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-jinne-api-credentials]

Use the following steps to obtain credentials for the Salesforce Jinne connector. The Jinne connector uses the same Salesforce OAuth 2.0 mechanism as the [Salesforce connector](/reference/connectors-kibana/salesforce-action-type.md); you can reuse an existing External Client App or create a dedicated one.

The required OAuth scopes include **Manage user data via APIs (api)** and **Perform requests at any time (refresh_token, offline_access)**. The Jinne agent API additionally requires the **einstein_agent_api** scope (or equivalent) in your org — consult your Salesforce administrator to confirm which scopes are required for Jinne agent access in your org.

### OAuth callback URL

Copy the following pattern into Salesforce **Callback URL**, replacing `<your-kibana-host>` with your {{kib}} public hostname.

```text
https://<your-kibana-host>/api/actions/connector/_oauth_callback
```

1. Log in to the Salesforce org. From the **cog** menu, select **Setup**.
2. In the navigation panel, under **Platform Tools**, expand **Apps** > **External Client Apps**.
3. Open **External Client App Manager**, then select **New External Client App**.
4. Set an **External Client App Name** (for example, `Elastic Jinne`) and an **API Name**.
5. Under **OAuth Settings**, set **Callback URL** to the value from **OAuth callback URL**.
6. Under **Available Scopes**, select at least:
   - **Manage user data via APIs (api)**
   - **Perform requests at any time (refresh_token, offline_access)**
   - Any additional scopes required for Jinne agent API access in your org.
7. Under **Flow Enablement**, enable the flow that matches the authentication type you use:
   - **OAuth 2.0 authorization code** — enable **Enable Authorization Code and Credentials Flow**.
   - **OAuth 2.0 Client Credentials** — enable **Enable Client Credentials Flow**.
8. **Save** the app and copy the **Consumer Key** (Client ID) and **Consumer Secret** (Client Secret).
9. In {{kib}}, create the Salesforce Jinne connector and enter:
   - **Token URL**: your org's token endpoint (domain + `/services/oauth2/token`).
   - **Authorization URL** (authorization code flow only): domain + `/services/oauth2/authorize`.
   - **Client ID**: the Consumer Key.
   - **Client Secret**: the Consumer Secret.

For more background, search Salesforce Help for **External Client Apps** and the **OAuth 2.0 flows** applicable to your org.

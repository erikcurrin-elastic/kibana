---
navigation_title: "Salesforce Marketing Cloud"
type: reference
description: "Use the Salesforce Marketing Cloud connector to look up subscribers, query Data Extensions, and inspect journeys and email send definitions in SFMC."
applies_to:
  stack: preview 9.6+
  serverless: preview
products:
  - id: kibana
---

# Salesforce Marketing Cloud connector [salesforce-marketing-cloud-action-type]

The Salesforce Marketing Cloud (SFMC) connector communicates with the SFMC REST API to look up subscribers, query data from Data Extensions, list and inspect Journey Builder journeys, and browse email send definitions.

## Create connectors in {{kib}} [define-sfmc-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [sfmc-connector-configuration]

The Salesforce Marketing Cloud connector uses **OAuth 2.0 Client Credentials** authentication with a tenant-specific token endpoint.

REST API Base URL
:   The REST API endpoint for your SFMC tenant.
    Format: `https://{subdomain}.rest.marketingcloudapis.com`
    You can find your subdomain in SFMC **Setup** > **Platform** > **Apps** > **Installed Packages** > your package > **API Integration**.

Token URL
:   The OAuth 2.0 token endpoint for your SFMC tenant.
    Format: `https://{subdomain}.auth.marketingcloudapis.com/v2/token`
    Use the same subdomain as in the REST API Base URL.

Client ID
:   The **Client ID** from your SFMC Installed Package's API Integration component.

Client Secret
:   The **Client Secret** from your SFMC Installed Package's API Integration component.

## Test connectors [sfmc-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}. The test verifies connectivity by fetching the first page of Journey Builder journeys from the REST API.

The Salesforce Marketing Cloud connector has the following actions:

Lookup subscriber
:   Look up a subscriber in the SFMC All Subscribers list by email address. Returns subscription status, subscriber key, and profile attributes.
    - `email` (required): Email address to look up (for example, `jane.doe@example.com`).
    - `properties` (optional): List of attribute names to include in the response. Omit to return all default attributes.

Query data extension
:   Query rows from a Data Extension by its external key. Supports OData-style filtering and pagination.
    - `externalKey` (required): External key of the Data Extension (for example, `Contacts_DE` or `All Subscribers`).
    - `filter` (optional): OData-style filter expression (for example, `Status eq 'Active'` or `EmailAddress eq 'user@example.com'`).
    - `pageSize` (optional): Number of rows per page (1–2500, default 50).
    - `page` (optional): Page number for pagination (1-based, default 1).

List journeys
:   List Journey Builder journeys with their status, version, and statistics. Supports filtering by status and name.
    - `status` (optional): Filter by status — `Draft`, `Published`, `ScheduledToPublish`, `Stopped`, or `Unpublished`.
    - `nameFilter` (optional): Filter journeys whose name contains this string.
    - `page` (optional): Page number (1-based, default 1).
    - `pageSize` (optional): Number of journeys per page (1–50, default 10).

Get journey
:   Retrieve the full definition of a Journey Builder journey by ID, including all activities, entry sources, and schedule settings.
    - `id` (required): Journey ID (UUID) returned by the list journeys action.
    - `versionNumber` (optional): Specific version number to retrieve. Omit for the latest version.

List email definitions
:   List email send definitions (campaigns and transactional sends) with their status and configuration.
    - `status` (optional): Filter by status — `active` or `inactive`.
    - `page` (optional): Page number (1-based, default 1).
    - `pageSize` (optional): Number of definitions per page (1–100, default 20).

## Connector networking configuration [sfmc-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [sfmc-api-credentials]

Use the following steps to create an API Integration in your Salesforce Marketing Cloud account and obtain the credentials for this connector.

1. Log in to Salesforce Marketing Cloud and select **Setup**.
2. In the navigation panel, under **Platform**, expand **Apps** and click **Installed Packages**.
3. Click **New** to create a new installed package. Enter a name (for example, `Elastic`) and click **Save**.
4. Under **Components**, click **Add Component** and select **API Integration**.
5. Select **Server-to-Server** as the integration type, then click **Next**.
6. Select the scopes required for the connector:
   - **Contacts** > **Read** — required for subscriber lookup.
   - **Data** > **Read** — required for Data Extension queries.
   - **Journeys** > **Read** — required for listing and retrieving journeys.
   - **Messaging and Journeys** > **Read** — required for email send definitions.
7. Click **Save**. SFMC displays the **Client ID** and **Client Secret** for the integration.
8. Copy your account's *subdomain* from the **API Integration** panel — it is the identifier that appears in both the **Authentication Base URI** and **REST Base URI** (for example, `mc563885gzs27c5t9-63k636ttgm`).
9. Use the values in the connector configuration in {{kib}}:
   - **Client ID**: the Client ID from step 7.
   - **Client Secret**: the Client Secret from step 7.
   - **Token URL**: `https://{subdomain}.auth.marketingcloudapis.com/v2/token` (replace `{subdomain}` with your subdomain from step 8).
   - **REST API Base URL**: `https://{subdomain}.rest.marketingcloudapis.com` (replace `{subdomain}` with your subdomain from step 8).

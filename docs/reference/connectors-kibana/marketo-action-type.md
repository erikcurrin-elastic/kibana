---
navigation_title: "Marketo"
type: reference
description: "Use the Marketo connector to search leads, retrieve activity history, and list campaigns and static lists in Adobe Marketo Engage."
applies_to:
  stack: preview 9.6
  serverless: preview
---

# Marketo connector [marketo-action-type]

The Marketo connector communicates with the Adobe Marketo Engage REST API to search leads, retrieve activity history, and list campaigns and static lists in your Marketo instance.

## Create connectors in {{kib}} [define-marketo-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [marketo-connector-configuration]

Marketo connectors use OAuth 2.0 Client Credentials authentication. Each Marketo instance has a unique Munchkin ID that forms the base URL for all API calls.

- **Token URL**: The OAuth token endpoint for your instance. Format: `https://{munchkin-id}.mktorest.com/identity/oauth/token`.
- **Client ID**: The client ID from your Marketo LaunchPoint service.
- **Client Secret**: The client secret from your Marketo LaunchPoint service.

## Test connectors [marketo-action-configuration]

You can test connectors while creating or editing them in {{kib}}.

The Marketo connector has the following actions:

**Search Leads**
:   Filter Marketo leads by a field name and a list of values. Returns matching lead records.
    - **Filter Type** (required): The lead field to filter by, for example `email`, `id`, or `mktoName`. Use **Describe Leads** to discover all available field names.
    - **Filter Values** (required): A list of values to match (up to 300). For example, `["user@example.com"]` when filtering by `email`.
    - **Fields** (optional): Specific lead field names to include in the response. Omit to return default fields.
    - **Next Page Token** (optional): Pagination token from a previous response to retrieve the next page.

**Get Lead**
:   Retrieve the full record for a single Marketo lead by its integer ID.
    - **Lead ID** (required): The Marketo lead integer ID, returned by **Search Leads**.
    - **Fields** (optional): Specific lead field names to include in the response.

**Get Lead Activities**
:   Retrieve the activity history for Marketo leads since a given date. Returns events such as email opens, form fills, webpage visits, and campaign interactions.
    - **Since Date Time** (required): ISO 8601 datetime indicating how far back to retrieve activities, for example `2024-01-01T00:00:00Z`. Must be within the last 6 months.
    - **Lead IDs** (optional): Limit activities to up to 30 specific lead IDs.
    - **Activity Type IDs** (optional): Limit to specific activity types. Common IDs: 1 = Visit Webpage, 2 = Fill Out Form, 6 = Send Email, 7 = Email Delivered, 11 = Open Email, 12 = Click Email.
    - **Next Page Token** (optional): Pagination token from a previous response (supersedes **Since Date Time** when provided).
    - **Max Return** (optional): Maximum activities to return per page (1–300, default 200).

**Get Campaigns**
:   List Marketo campaigns (trigger-based and batch).
    - **Is Triggerable** (optional): When `true`, returns only trigger-based campaigns. When `false`, returns batch campaigns. Omit to return all.
    - **Program Name** (optional): Filter to campaigns in a specific program.
    - **Workspace Name** (optional): Filter to campaigns in a specific workspace (multi-workspace instances).
    - **Offset** (optional): Number of campaigns to skip for pagination (default 0).
    - **Max Return** (optional): Maximum campaigns to return (1–200, default 20).

**Get Lists**
:   List Marketo static lists.
    - **Name** (optional): Filter by exact list name, for example `Newsletter Subscribers`.
    - **Program Name** (optional): Filter to lists in a specific program.
    - **Workspace Name** (optional): Filter to lists in a specific workspace.
    - **Offset** (optional): Number of lists to skip for pagination (default 0).
    - **Max Return** (optional): Maximum lists to return (1–200, default 20).

**Describe Leads**
:   Retrieve the complete lead field schema for your Marketo instance. Returns all field names, their REST API names, and data types. Call this before **Search Leads** when you're unsure which field name to use as the filter type.

## Connector networking configuration [marketo-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [marketo-api-credentials]

Marketo uses OAuth 2.0 Client Credentials. You create a **LaunchPoint service** in your Marketo instance to generate the credentials.

### Find your Munchkin ID [marketo-munchkin-id]

1. Log in to your Marketo instance.
2. Navigate to **Admin > Integration > Munchkin**.
3. Copy your **Munchkin Account ID** (for example, `123-ABC-456`).
4. Your token URL is: `https://123-ABC-456.mktorest.com/identity/oauth/token`.

### Create a LaunchPoint API service [marketo-launchpoint-service]

1. In Marketo, navigate to **Admin > Integration > LaunchPoint**.
2. Select **New** > **New Service**.
3. Set **Display Name** to a descriptive name (for example, `Elastic Workplace AI`).
4. Set **Service** to **Custom**.
5. In the **API Only User** field, select or create a dedicated API user with the `API Access` role. This user must have the appropriate API permissions for the lead and campaign data you want to access.
6. Select **Create**.
7. Find the new service in the **LaunchPoint** list and select **View Details**.
8. Copy the **Client ID** and **Client Secret**.
9. Use these values along with your token URL when configuring the Marketo connector in {{kib}}.

:::{note}
Keep your client secret secure. Anyone with the client ID and secret can access your Marketo instance's lead and campaign data.
:::

:::{note}
Marketo access tokens expire after 3600 seconds. The connector refreshes tokens automatically.
:::

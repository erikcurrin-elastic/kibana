---
navigation_title: "OpenText Documentum"
type: reference
description: "Use the OpenText Documentum connector to search documents, list cabinets and folders, and retrieve content from an OpenText Documentum repository."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# OpenText Documentum connector [opentext-documentum-action-type]

The OpenText Documentum connector enables federated search and content retrieval from an OpenText Documentum repository using the Documentum REST Services API.

## Create connectors in {{kib}} [define-opentext-documentum-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [opentext-documentum-connector-configuration]

OpenText Documentum connectors use **HTTP Basic** authentication (username and password).

Documentum REST Services URL
:   The base URL of the Documentum REST Services (`dctm-rest`) deployment, without a trailing slash (for example, `https://documentum.company.com/dctm-rest`).

Default Repository Name
:   The name of the Documentum repository to query by default (for example, `DOCUMENTUM`). Individual actions can override this with the `repositoryName` parameter. Use the `listRepositories` action to discover available repository names.

Username
:   The Documentum username used for authentication.

Password
:   The password for the Documentum user.

## Test connectors [opentext-documentum-action-configuration]

You can test connectors when you create or edit the connector in {{kib}}.
The test action calls the Documentum REST Services `repositories` endpoint and reports how many repositories are accessible with the configured credentials.

The OpenText Documentum connector has the following actions:

List repositories
:   List all Documentum repositories available on this server. Use this first to confirm connectivity and discover valid repository names.
    - No required parameters.

Search
:   Execute a DQL (Documentum Query Language) query against the repository. DQL is SQL-like and supports full-text search, path-scoped filtering, date ranges, and more. Always include `r_object_id` in the `SELECT` list so results can be passed to `getObject` or `getContent`.
    - `dql` (required): The DQL query string. For example: `SELECT r_object_id, object_name FROM dm_document WHERE CONTAINS(object_name, 'budget') ENABLE (RETURN_TOP 20)`.
    - `maxResults` (optional): Maximum number of results to return (1–500, default 20).
    - `repositoryName` (optional): Override the default repository name for this query.

Get object
:   Retrieve the full metadata properties of a Documentum object by its `r_object_id`. Returns all attributes such as `object_name`, `r_creation_date`, `r_modify_date`, `r_content_size`, `a_content_type`, and any custom attributes.
    - `objectId` (required): The `r_object_id` of the object (16-character hex string returned by search or list actions).
    - `repositoryName` (optional): Override the default repository name.

Get content
:   Download the primary content of a Documentum document by its `r_object_id`. Text-based content is returned as UTF-8; binary content (PDF, Word, images, etc.) is returned as base64-encoded data with a `mimeType` field. Use `getObject` first to check `a_content_type` and `r_content_size` before downloading.
    - `objectId` (required): The `r_object_id` of the document to download.
    - `repositoryName` (optional): Override the default repository name.

List cabinets
:   List all top-level cabinets in the repository. Cabinets are the root containers in Documentum (analogous to top-level directories).
    - `maxResults` (optional): Maximum number of cabinets to return (1–200, default 50).
    - `repositoryName` (optional): Override the default repository name.

List folder contents
:   List the contents of a Documentum folder or cabinet by its `r_object_id`. Use `listCabinets` to get cabinet IDs, then browse deeper with this action.
    - `folderId` (required): The `r_object_id` of the folder or cabinet to list.
    - `objectType` (optional): Filter results to a specific Documentum object type, for example `dm_document` to show only documents.
    - `maxResults` (optional): Maximum number of items to return (1–200, default 50).
    - `repositoryName` (optional): Override the default repository name.

## Connector networking configuration [opentext-documentum-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [opentext-documentum-api-credentials]

The connector uses the standard Documentum username and password for the repository account.

1. In your Documentum environment, identify or create a user account with read access to the repositories and cabinets you want to search.
2. Ensure the Documentum REST Services (`dctm-rest`) web application is deployed and accessible from the Kibana server.
3. Verify the base URL by navigating to `{baseUrl}/repositories` in a browser — it should return a JSON list of available repositories.
4. Enter the following values when you configure the connector in {{kib}}:
   - **Documentum REST Services URL**: The base URL of the dctm-rest deployment (for example, `https://documentum.company.com/dctm-rest`).
   - **Default Repository Name**: The repository name to query (for example, `DOCUMENTUM`).
   - **Username** and **Password**: The Documentum account credentials.

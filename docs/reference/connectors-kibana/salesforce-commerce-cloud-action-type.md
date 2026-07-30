---
navigation_title: "Salesforce Commerce Cloud"
type: reference
description: "Use the Salesforce Commerce Cloud connector to search products, retrieve orders, and look up customers in your SFCC storefront."
applies_to:
  stack: preview 9.5
  serverless: preview
---

# Salesforce Commerce Cloud connector [salesforce-commerce-cloud-action-type]

The Salesforce Commerce Cloud connector communicates with the Salesforce Commerce Cloud Open Commerce API (OCAPI) to search products, retrieve order details, and look up customer records from your storefront.

## Create connectors in {{kib}} [define-salesforce-commerce-cloud-ui]

You can create connectors in **{{stack-manage-app}} > {{connectors-ui}}**.

### Connector configuration [salesforce-commerce-cloud-connector-configuration]

The Salesforce Commerce Cloud connector uses **OAuth 2.0 Client Credentials** authentication. Fill in the following fields:

Instance URL
:   The base URL of your Salesforce Commerce Cloud instance.
    Example: `https://xxxx-xxx.dx.commercecloud.salesforce.com`.
    Find it in Business Manager under **Administration > Site Development > Open Commerce API Settings**.

Site ID
:   The site ID to use for API requests. Must match a site configured in Business Manager.
    Example: `RefArch`, `SiteGenesis`. Use `-` to access data across all sites (global scope).
    Find site IDs under **Administration > Sites > Manage Sites**.

Token URL
:   The OAuth 2.0 token endpoint. Use `https://account.demandware.com/dw/oauth2/access_token` for
    standard Business Manager accounts, or your instance-specific token endpoint for ECDN environments.

Client ID
:   The OCAPI client ID registered in Business Manager under
    **Administration > Site Development > Open Commerce API Settings**.

Client Secret
:   The client secret associated with the OCAPI client ID.

## Test connectors [salesforce-commerce-cloud-action-configuration]

The Salesforce Commerce Cloud connector has the following actions:

**Search Products**
:   Search the product catalog by keyword, SKU, or product name. Returns a list of matching products with IDs, names, and basic pricing information.
    - **Query** (required): Full-text search query. Examples: `"blue jeans"`, `"SKU-12345"`, `"summer dress"`.
    - **Count** (optional): Maximum number of results to return (1–200, default 10).
    - **Start** (optional): Zero-based offset for pagination (default 0).
    - **Expand** (optional): List of expansion fields to include, such as `availability`, `images`, `prices`, or `variations`.

**Get Product**
:   Retrieve the full details for a single product by its ID. Returns the complete product record including name, description, price tiers, images, variants, inventory, and custom attributes.
    - **Product ID** (required): The product ID (case-sensitive). Use IDs returned by **Search Products**.
    - **Expand** (optional): List of expansion fields to include, such as `variations`, `prices`, `options`, or `set_products`.

**Search Orders**
:   Search orders using optional filters. Returns a list of matching orders with order numbers, totals, statuses, and customer information.
    - **Status** (optional): Filter by lifecycle status. Values: `new`, `open`, `completed`, `cancelled`, `replaced`, or `failed`.
    - **Customer Email** (optional): Filter by customer email address (exact match).
    - **Created From** (optional): Filter orders created on or after this ISO 8601 date. Example: `2024-01-01T00:00:00Z`.
    - **Created To** (optional): Filter orders created on or before this ISO 8601 date. Example: `2024-12-31T23:59:59Z`.
    - **Count** (optional): Maximum number of results to return (1–200, default 10).
    - **Start** (optional): Zero-based offset for pagination (default 0).

**Get Order**
:   Retrieve the full details for a single order by its order number. Returns the complete order record including line items, product details, payment instruments, shipment information, and customer data.
    - **Order No** (required): The order number (for example, `00000101`). Use order numbers returned by **Search Orders**.

**Search Customers**
:   Search customers by email address, name, or customer number. Returns a list of matching customer profiles with IDs, names, email addresses, and registration dates.
    - **Query** (required): Search phrase applied across email, first name, last name, and customer number. Examples: `"jane.doe@example.com"`, `"Jane Doe"`, `"C00012345"`.
    - **Count** (optional): Maximum number of results to return (1–200, default 10).
    - **Start** (optional): Zero-based offset for pagination (default 0).

## Connector networking configuration [salesforce-commerce-cloud-connector-networking-configuration]

Use the [Action configuration settings](/reference/configuration-reference/alerting-settings.md#action-settings) to customize connector networking configurations, such as proxies, certificates, or TLS settings. You can set configurations that apply to all your connectors or use `xpack.actions.customHostSettings` to set per-host configurations.

## Get API credentials [salesforce-commerce-cloud-api-credentials]

To use this connector you need an OCAPI client registered in Salesforce Commerce Cloud Business Manager.

### Register an OCAPI client

1. Log in to **Business Manager** for your Salesforce Commerce Cloud instance.
2. Navigate to **Administration > Site Development > Open Commerce API Settings**.
3. Select the **Data** API type and choose the appropriate scope (site or global).
4. Add a new client entry with a unique **Client ID**. Generate a strong **Client Secret** and store it securely.
5. Grant the client access to the required resource types. At minimum, enable:
   - `product_search` — for **Search Products**
   - `products` — for **Get Product**
   - `order_search` — for **Search Orders**
   - `orders` — for **Get Order**
   - `customer_search` — for **Search Customers**
6. Save the settings.
7. Note the **Client ID** and **Client Secret** for use when configuring the connector in {{kib}}.

For detailed instructions see the [Salesforce Commerce Cloud OCAPI documentation](https://developer.salesforce.com/docs/commerce/b2c-commerce/references/b2c-commerce-ocapi/overview).

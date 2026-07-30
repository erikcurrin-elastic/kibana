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

export const SearchProductsInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Full-text search query for the product catalog. Examples: "blue jeans", "SKU-12345", "summer dress".'
      ),
    count: z
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(10)
      .describe('Maximum number of results to return (1–200, default 10).'),
    start: z
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe('Zero-based offset of the first result to return. Use for pagination.'),
    expand: z
      .array(z.string().max(50))
      .optional()
      .describe(
        'Optional list of product expansion fields to include in the response. ' +
          'Common values: "availability", "images", "prices", "variations". ' +
          'Omit to receive default product fields.'
      ),
  })
);
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

export const GetProductInputSchema = lazySchema(() =>
  z.object({
    productId: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Product ID in Salesforce Commerce Cloud (case-sensitive). ' +
          'Use IDs returned by searchProducts. Examples: "M_S12345", "P00045678".'
      ),
    expand: z
      .array(z.string().max(50))
      .optional()
      .describe(
        'Optional list of expansion fields to include. ' +
          'Common values: "availability", "images", "prices", "variations", "options", "set_products". ' +
          'Omit to receive default product details.'
      ),
  })
);
export type GetProductInput = z.infer<typeof GetProductInputSchema>;

export const SearchOrdersInputSchema = lazySchema(() =>
  z.object({
    status: z
      .enum(['new', 'open', 'completed', 'cancelled', 'replaced', 'failed'])
      .optional()
      .describe(
        'Filter orders by lifecycle status. ' +
          'Values: "new" (recently placed), "open" (processing), "completed" (fulfilled), ' +
          '"cancelled", "replaced", "failed".'
      ),
    customerEmail: z
      .string()
      .max(200)
      .optional()
      .describe(
        'Filter orders by the customer email address (exact match). ' +
          'Example: "jane.doe@example.com".'
      ),
    createdFrom: z
      .string()
      .max(50)
      .optional()
      .describe(
        'Filter orders created on or after this date in ISO 8601 format. ' +
          'Example: "2024-01-01T00:00:00Z".'
      ),
    createdTo: z
      .string()
      .max(50)
      .optional()
      .describe(
        'Filter orders created on or before this date in ISO 8601 format. ' +
          'Example: "2024-12-31T23:59:59Z".'
      ),
    count: z
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(10)
      .describe('Maximum number of results to return (1–200, default 10).'),
    start: z
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe('Zero-based offset of the first result to return. Use for pagination.'),
  })
);
export type SearchOrdersInput = z.infer<typeof SearchOrdersInputSchema>;

export const GetOrderInputSchema = lazySchema(() =>
  z.object({
    orderNo: z
      .string()
      .min(1)
      .max(200)
      .describe(
        'Order number in Salesforce Commerce Cloud. Use order numbers returned by searchOrders. ' +
          'Examples: "00000101", "W12345678".'
      ),
  })
);
export type GetOrderInput = z.infer<typeof GetOrderInputSchema>;

export const SearchCustomersInputSchema = lazySchema(() =>
  z.object({
    query: z
      .string()
      .min(1)
      .max(2000)
      .describe(
        'Search phrase applied across customer email, first name, last name, and customer number. ' +
          'Examples: "jane.doe@example.com", "Jane Doe", "C00012345".'
      ),
    count: z
      .int()
      .min(1)
      .max(200)
      .optional()
      .default(10)
      .describe('Maximum number of results to return (1–200, default 10).'),
    start: z
      .int()
      .min(0)
      .optional()
      .default(0)
      .describe('Zero-based offset of the first result to return. Use for pagination.'),
  })
);
export type SearchCustomersInput = z.infer<typeof SearchCustomersInputSchema>;

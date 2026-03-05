/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Builds the common namespace prefix for a data source's tools and workflows.
 * Format: (name).source.(type) — e.g. "my-notion.source.notion"
 * Single implementation used by server (creation, API response) and public (list links).
 */
export function buildSourceNamespace(name: string, type: string): string {
  return `${slugify(name)}.source.${type}`;
}

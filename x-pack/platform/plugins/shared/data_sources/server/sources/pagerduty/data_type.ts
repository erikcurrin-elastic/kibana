/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const pagerdutyDataSource: DataSource = {
  id: 'pagerduty',
  name: 'PagerDuty',
  description: i18n.translate('xpack.dataSources.pagerduty.description', {
    defaultMessage:
      'Connect to PagerDuty to access incidents, escalation policies, schedules, and related data.',
  }),

  iconType: '.pagerduty-v2',

  stackConnector: {
    type: '.mcp',
    config: {
      serverUrl: 'https://api.pagerduty.com',
      hasAuth: true,
      authType: MCPAuthType.ApiKey,
      apiKeyHeaderName: 'Authorization',
    },
    importedTools: [
      'list_schedules',
      'list_escalation_policies',
      'list_incidents',
      'list_oncalls',
      'list_users',
      'list_teams',
      'get_schedule',
      'get_incident',
      'get_escalation_policy',
      'get_user',
      'get_team',
    ],
  },

  workflows: {
    directory: __dirname + '/workflows',
  },
};

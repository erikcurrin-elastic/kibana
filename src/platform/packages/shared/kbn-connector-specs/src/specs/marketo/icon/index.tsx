/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';
import marketoIcon from './marketo.svg';

/**
 * Marketo brand icon. Color: Marketo purple (#5C4EE5) with white "M" letterform.
 */
export default (props: ConnectorIconProps) => {
  return <EuiIcon type={marketoIcon} {...props} />;
};

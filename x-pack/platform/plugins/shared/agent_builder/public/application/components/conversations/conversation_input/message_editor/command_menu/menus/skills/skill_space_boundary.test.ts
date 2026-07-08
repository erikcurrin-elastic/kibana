/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { canSkillQueryContinueAfterSpace } from './skill_space_boundary';

const skills = [{ name: 'Data Export' }, { name: 'Summarize' }];

describe('canSkillQueryContinueAfterSpace', () => {
  it('allows a query with no space yet', () => {
    expect(canSkillQueryContinueAfterSpace('Data', skills)).toBe(true);
  });

  it('allows a space when it could be the start of a real multi-word name', () => {
    expect(canSkillQueryContinueAfterSpace('Data Exp', skills)).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(canSkillQueryContinueAfterSpace('data Exp', skills)).toBe(true);
  });

  it('disallows a space once the first word matches no skill name at all', () => {
    expect(canSkillQueryContinueAfterSpace('skill-no-match and more', skills)).toBe(false);
  });

  it('disallows a space when the first word only matches a single-word skill name', () => {
    // "Summarize" has no space to continue into, so trailing text after a
    // space can only be unrelated sentence content.
    expect(canSkillQueryContinueAfterSpace('Summarize this', skills)).toBe(false);
  });

  it('allows a lone leading space with no word before it', () => {
    expect(canSkillQueryContinueAfterSpace(' ', skills)).toBe(true);
  });
});

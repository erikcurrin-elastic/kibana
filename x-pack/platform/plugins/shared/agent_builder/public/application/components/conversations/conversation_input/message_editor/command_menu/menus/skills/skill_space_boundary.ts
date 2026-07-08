/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface SkillNameCandidate {
  readonly name: string;
}

/**
 * Whether a space in a Skill query could still be part of a real, possibly
 * multi-word skill name. Checks the word before the first space against
 * every skill's name — if none of them could continue past that word, the
 * user has moved on to plain sentence text and the mention should end.
 */
export const canSkillQueryContinueAfterSpace = (
  query: string,
  skills: readonly SkillNameCandidate[]
): boolean => {
  const spaceIndex = query.indexOf(' ');
  if (spaceIndex === -1) {
    return true;
  }

  const firstWord = query.slice(0, spaceIndex).toLowerCase();
  if (!firstWord) {
    return true;
  }

  return skills.some((skill) => skill.name.toLowerCase().startsWith(`${firstWord} `));
};

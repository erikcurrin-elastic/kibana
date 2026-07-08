/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { Skills } from './menus/skills';
import { Sml } from './menus/sml';
import { canSkillQueryContinueAfterSpace } from './menus/skills/skill_space_boundary';
import type { CommandDefinition } from './types';
import { CommandId } from './types';
import { useContextEngineEnabled } from '../../../../../hooks/use_context_engine_enabled';
import { useExperimentalFeatures } from '../../../../../hooks/use_experimental_features';
import { useAgentSkills } from '../../../../../hooks/skills/use_agent_skills';
import { useAgentId } from '../../../../../hooks/use_conversation';

const semanticKnowledgeCommandName = i18n.translate(
  'xpack.agentBuilder.conversationInput.commandMenu.semanticKnowledgeCommandName',
  { defaultMessage: 'Semantic knowledge' }
);

// When adding a new command, also add its data prefetch hook to use_command_menu_prefetch.ts
const COMMAND_DEFINITIONS: readonly CommandDefinition[] = [
  {
    id: CommandId.Skill,
    scheme: 'skill',
    sequence: '/',
    name: 'Skill',
    menuComponent: Skills,
    // Overridden per-render in useAvailableCommandDefinitions with a
    // predicate that checks live skill names; this default only applies
    // where sortedCommandDefinitions is used directly (e.g. getCommandDefinition).
    allowsSpaceInQuery: true,
  },
  {
    id: CommandId.Sml,
    scheme: 'sml',
    sequence: '@',
    name: semanticKnowledgeCommandName,
    menuComponent: Sml,
    experimental: true,
  },
];

// Sorted once at module load — longest sequence first for greedy matching
export const sortedCommandDefinitions = Array.from(COMMAND_DEFINITIONS).sort(
  (a, b) => b.sequence.length - a.sequence.length
);

export const getCommandDefinition = (commandId: string) => {
  const commandDefinition = sortedCommandDefinitions.find((c) => c.id === commandId);
  return commandDefinition;
};

export const getCommandDefinitionByScheme = (scheme: string) => {
  const commandDefinition = sortedCommandDefinitions.find((c) => c.scheme === scheme);
  return commandDefinition;
};

/**
 * Returns the list of command definitions available based on feature flags.
 * The `/` skill command is always available (GA).
 * The `@` SML command lives inside Agent Builder, so it requires both the
 * Agent Builder experimental flag and the dedicated Context Engine flag.
 */
export const useAvailableCommandDefinitions = (): readonly CommandDefinition[] => {
  const isContextEngineEnabled = useContextEngineEnabled();
  const isExperimentalEnabled = useExperimentalFeatures();
  const isSmlEnabled = isContextEngineEnabled && isExperimentalEnabled;
  const agentId = useAgentId();
  const { skills } = useAgentSkills({ agentId });

  return useMemo(() => {
    const definitions = sortedCommandDefinitions.map((definition) =>
      definition.id === CommandId.Skill
        ? {
            ...definition,
            // A skill name can contain spaces, so a space only keeps the
            // mention alive while it could still be the start of a real one.
            allowsSpaceInQuery: (query: string) => canSkillQueryContinueAfterSpace(query, skills),
          }
        : definition
    );
    if (isSmlEnabled) {
      return definitions;
    }
    return definitions.filter((c) => !c.experimental);
  }, [isSmlEnabled, skills]);
};

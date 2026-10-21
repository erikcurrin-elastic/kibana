/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { Sml } from './sml';
import { SML_SEARCH_DEFAULT_SIZE } from '../../../../../../../../services/sml/constants';
import { CommandId } from '../../types';
import type { CommandMenuHandle } from '../../types';

const defaultMockResults = [
  {
    id: 'entry-1',
    origin_id: 'att-1',
    type: 'visualization',
    title: 'Pacific Sales',
  },
  {
    id: 'entry-2',
    origin_id: 'att-2',
    type: 'visualization',
    title: 'Atlantic Metrics',
  },
];

let mockUseSmlAutocompleteReturn: {
  results: typeof defaultMockResults;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
} = {
  results: defaultMockResults,
  total: defaultMockResults.length,
  isLoading: false,
  isError: false,
  error: null,
};

const mockUseSmlAutocomplete = jest.fn(() => mockUseSmlAutocompleteReturn);

jest.mock('../../../../../../../hooks/sml/use_sml_autocomplete', () => ({
  useSmlAutocomplete: (...args: unknown[]) => mockUseSmlAutocomplete(...(args as [])),
}));

jest.mock('../../../../../../../hooks/use_conversation', () => ({
  useAgentId: () => 'test-agent-id',
}));

jest.mock('../../../../../../../hooks/agents/use_agent_by_id', () => ({
  useAgentBuilderAgentById: () => ({ agent: null, isLoading: false, error: null }),
}));

beforeEach(() => {
  mockUseSmlAutocompleteReturn = {
    results: defaultMockResults,
    total: defaultMockResults.length,
    isLoading: false,
    isError: false,
    error: null,
  };
  mockUseSmlAutocomplete.mockClear();
});

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<EuiProvider>{ui}</EuiProvider>);
};

describe('Sml', () => {
  it('renders SML autocomplete results as type/title', () => {
    const { container } = renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(container.textContent).toContain('visualization/Atlantic Metrics');
  });

  it('shows loading state when autocomplete is loading', () => {
    mockUseSmlAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: true,
      isError: false,
      error: null,
    };

    renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(screen.getByTestId('smlMenu-loading')).toBeInTheDocument();
  });

  it('calls onSelect with SML command id, entry id, and type/title label when a row is clicked', () => {
    const onSelect = jest.fn();
    renderWithProvider(<Sml query="" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Pacific Sales'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith({
      commandId: CommandId.Sml,
      id: 'entry-1',
      label: 'visualization/Pacific Sales',
      metadata: {},
    });
  });

  it('shows default empty list when autocomplete errors with no results', () => {
    mockUseSmlAutocompleteReturn = {
      results: [],
      total: 0,
      isLoading: false,
      isError: true,
      error: new Error('network'),
    };

    renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(screen.queryByTestId('smlMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smlMenuError')).not.toBeInTheDocument();
    expect(screen.getByText('No matching results')).toBeInTheDocument();
  });

  it('still lists cached results when useSmlAutocomplete reports error', () => {
    mockUseSmlAutocompleteReturn = {
      results: defaultMockResults,
      total: defaultMockResults.length,
      isLoading: false,
      isError: true,
      error: new Error('stale'),
    };

    const { container } = renderWithProvider(<Sml query="" onSelect={jest.fn()} />);

    expect(container.textContent).toContain('visualization/Pacific Sales');
    expect(screen.queryByTestId('smlMenu-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('smlMenuError')).not.toBeInTheDocument();
  });

  it('passes undefined constraints to useSmlAutocomplete when the agent has no connector constraints', () => {
    renderWithProvider(<Sml query="git" onSelect={jest.fn()} />);

    expect(mockUseSmlAutocomplete).toHaveBeenCalledWith('git', { constraints: undefined });
  });

  describe('reporting content presence via onContentChange', () => {
    it('reports content when there are results, for the current query', () => {
      const onContentChange = jest.fn();
      renderWithProvider(<Sml query="" onSelect={jest.fn()} onContentChange={onContentChange} />);

      expect(onContentChange).toHaveBeenCalledWith(true, '');
    });

    it('reports content while still loading, even with zero results so far', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: true,
        isError: false,
        error: null,
      };
      const onContentChange = jest.fn();
      renderWithProvider(
        <Sml query="nosuchthing" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(true, 'nosuchthing');
    });

    it('reports no content once results are confirmed empty, for the current query', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: false,
        isError: false,
        error: null,
      };
      const onContentChange = jest.fn();
      renderWithProvider(
        <Sml query="nosuchthing" onSelect={jest.fn()} onContentChange={onContentChange} />
      );

      expect(onContentChange).toHaveBeenCalledWith(false, 'nosuchthing');
    });
  });

  describe('select on space for "type/name" queries', () => {
    it('selects the match on Space once the exact name is typed', () => {
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="visualization/Pacific Sales" onSelect={onSelect} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(true);

      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'entry-1',
        label: 'visualization/Pacific Sales',
        metadata: {},
      });
    });

    it('does not claim Space for a partial name with no exact match yet, so it types through normally', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/Pac" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not claim Space when there are zero candidates at all — it types through and the mention just ends', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/nosuchthing" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not claim Space while the very first fetch is still loading', () => {
      mockUseSmlAutocompleteReturn = {
        results: [],
        total: 0,
        isLoading: true,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/nosuchthing" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not select on Space for a bare trailing slash with no name yet', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="visualization/" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('does not select on Space for a plain free-text query with no slash', () => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(<Sml ref={ref} query="Pacific Sales" onSelect={jest.fn()} />);

      expect(ref.current!.isKeyDownEventHandled({ key: ' ' } as React.KeyboardEvent)).toBe(false);
    });

    it('selects the exact name match, not whichever result the API ranked first', () => {
      mockUseSmlAutocompleteReturn = {
        results: [
          { id: 'connector-2', origin_id: 'att-2', type: 'connector', title: 'workday_2' },
          { id: 'connector-1', origin_id: 'att-1', type: 'connector', title: 'workday' },
        ],
        total: 2,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="connector/workday" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'connector-1',
        label: 'connector/workday',
        metadata: {},
      });
    });

    it('respects explicit arrow-key navigation away from the exact match', () => {
      mockUseSmlAutocompleteReturn = {
        results: [
          { id: 'connector-2', origin_id: 'att-2', type: 'connector', title: 'workday_2' },
          { id: 'connector-1', origin_id: 'att-1', type: 'connector', title: 'workday' },
        ],
        total: 2,
        isLoading: false,
        isError: false,
        error: null,
      };

      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="connector/workday" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'ArrowDown' } as React.KeyboardEvent);
      });
      act(() => {
        ref.current!.handleKeyDown({ key: ' ' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledWith({
        commandId: CommandId.Sml,
        id: 'connector-2',
        label: 'connector/workday_2',
        metadata: {},
      });
    });
  });

  describe('completing the typed text with Tab', () => {
    const results = (...titles: Array<[string, string]>) =>
      titles.map(([type, title]) => ({
        id: `${type}:${title}`,
        type,
        title,
        origin_id: title,
      }));

    const pressTab = (query: string, onSelect = jest.fn(), onReplaceText = jest.fn()) => {
      const ref = createRef<CommandMenuHandle>();
      renderWithProvider(
        <Sml ref={ref} query={query} onSelect={onSelect} onReplaceText={onReplaceText} />
      );
      act(() => {
        ref.current!.handleKeyDown({ key: 'Tab' } as React.KeyboardEvent);
      });
      return { onSelect, onReplaceText };
    };

    const setResults = (items: ReturnType<typeof results>) => {
      mockUseSmlAutocompleteReturn = {
        results: items,
        total: items.length,
        isLoading: false,
        isError: false,
        error: null,
      };
    };

    it('completes the type when all the matches share it', () => {
      setResults(
        results(
          ['dashboard', 'dashboard_A'],
          ['dashboard', 'dashboard_B'],
          ['dashboard', 'super_A'],
          ['connector', 'my_dashing_connector']
        )
      );

      const { onSelect, onReplaceText } = pressTab('dash');

      expect(onReplaceText).toHaveBeenCalledWith('dashboard/');
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('completes the title as far as the matches agree', () => {
      setResults(results(['dashboard', 'dashboard_A'], ['dashboard', 'dashboard_B']));

      expect(pressTab('dashboard/da').onReplaceText).toHaveBeenCalledWith('dashboard/dashboard_');
    });

    it('completes only up to where the matches differ in the type', () => {
      setResults(
        results(['alerting_v2_rule', 'High CPU'], ['alerting_v2_action_policy', 'Critical'])
      );

      expect(pressTab('a').onReplaceText).toHaveBeenCalledWith('alerting_v2_');
    });

    it('ignores case when matching, and completes with the case of the results', () => {
      setResults(results(['dashboard', 'Sales overview'], ['dashboard', 'Sales pipeline']));

      expect(pressTab('DASHBOARD/sal').onReplaceText).toHaveBeenCalledWith('dashboard/Sales ');
    });

    it('ignores results that match somewhere inside the title', () => {
      setResults(
        results(
          ['workflow', 'Dashboard snapshot'],
          ['dashboard', 'Sales overview'],
          ['dashboard', 'Security posture']
        )
      );

      expect(pressTab('dash').onReplaceText).toHaveBeenCalledWith('dashboard/S');
    });

    it('selects the highlighted result when there is nothing more to complete', () => {
      setResults(results(['dashboard', 'dashboard_A'], ['dashboard', 'dashboard_B']));

      const { onSelect, onReplaceText } = pressTab('dashboard/dashboard_');

      expect(onReplaceText).not.toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'dashboard:dashboard_A', label: 'dashboard/dashboard_A' })
      );
    });

    it('picks the only result straight away, rather than completing its title', () => {
      setResults(results(['dashboard', 'Sales overview']));

      const { onSelect, onReplaceText } = pressTab('dashboard/sa');

      expect(onReplaceText).not.toHaveBeenCalled();
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'dashboard:Sales overview',
          label: 'dashboard/Sales overview',
        })
      );
    });

    it('only completes the type when a full page may hide other matches', () => {
      setResults(
        results(
          ...Array.from({ length: SML_SEARCH_DEFAULT_SIZE }, (_, index): [string, string] => [
            'dashboard',
            `security_${index}`,
          ])
        )
      );

      expect(pressTab('dash').onReplaceText).toHaveBeenCalledWith('dashboard/');
      const { onSelect, onReplaceText } = pressTab('dashboard/s');
      expect(onReplaceText).not.toHaveBeenCalledWith('dashboard/security_');
      expect(onSelect).toHaveBeenCalled();
    });

    it('selects the highlighted result when the menu cannot complete the text', () => {
      setResults(results(['dashboard', 'dashboard_A'], ['dashboard', 'dashboard_B']));
      const ref = createRef<CommandMenuHandle>();
      const onSelect = jest.fn();
      renderWithProvider(<Sml ref={ref} query="dash" onSelect={onSelect} />);

      act(() => {
        ref.current!.handleKeyDown({ key: 'Tab' } as React.KeyboardEvent);
      });

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('order of the results', () => {
    const rowsInOrder = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.euiSelectableListItem')).map(
        (row) => row.textContent
      );

    const setResults = (items: Array<{ type: string; title: string }>) => {
      mockUseSmlAutocompleteReturn = {
        results: items.map(({ type, title }) => ({
          id: `${type}:${title}`,
          type,
          title,
          origin_id: title,
        })),
        total: items.length,
        isLoading: false,
        isError: false,
        error: null,
      };
    };

    it('lists them alphabetically by type and title, ignoring case and reading numbers as numbers', () => {
      setResults([
        { type: 'workflow', title: 'Notify on-call' },
        { type: 'dashboard', title: 'super_B' },
        { type: 'dashboard', title: 'dashboard_B' },
        { type: 'dashboard', title: 'Pods 10' },
        { type: 'connector', title: 'zoom' },
        { type: 'dashboard', title: 'dashboard_A' },
        { type: 'dashboard', title: 'Pods 2' },
      ]);

      const { container } = renderWithProvider(<Sml query="/" onSelect={jest.fn()} />);

      expect(rowsInOrder(container)).toEqual([
        'connector/zoom',
        'dashboard/dashboard_A',
        'dashboard/dashboard_B',
        'dashboard/Pods 2',
        'dashboard/Pods 10',
        'dashboard/super_B',
        'workflow/Notify on-call',
      ]);
    });

    it('still puts the exact name match first when a full name is typed after the slash', () => {
      setResults([
        { type: 'connector', title: 'workday_2' },
        { type: 'connector', title: 'workday' },
        { type: 'connector', title: 'a_workday' },
      ]);

      const { container } = renderWithProvider(
        <Sml query="connector/workday" onSelect={jest.fn()} />
      );

      expect(rowsInOrder(container)).toEqual([
        'connector/workday',
        'connector/a_workday',
        'connector/workday_2',
      ]);
    });
  });
});

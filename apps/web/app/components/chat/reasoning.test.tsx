// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Reasoning, ReasoningContent, ReasoningTrigger, useReasoning } from './reasoning';

afterEach(cleanup);

describe('Reasoning', () => {
  it('shows a shimmering "Thinking" label while streaming', () => {
    render(
      <Reasoning isStreaming>
        <ReasoningTrigger />
        <ReasoningContent>Some reasoning text.</ReasoningContent>
      </Reasoning>,
    );

    expect(screen.getByText('Thinking...')).toBeTruthy();
  });

  it('shows a generic finished label once streaming stops with no duration yet', () => {
    render(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Some reasoning text.</ReasoningContent>
      </Reasoning>,
    );

    expect(screen.getByText('Thought for a few seconds')).toBeTruthy();
  });

  it('shows the elapsed duration once it has been computed', () => {
    render(
      <Reasoning duration={4} isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Some reasoning text.</ReasoningContent>
      </Reasoning>,
    );

    expect(screen.getByText('Thought for 4 seconds')).toBeTruthy();
  });

  it('toggles open/closed when the trigger is clicked', () => {
    render(
      <Reasoning defaultOpen={false} duration={2} isStreaming={false}>
        <ReasoningTrigger />
        <ReasoningContent>Some reasoning text.</ReasoningContent>
      </Reasoning>,
    );

    const trigger = screen.getByRole('button');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('supports a custom thinking-message renderer', () => {
    render(
      <Reasoning isStreaming={false}>
        <ReasoningTrigger getThinkingMessage={() => 'Custom label'} />
        <ReasoningContent>Some reasoning text.</ReasoningContent>
      </Reasoning>,
    );

    expect(screen.getByText('Custom label')).toBeTruthy();
  });
});

describe('useReasoning', () => {
  it('throws when used outside a Reasoning provider', () => {
    function Standalone() {
      useReasoning();
      return null;
    }

    expect(() => render(<Standalone />)).toThrow(
      'Reasoning components must be used within Reasoning',
    );
  });
});

// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatResponseSettings } from './chat-response-settings';

describe('ChatResponseSettings', () => {
  it('changes length and closes without owning the draft', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(
      <ChatResponseSettings
        onChange={onChange}
        onChangeWalkieTalkieMode={vi.fn()}
        onClose={onClose}
        value="medium"
        walkieTalkieMode={false}
      />,
    );

    expect(
      screen.getByText('Balanced detail for everyday questions.').getAttribute('aria-hidden'),
    ).toBe('false');
    expect(
      screen.getByText('Fast answers with no extra garnish.').getAttribute('aria-hidden'),
    ).toBe('true');

    fireEvent.click(screen.getByRole('radio', { name: /Lore/ }));
    expect(
      screen.getByText('Thorough answers with structure and context.').getAttribute('aria-hidden'),
    ).toBe('false');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Close response settings' }));

    expect(onChange).toHaveBeenCalledWith('long');
    expect(onClose).toHaveBeenCalledOnce();
  });
});

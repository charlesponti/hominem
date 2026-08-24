// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChatResponseSettings } from './chat-response-settings';

describe('ChatResponseSettings', () => {
  it('changes length and closes without owning the draft', () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<ChatResponseSettings onChange={onChange} onClose={onClose} value="medium" />);

    fireEvent.change(screen.getByLabelText('Response length'), { target: { value: 'long' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close response settings' }));

    expect(onChange).toHaveBeenCalledWith('long');
    expect(onClose).toHaveBeenCalledOnce();
  });
});

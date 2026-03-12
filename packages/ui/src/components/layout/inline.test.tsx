import { render, screen } from '../../test-utils';
import { Inline } from './inline';

describe('Inline', () => {
  it('renders with the configured gap and alignment classes', () => {
    render(
      <Inline align="baseline" gap="lg" justify="between" data-testid="inline">
        <div>One</div>
        <div>Two</div>
      </Inline>,
    );

    const inline = screen.getByTestId('inline');

    expect(inline.className).toContain('gap-6');
    expect(inline.className).toContain('items-baseline');
    expect(inline.className).toContain('justify-between');
  });

  it('supports wrapping children', () => {
    render(
      <Inline wrap data-testid="inline">
        <div>One</div>
        <div>Two</div>
      </Inline>,
    );

    expect(screen.getByTestId('inline').className).toContain('flex-wrap');
  });
});

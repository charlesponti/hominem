import { render, screen } from '../../test-utils';
import { Stack } from './stack';

describe('Stack', () => {
  it('renders with the tokenized vertical gap', () => {
    render(
      <Stack gap="lg" data-testid="stack">
        <div>One</div>
        <div>Two</div>
      </Stack>,
    );

    expect(screen.getByTestId('stack').className).toContain('gap-6');
  });

  it('renders dividers between children when provided', () => {
    render(
      <Stack divider={<hr data-testid="divider" />}>
        <div>One</div>
        <div>Two</div>
        <div>Three</div>
      </Stack>,
    );

    expect(screen.getAllByTestId('divider')).toHaveLength(2);
  });
});

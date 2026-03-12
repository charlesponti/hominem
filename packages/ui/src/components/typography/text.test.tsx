import { render, screen } from '../../test-utils';
import { Text } from './text';

describe('Text', () => {
  it('renders the requested text variant', () => {
    render(
      <Text variant="body-1" data-testid="text">
        Hello
      </Text>,
    );

    expect(screen.getByTestId('text').className).toContain('body-1');
  });

  it('renders muted text styling', () => {
    render(
      <Text muted data-testid="text">
        Hello
      </Text>,
    );

    expect(screen.getByTestId('text').className).toContain('text-text-tertiary');
  });
});

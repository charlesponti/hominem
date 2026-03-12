import { render, screen } from '../../test-utils';
import { Heading } from './heading';

describe('Heading', () => {
  it('renders the requested semantic level', () => {
    render(<Heading level={1}>Title</Heading>);

    expect(screen.getByRole('heading', { level: 1, name: 'Title' })).toBeInTheDocument();
  });

  it('renders the requested heading variant', () => {
    render(
      <Heading variant="display-1" data-testid="heading">
        Title
      </Heading>,
    );

    expect(screen.getByTestId('heading').className).toContain('display-1');
  });
});

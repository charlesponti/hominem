import { render, screen } from '../../test-utils';
import { Badge } from './badge';

describe('Badge', () => {
  it('renders the shared compact surface radius', () => {
    render(<Badge>Label</Badge>);

    const badge = screen.getByText('Label');

    expect(badge.className).toContain('rounded-md');
  });
});

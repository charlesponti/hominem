import { render, screen } from '../../test-utils';
import { Card } from './card';

describe('Card', () => {
  it('renders the canonical card surface styles', () => {
    render(
      <Card data-testid="card">
        <div>Body</div>
      </Card>,
    );

    const card = screen.getByTestId('card');

    expect(card.className).toContain('border');
    expect(card.className).toContain('rounded-md');
    expect(card.className).toContain('py-6');
  });
});

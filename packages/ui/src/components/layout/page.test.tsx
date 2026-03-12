import { render, screen } from '../../test-utils';
import { Page } from './page';

describe('Page', () => {
  it('applies the shared max-width and padding contract', () => {
    render(
      <Page maxWidth="sm" data-testid="page">
        <div>Content</div>
      </Page>,
    );

    const page = screen.getByTestId('page');

    expect(page.className).toContain('max-w-2xl');
    expect(page.className).toContain('px-4');
  });
});

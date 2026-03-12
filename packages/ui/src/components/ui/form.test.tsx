import { render, screen } from '../../test-utils';
import { Form } from './form';

describe('Form', () => {
  it('renders a semantic form element with the shared spacing contract', () => {
    render(
      <Form aria-label="Profile form">
        <div>Field</div>
      </Form>,
    );

    const form = screen.getByRole('form', { name: 'Profile form' });

    expect(form.tagName).toBe('FORM');
    expect(form.className).toContain('grid');
    expect(form.className).toContain('gap-4');
  });
});

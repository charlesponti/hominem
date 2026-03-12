import { render, screen } from '../../test-utils';
import { TextArea } from './text-area';

describe('TextArea', () => {
  it('wires the label to the textarea and renders helper text', () => {
    render(<TextArea label="Notes" helpText="Markdown supported" />);

    expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Markdown supported')).toBeInTheDocument();
  });

  it('marks the textarea invalid when an error is provided', () => {
    render(<TextArea label="Notes" error="Required" />);

    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

import { render, screen } from '../../test-utils';
import { TextField } from './text-field';

describe('TextField', () => {
  it('wires the label to the input and surfaces help text', () => {
    render(<TextField label="Email" helpText="Use your work email" />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Use your work email')).toBeInTheDocument();
  });

  it('marks the input invalid when an error is provided', () => {
    render(<TextField label="Email" error="Email is required" />);

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });
});

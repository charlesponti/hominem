import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import { render, screen } from '../../test-utils';
import { FilterSelect } from './filter-select';

describe('FilterSelect', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  test('renders with label and options', () => {
    const onChange = vi.fn();
    render(<FilterSelect label="Test Filter" value="" options={options} onChange={onChange} />);

    expect(screen.getByText('Test Filter')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });

  test('displays selected value', () => {
    const onChange = vi.fn();
    render(
      <FilterSelect label="Test Filter" value="option1" options={options} onChange={onChange} />,
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
  });

  test('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterSelect label="Test Filter" value="" options={options} onChange={onChange} />);

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const option2 = await screen.findByText('Option 2');
    await user.click(option2);

    expect(onChange).toHaveBeenCalledWith('option2');
  });

  test('displays custom placeholder', () => {
    const onChange = vi.fn();
    render(
      <FilterSelect
        label="Test Filter"
        value=""
        options={options}
        onChange={onChange}
        placeholder="Select an option"
      />,
    );

    expect(screen.getByText('Select an option')).toBeInTheDocument();
  });

  test('handles "All" option (empty string value)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FilterSelect label="Test Filter" value="option1" options={options} onChange={onChange} />,
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);

    const allOption = await screen.findByText('All');
    await user.click(allOption);

    expect(onChange).toHaveBeenCalledWith('');
  });

  test('has proper label association', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterSelect
        label="Test Filter"
        value=""
        options={options}
        onChange={onChange}
        id="test-select"
      />,
    );

    const label = screen.getByText('Test Filter');
    const select = container.querySelector('#test-select');

    expect(label).toHaveAttribute('for', 'test-select');
    expect(select).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const onChange = vi.fn();
    const { container } = render(
      <FilterSelect
        label="Test Filter"
        value=""
        options={options}
        onChange={onChange}
        className="custom-class"
      />,
    );

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });
});

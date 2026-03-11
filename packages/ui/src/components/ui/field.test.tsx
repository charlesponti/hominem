import { render, screen } from '../../test-utils'
import { Input } from './input'
import { Field } from './field'

describe('Field', () => {
  it('wires the label and helper text to the child control', () => {
    render(
      <Field label="Email" helpText="Use your work address">
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText('Email')

    expect(input).toHaveAttribute('aria-describedby')
    expect(screen.getByText('Use your work address')).toBeInTheDocument()
  })

  it('surfaces errors as alerts and marks the control invalid', () => {
    render(
      <Field label="Email" error="Required">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('Required')
  })
})

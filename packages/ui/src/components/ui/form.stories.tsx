import type { Meta, StoryObj } from '@storybook/react'

import { Button } from './button'
import { Form } from './form'
import { TextField } from './text-field'

const meta: Meta<typeof Form> = {
  title: 'UI/Form',
  component: Form,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Form>

export const Default: Story = {
  render: () => (
    <Form className="w-full max-w-md">
      <TextField label="Email" type="email" placeholder="you@example.com" />
      <TextField label="Password" type="password" />
      <Button type="submit" variant="primary">
        Continue
      </Button>
    </Form>
  ),
}

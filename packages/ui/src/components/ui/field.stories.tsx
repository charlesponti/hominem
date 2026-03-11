import type { Meta, StoryObj } from '@storybook/react'

import { Input } from './input'
import { Field } from './field'
import { Textarea } from './textarea'

const meta: Meta<typeof Field> = {
  title: 'UI/Field',
  component: Field,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Field>

export const Default: Story = {
  render: () => (
    <Field label="Email" helpText="We will never share your address.">
      <Input placeholder="you@example.com" />
    </Field>
  ),
}

export const Error: Story = {
  render: () => (
    <Field label="Email" error="Email is required">
      <Input placeholder="you@example.com" />
    </Field>
  ),
}

export const TextareaField: Story = {
  render: () => (
    <Field label="Notes" helpText="Markdown supported">
      <Textarea rows={5} placeholder="Write something..." />
    </Field>
  ),
}

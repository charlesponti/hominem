import type { Meta, StoryObj } from '@storybook/react'

import { Stack } from '../layout/stack'
import { Heading } from './heading'

const meta: Meta<typeof Heading> = {
  title: 'Typography/Heading',
  component: Heading,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Heading>

export const Scale: Story = {
  render: () => (
    <Stack gap="lg">
      <Heading variant="display-1">Display One</Heading>
      <Heading variant="display-2">Display Two</Heading>
      <Heading level={1}>Heading One</Heading>
      <Heading level={2}>Heading Two</Heading>
      <Heading level={3}>Heading Three</Heading>
      <Heading level={4}>Heading Four</Heading>
    </Stack>
  ),
}

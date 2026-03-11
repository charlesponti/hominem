import type { Meta, StoryObj } from '@storybook/react'

import { Page } from './page'
import { Heading } from '../typography/heading'
import { Text } from '../typography/text'

const meta: Meta<typeof Page> = {
  title: 'Layout/Page',
  component: Page,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Page>

export const Default: Story = {
  render: () => (
    <Page maxWidth="sm" className="py-8">
      <Heading level={1}>Account Settings</Heading>
      <Text muted>Manage your profile, security, and session preferences.</Text>
    </Page>
  ),
}

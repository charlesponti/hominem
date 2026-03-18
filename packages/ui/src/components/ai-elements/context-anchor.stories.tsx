import type { Meta, StoryObj } from '@storybook/react'
import { ContextAnchor } from './context-anchor'

const meta: Meta<typeof ContextAnchor> = {
  title: 'AI Elements/ContextAnchor',
  component: ContextAnchor,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ContextAnchor>

export const NewSession: Story = {
  args: { source: { kind: 'new' } },
}

export const FromThought: Story = {
  args: {
    source: {
      kind: 'thought',
      preview: 'Ideas for the new onboarding flow and user retention strategies',
    },
  },
}

export const FromNote: Story = {
  args: {
    source: { kind: 'artifact', id: 'note-1', type: 'note', title: 'Q3 Planning Meeting Notes' },
  },
}

export const FromTask: Story = {
  args: {
    source: { kind: 'artifact', id: 'task-1', type: 'task', title: 'Follow up with design team' },
  },
}

export const LongTitle: Story = {
  args: {
    source: {
      kind: 'artifact',
      id: 'note-2',
      type: 'note',
      title: 'An extremely long note title that will need to be truncated in the anchor display',
    },
  },
}

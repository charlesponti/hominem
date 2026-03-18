import type { Meta, StoryObj } from '@storybook/react'
import { ClassificationReview } from './classification-review'

const meta: Meta<typeof ClassificationReview> = {
  title: 'AI Elements/ClassificationReview',
  component: ClassificationReview,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof ClassificationReview>

const base = {
  proposedTitle: 'Q3 Planning Meeting Notes',
  proposedChanges: [
    'Summarised 12 discussion points',
    'Captured 3 follow-up actions',
    'Noted key decisions on roadmap priorities',
  ],
  previewContent: `# Q3 Planning

Key decisions made today:
- Prioritise mobile performance improvements
- Defer analytics dashboard to Q4
- Ship auth redesign before end of month`,
  onAccept: () => {},
  onReject: () => {},
}

export const AsNote: Story = {
  args: { ...base, proposedType: 'note' },
}

export const AsTask: Story = {
  args: { ...base, proposedType: 'task', proposedTitle: 'Follow up with design team' },
}

export const NoChanges: Story = {
  args: { ...base, proposedChanges: [] },
}

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from '../ui/button';
import { Plan, PlanContent, PlanFooter, PlanHeader, PlanStep } from './plan';

const meta: Meta<typeof Plan> = {
  title: 'Patterns/AI/Plan',
  component: Plan,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Plan>;

export const Default: Story = {
  render: () => (
    <Plan className="max-w-sm">
      <PlanHeader title="Research Plan" />
      <PlanContent>
        <PlanStep
          index={0}
          status="completed"
          title="Gather requirements"
          description="Understand what the user needs."
        />
        <PlanStep
          index={1}
          status="in-progress"
          title="Search documentation"
          description="Look for relevant technical documentation."
        />
        <PlanStep
          index={2}
          status="pending"
          title="Synthesize findings"
          description="Combine information into a summary."
        />
        <PlanStep
          index={3}
          status="pending"
          title="Present results"
          description="Format and deliver the final output."
        />
      </PlanContent>
      <PlanFooter>
        <Button size="sm" variant="ghost">
          Cancel
        </Button>
        <Button size="sm">Continue</Button>
      </PlanFooter>
    </Plan>
  ),
};

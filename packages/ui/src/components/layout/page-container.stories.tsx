import type { Meta, StoryObj } from '@storybook/react';
import { PageContainer } from './page-container';

const meta: Meta<typeof PageContainer> = {
  title: 'Layout/PageContainer',
  component: PageContainer,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof PageContainer>;

export const Standard: Story = {
  render: () => (
    <PageContainer width="standard">
      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-sm">Standard width container (max-w-5xl)</p>
      </div>
    </PageContainer>
  ),
};

export const Narrow: Story = {
  render: () => (
    <PageContainer width="narrow">
      <div className="p-4 border rounded-lg bg-muted">
        <p className="text-sm">Narrow width container (max-w-2xl) — for forms and detail views</p>
      </div>
    </PageContainer>
  ),
};

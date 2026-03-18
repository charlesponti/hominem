import type { Meta, StoryObj } from '@storybook/react';

import { PageTitle } from './page-title';
import { Button } from './ui/button';

const meta: Meta<typeof PageTitle> = {
  title: 'Layout/PageTitle',
  component: PageTitle,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['serif', 'sans', 'large'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof PageTitle>;

export const Default: Story = {
  args: { title: 'Page Title' },
};

export const WithSubtitle: Story = {
  args: {
    title: 'My Notes',
    subtitle: '24 notes',
  },
};

export const WithActions: Story = {
  args: {
    title: 'My Notes',
    subtitle: '24 notes',
    actions: <Button size="sm">New Note</Button>,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-col gap-8">
      <div>
        <p className="body-4 text-text-tertiary mb-2">serif (default)</p>
        <PageTitle title="Serif Heading" subtitle="Subtitle text" />
      </div>
      <div>
        <p className="body-4 text-text-tertiary mb-2">sans</p>
        <PageTitle title="Sans Heading" subtitle="Subtitle text" variant="sans" />
      </div>
      <div>
        <p className="body-4 text-text-tertiary mb-2">large</p>
        <PageTitle title="Large Heading" subtitle="Subtitle text" variant="large" />
      </div>
    </div>
  ),
};

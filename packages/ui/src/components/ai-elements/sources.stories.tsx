import type { Meta, StoryObj } from '@storybook/react';
import { Source, Sources } from './sources';

const meta: Meta<typeof Sources> = {
  title: 'AI Elements/Sources',
  component: Sources,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Sources>;

const sampleSources = [
  { href: 'https://example.com/article-1', title: 'Introduction to React Hooks' },
  { href: 'https://example.com/article-2', title: 'Advanced State Management Patterns' },
  { href: 'https://example.com/article-3', title: 'Performance Optimization in React' },
];

export const Default: Story = {
  render: () => (
    <Sources sources={sampleSources} className="max-w-sm" />
  ),
};

export const SingleSource: Story = {
  render: () => (
    <Sources sources={sampleSources.slice(0, 1)} className="max-w-sm" />
  ),
};

export const SourceItem: Story = {
  render: () => (
    <div className="space-y-2 max-w-sm">
      <Source href="https://example.com" title="React Documentation" />
      <Source href="https://example.com" title="MDN Web Docs" />
    </div>
  ),
};

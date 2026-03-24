import type { Meta, StoryObj } from '@storybook/react';

import { Suggestion, Suggestions } from './suggestion';

const meta: Meta<typeof Suggestions> = {
  title: 'AI Elements/Suggestion',
  component: Suggestions,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Suggestions>;

export const Default: Story = {
  render: () => (
    <Suggestions>
      <Suggestion suggestion="How does this work?" onSuggestionClick={() => {}} />
      <Suggestion suggestion="Show me an example" onSuggestionClick={() => {}} />
      <Suggestion suggestion="What are the alternatives?" onSuggestionClick={() => {}} />
    </Suggestions>
  ),
};

export const SingleSuggestion: Story = {
  render: () => <Suggestion suggestion="Tell me more" onSuggestionClick={() => {}} />,
};

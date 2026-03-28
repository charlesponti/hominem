import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { PaginationControls } from './pagination-controls';

const meta: Meta<typeof PaginationControls> = {
  title: 'Patterns/Finance/PaginationControls',
  component: PaginationControls,
  tags: ['autodocs'],
  args: {
    currentPage: 0,
    totalPages: 5,
  },
  render: (args) => {
    const [currentPage, setCurrentPage] = useState(args.currentPage);

    return (
      <div className="w-full max-w-xl">
        <PaginationControls {...args} currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>
    );
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LastPage: Story = {
  args: {
    currentPage: 4,
  },
};

export const HiddenWhenEmpty: Story = {
  args: {
    totalPages: 0,
  },
};

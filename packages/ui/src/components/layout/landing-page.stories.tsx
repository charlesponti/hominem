import type { Meta, StoryObj } from '@storybook/react-vite';
import { BookOpen, Brain, Search, Zap } from 'lucide-react';
import { MemoryRouter } from 'react-router';

import { LandingPage } from './landing-page';

const meta: Meta<typeof LandingPage> = {
  title: 'Patterns/Marketing/LandingPage',
  component: LandingPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof LandingPage>;

export const Default: Story = {
  args: {
    kicker: 'Personal Knowledge',
    headline: (
      <>
        Think better,
        <br />
        <em>remember everything</em>
      </>
    ),
    sub: 'Capture notes, surface insights, and build a second brain with AI-powered assistance.',
    ctaPrimary: { label: 'Get Started', href: '/signup' },
    ctaSecondary: { label: 'Learn more', href: '#features' },
    problem:
      'You read, you learn, you forget. Important insights get buried in notebooks, apps, and bookmarks you never revisit.',
    features: [
      {
        icon: Brain,
        title: 'AI Synthesis',
        description: 'Connect ideas across notes and surface patterns you might have missed.',
      },
      {
        icon: Search,
        title: 'Smart Search',
        description: 'Find anything instantly using natural language queries.',
      },
      {
        icon: BookOpen,
        title: 'Rich Capture',
        description: 'Save text, voice, images, and links in one unified inbox.',
      },
      {
        icon: Zap,
        title: 'Fast Review',
        description: 'Spaced repetition surfaces what matters, when it matters.',
      },
    ],
    steps: [
      { label: 'Capture', description: 'Save ideas the moment they happen, in any format.' },
      { label: 'Connect', description: 'AI links related concepts across all your notes.' },
      { label: 'Recall', description: 'Surface the right information at the right time.' },
    ],
    trustSignal: 'Free to use. No credit card required.',
  },
};

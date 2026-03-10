import { LandingPage } from '@hominem/ui/components/layout/landing-page';
import { FileText, MessageSquare, Mic, Tag } from 'lucide-react';
import { data, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';

import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerSession(request);
  if (user) return redirect('/notes', { headers });
  return data({}, { headers });
}

export function meta() {
  return [
    { title: 'Animus — Notes + AI' },
    {
      name: 'description',
      content: 'Think in notes. Move in action. Animus turns your ideas into organized knowledge with AI that helps you make sense of it all.',
    },
  ];
}

export default function HomePage() {
  return (
    <LandingPage
      kicker="Notes + AI"
      headline={
        <>
          Think in notes.{'\n'}
          Move in action.
        </>
      }
      sub="Animus turns scattered thoughts into organized knowledge — with AI that helps you find connections you'd have missed."
      ctaPrimary={{ label: 'Open Animus', href: '/auth/email' }}
      ctaSecondary={{ label: 'Sign in', href: '/auth/email' }}
      problem="You have the idea in the shower. You voice-note it on the walk. You write half of it down somewhere. Three weeks later you can't find it — or worse, you have the same idea again and don't know you already had it."
      features={[
        {
          icon: FileText,
          title: 'Notes',
          description: "Write anything. Markdown, tasks, rough thoughts. No templates, no structure forced on you before you're ready.",
        },
        {
          icon: MessageSquare,
          title: 'AI chat',
          description: "Ask questions about your notes and get answers — not search results. The AI reads what you've written.",
        },
        {
          icon: Mic,
          title: 'Voice capture',
          description: "Record a thought on the go. Animus transcribes it and surfaces the key ideas when you're back at your desk.",
        },
        {
          icon: Tag,
          title: 'Auto-tagging',
          description: 'Notes are tagged and linked automatically as you write. Your knowledge graph builds itself.',
        },
      ]}
      steps={[
        {
          label: 'Write without friction',
          description: 'Open a note and start. Markdown renders as you type. No setup, no choosing a template.',
        },
        {
          label: 'Let AI make connections',
          description: 'Animus surfaces related notes and extracts key ideas. Your past thinking becomes a resource instead of a graveyard.',
        },
        {
          label: 'Ask your notes questions',
          description: 'Chat with your knowledge base. "What did I write about X last month?" gets you a direct answer.',
        },
      ]}
      trustSignal="Free to start. No credit card."
    />
  );
}

import { NOTES_AUTH_CONFIG } from '@hominem/auth';
import { resolveSafeAuthRedirect } from '@hominem/auth/server';
import { LandingPage } from '@hominem/ui/components/layout/landing-page';
import { FileText, MessageSquare, Mic, Tag } from 'lucide-react';
import { data, redirect } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';
import { useSearchParams } from 'react-router';

import { FocusView } from '~/components/focus-view';
import { getServerSession } from '~/lib/auth.server';
import { WEB_BRAND } from '~/lib/brand';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerSession(request);
  if (user) {
    const requestUrl = new URL(request.url);
    const rawNext = requestUrl.searchParams.get('next');
    // Only redirect when an explicit `next` destination is present — otherwise
    // render the authenticated home surface here at `/`.
    if (rawNext) {
      const next = resolveSafeAuthRedirect(rawNext, '/', [
        ...NOTES_AUTH_CONFIG.allowedDestinations,
      ]);
      return redirect(next, { headers });
    }
    return data({ authenticated: true }, { headers });
  }
  return data({ authenticated: false }, { headers });
}

export function meta() {
  return [
    { title: WEB_BRAND.marketing.title },
    {
      name: 'description',
      content: WEB_BRAND.meta.description,
    },
  ]
}

export default function HomePage({ loaderData }: { loaderData: { authenticated: boolean } }) {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const authHref = next ? `/auth?next=${encodeURIComponent(next)}` : '/auth';

  if (loaderData.authenticated) {
    return <FocusView />;
  }

  return (
    <LandingPage
      kicker={WEB_BRAND.marketing.kicker}
      headline={
        <>
          Think in notes.{'\n'}
          Move in action.
        </>
      }
      sub={`${WEB_BRAND.appName} turns scattered thoughts into durable context so you can capture quickly, return later, and think in chat with what you already know.`}
      ctaPrimary={{ label: WEB_BRAND.marketing.ctaLabel, href: authHref }}
      ctaSecondary={{ label: 'Sign in', href: authHref }}
      problem="You have the idea in the shower. You voice-note it on the walk. You write half of it down somewhere. Three weeks later you can't find it — or worse, you have the same idea again and don't know you already had it."
      features={[
        {
          icon: FileText,
          title: 'Notes',
          description:
            "Write anything. Markdown, tasks, rough thoughts. No templates, no structure forced on you before you're ready.",
        },
        {
          icon: MessageSquare,
          title: 'Chat',
          description:
            "Ask questions about your notes and keep thinking with the context you've already built.",
        },
        {
          icon: Mic,
          title: 'Voice capture',
          description:
            `Record a thought on the go. ${WEB_BRAND.appName} transcribes it and surfaces the key ideas when you're back at your desk.`,
        },
        {
          icon: Tag,
          title: 'Connected context',
          description:
            'Notes stay connected through tags, references, and related context so past thinking remains useful.',
        },
      ]}
      steps={[
        {
          label: 'Write without friction',
          description:
            'Open a note and start. Markdown renders as you type. No setup, no choosing a template.',
        },
        {
          label: 'Let context accumulate',
          description:
            'Your notes and chats build on each other over time, so past thinking becomes working context instead of forgotten storage.',
        },
        {
          label: 'Ask your notes questions',
          description:
            'Use chat to ask what you already know. "What did I write about X last month?" gets you a direct answer.',
        },
      ]}
      trustSignal="Free to start. No credit card."
    />
  );
}

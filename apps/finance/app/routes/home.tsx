import { buttonVariants } from '@ponti-studios/ui/primitives';
import { ChartLine, Gauge, Landmark, ShieldCheck, UploadCloud } from 'lucide-react';
import { Link, redirect } from 'react-router';

import { getServerSession } from '~/lib/auth.server';

import type { Route } from './+types/home';

const FEATURES = [
  {
    icon: Landmark,
    title: 'Account sync',
    description:
      'Connect your bank and card accounts. Transactions appear automatically, categorized and ready to review.',
  },
  {
    icon: ChartLine,
    title: 'Spending breakdown',
    description:
      'See exactly where money went, by category and by month. No guessing. No spreadsheets.',
  },
  {
    icon: Gauge,
    title: 'Runway',
    description:
      'Know how long your savings will last at your current spend rate. A single number that tells you everything.',
  },
  {
    icon: ShieldCheck,
    title: 'Can I afford this?',
    description:
      'Check a purchase against your balance, income, and emergency fund before you buy — not after.',
  },
  {
    icon: UploadCloud,
    title: 'CSV import',
    description: "Your bank doesn't connect? Upload a CSV. Florin parses it regardless of format.",
  },
] as const;

export function meta() {
  return [
    { title: 'Florin — Personal Finance' },
    {
      name: 'description',
      content:
        'See where your money goes. Connect accounts, track spending, and understand your financial picture.',
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getServerSession(request);
  if (user) {
    throw redirect('/finance', { headers });
  }
  return null;
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center gap-12 py-8 text-center sm:py-12">
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="text-muted-foreground">Personal Finance</p>
        <h1 className="display-2 text-foreground">See where your money goes.</h1>
        <p className="body-1 text-muted-foreground">
          Connect your accounts, track spending across categories, and finally understand your
          financial picture.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/auth" className={buttonVariants({ size: 'lg' })}>
            Get started free
          </Link>
          <Link to="/auth" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Sign in
          </Link>
        </div>
      </div>

      <p className="body-2 max-w-xl text-muted-foreground">
        You roughly know what you earn. You don&apos;t know where it goes. At the end of the month
        the number is smaller and you&apos;re not sure why. That&apos;s not a willpower problem —
        it&apos;s a visibility problem.
      </p>

      <div className="grid w-full max-w-3xl gap-4 text-left sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-border bg-card p-4 text-card-foreground"
          >
            <feature.icon className="mb-2 size-5 text-foreground" aria-hidden />
            <h3 className="heading-4 text-foreground">{feature.title}</h3>
            <p className="body-3 mt-1 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>

      <p className="body-3 text-muted-foreground">Free to use. No credit card required.</p>
    </div>
  );
}

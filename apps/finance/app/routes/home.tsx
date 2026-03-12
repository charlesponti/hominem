import { useAuthContext } from '@hominem/auth';
import { LandingPage } from '@hominem/ui/components/layout/landing-page';
import { LoadingSpinner } from '@hominem/ui/components/ui/loading-spinner';
import { ChartLine, Landmark, UploadCloud, Gauge } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';

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

export default function Home() {
  const { user, isLoading } = useAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/finance', { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <LandingPage
      kicker="Personal Finance"
      headline="See where your money goes."
      sub="Connect your accounts, track spending across categories, and finally understand your financial picture."
      ctaPrimary={{ label: 'Get started free', href: '/auth' }}
      ctaSecondary={{ label: 'Sign in', href: '/auth' }}
      problem="You roughly know what you earn. You don't know where it goes. At the end of the month the number is smaller and you're not sure why. That's not a willpower problem — it's a visibility problem."
      features={[
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
          icon: UploadCloud,
          title: 'CSV import',
          description:
            "Your bank doesn't connect? Upload a CSV. Florin parses it regardless of format.",
        },
      ]}
      steps={[
        {
          label: 'Connect your accounts',
          description:
            'Link your bank, credit cards, and investment accounts via Plaid. Takes under two minutes.',
        },
        {
          label: 'Review your spending',
          description:
            'Transactions are auto-categorized. Adjust any that are wrong — Florin learns from corrections.',
        },
        {
          label: 'Understand the picture',
          description:
            'See your monthly totals, category breakdown, and runway in one view. No analysis required.',
        },
      ]}
      trustSignal="Free to use. No credit card required."
    />
  );
}

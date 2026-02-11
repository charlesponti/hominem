import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { LoadingSpinner } from '@hominem/ui/components/ui/loading-spinner';
import { ArrowRight } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';

export function meta() {
  return [
    { title: 'Florin - Personal Finance Made Simple' },
    {
      name: 'description',
      content:
        "Take control of your financial future with Florin's simple, powerful tools. Track all your accounts, categorize transactions automatically, and gain visual insights into your spending.",
    },
  ];
}

export default function Home() {
  const { user, isLoading, supabase } = useSupabaseAuthContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/finance', { replace: true });
    }
  }, [isLoading, user, navigate]);

  const handleSignIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
      },
    });
  }, [supabase.auth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="grow flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-4xl w-full text-center">
          {/* Hero Section */}
          <h1 className="font-mono text-4xl md:text-6xl font-bold mb-6 tracking-tighter uppercase">
            Take control of <span className="text-foreground italic">your money.</span>
          </h1>
          <h2 className="font-mono text-xl font-bold text-center mb-12 text-muted-foreground uppercase opacity-70">
            Everything you need to understand, plan, and control your money
          </h2>

          {/* CTA Button */}
          <div className="mb-16">
            <Button
              onClick={handleSignIn}
              size="lg"
              className="py-8 px-12 text-xl"
            >
              Get Started Free
              <ArrowRight className="inline-block ml-2 size-6" />
            </Button>
            <p className="text-xs font-mono text-muted-foreground mt-3 uppercase tracking-widest">No credit card required</p>
          </div>
        </div>
      </main>

      <footer className="py-6 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between text-center md:text-left">
            <p className="text-sm text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} Florin. All rights reserved.
            </p>
            <div className="flex gap-6 justify-center md:justify-end">
              <a href="/about" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </a>
              <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </a>
              <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground">
                Terms
              </a>
              <a href="/help" className="text-sm text-muted-foreground hover:text-foreground">
                Help
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

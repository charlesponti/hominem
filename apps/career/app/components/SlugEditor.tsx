import { Input } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSubmit } from 'react-router';

import { cn } from '~/lib/utils';

interface SlugEditorProps {
  portfolioId: string;
  initialSlug: string;
  liveUrl?: string | null;
  onSave?: (newSlug: string) => void;
}

interface ValidationState {
  isChecking: boolean;
  isAvailable: boolean | null;
  message: string;
  isValid: boolean;
}

const DEFAULT_SLUG_PLACEHOLDER = 'your-portfolio-name';

export function SlugEditor({ portfolioId, initialSlug, liveUrl, onSave }: SlugEditorProps) {
  const submit = useSubmit();

  // Component state
  const [slugValue, setSlugValue] = useState(initialSlug);
  const [isSaving, setIsSaving] = useState(false);
  const [validation, setValidation] = useState<ValidationState>({
    isChecking: false,
    isAvailable: null,
    message: '',
    isValid: true,
  });

  // Reset slug value when initialSlug changes (from successful save)
  useEffect(() => {
    setSlugValue(initialSlug);
  }, [initialSlug]);

  // Debounced slug validation
  const validateSlug = useCallback(
    async (slug: string) => {
      // Reset validation if empty or same as initial
      if (!slug || slug === initialSlug) {
        setValidation({ isChecking: false, isAvailable: null, message: '', isValid: true });
        return;
      }

      // Basic client-side validation
      if (slug.length < 3) {
        setValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Slug must be at least 3 characters long',
          isValid: false,
        });
        return;
      }

      if (slug.length > 50) {
        setValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Slug must be less than 50 characters long',
          isValid: false,
        });
        return;
      }

      // Server-side availability check
      setValidation({
        isChecking: true,
        isAvailable: null,
        message: 'Checking availability...',
        isValid: true,
      });

      try {
        const response = await fetch(
          `/api/validate-slug?slug=${encodeURIComponent(slug)}&currentId=${encodeURIComponent(portfolioId)}`,
        );
        const data = (await response.json()) as {
          success: boolean;
          data?: { isAvailable: boolean; message: string };
          error?: string;
        };

        if (data.success && data.data) {
          setValidation({
            isChecking: false,
            isAvailable: data.data.isAvailable,
            message: data.data.message,
            isValid: data.data.isAvailable,
          });
        } else {
          setValidation({
            isChecking: false,
            isAvailable: false,
            message: data.error || 'Invalid slug format',
            isValid: false,
          });
        }
      } catch {
        setValidation({
          isChecking: false,
          isAvailable: false,
          message: 'Error checking availability',
          isValid: false,
        });
      }
    },
    [portfolioId, initialSlug],
  );

  // Debounce validation calls
  useEffect(() => {
    const timer = setTimeout(() => {
      validateSlug(slugValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [slugValue, validateSlug]);

  // Event handlers
  const handleSave = async () => {
    if (!validation.isValid || !validation.isAvailable || slugValue === initialSlug || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('action', 'update-slug');
      formData.append('slug', slugValue);
      formData.append('portfolio_id', portfolioId);

      submit(formData, { method: 'post' });

      // Let the parent component handle the success state
      onSave?.(slugValue);
    } catch {
      // React Router submit is synchronous here; leave saving state cleanup to finally.
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Transform input to valid slug format
    const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugValue(newValue);
  };

  // Determine if save button should be enabled
  const canSave =
    validation.isValid && validation.isAvailable && slugValue !== initialSlug && !isSaving;

  // Get status icon and styling
  const getValidationStatus = () => {
    if (!slugValue || slugValue === initialSlug) return null;

    if (validation.isChecking) {
      return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
    }

    if (validation.isAvailable) {
      return <Check className="w-4 h-4 text-success" />;
    }

    if (validation.isAvailable === false) {
      return <X className="w-4 h-4 text-destructive" />;
    }

    return null;
  };

  const helperToneClassName = validation.isChecking
    ? 'text-primary'
    : validation.isAvailable
      ? 'text-success'
      : 'text-destructive';

  const statusIcon = getValidationStatus();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1">
          <span className="inline-flex shrink-0 items-center rounded-l-md border border-r-0 bg-surface-base px-3 body-3 text-muted-foreground">
            career.dev/p/
          </span>
          <div className="relative min-w-0 flex-1">
            {statusIcon ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {statusIcon}
              </span>
            ) : null}
            <Input
              id="portfolio-slug"
              type="text"
              value={slugValue}
              onChange={handleInputChange}
              aria-invalid={!validation.isValid}
              className={cn('rounded-l-none', statusIcon && 'pr-10')}
              placeholder={DEFAULT_SLUG_PLACEHOLDER}
            />
          </div>
        </div>

        {liveUrl ? (
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-9 shrink-0"
            aria-label="View live"
          >
            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
            </a>
          </Button>
        ) : null}

        <Button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          variant="outline"
          className="shrink-0"
        >
          {isSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <p
        className={cn('body-4', validation.message ? helperToneClassName : 'text-muted-foreground')}
      >
        {validation.message || 'Lowercase letters, numbers, and hyphens only.'}
      </p>
    </div>
  );
}

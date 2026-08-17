import { Input } from '@ponti-studios/ui/forms';
import { Card, CardContent, Label } from '@ponti-studios/ui/primitives';
import { Globe } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { siGithub, siX } from 'simple-icons';

import type { ProfileDetailsFormValues } from '~/lib/account/types';

const linkedinPath =
  'M416 32L31.9 32C14.3 32 0 46.5 0 64.3L0 447.7C0 465.5 14.3 480 31.9 480L416 480c17.6 0 32-14.5 32-32.3l0-383.4C448 46.5 433.6 32 416 32zM135.4 416l-66.4 0 0-213.8 66.5 0 0 213.8-.1 0zM102.2 96a38.5 38.5 0 1 1 0 77 38.5 38.5 0 1 1 0-77zM384.3 416l-66.4 0 0-104c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9l0 105.8-66.4 0 0-213.8 63.7 0 0 29.2 .9 0c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9l0 117.2z';

function BrandIcon({ path, viewBox = '0 0 24 24' }: { path: string; viewBox?: string }) {
  return (
    <svg
      aria-hidden="true"
      className="size-4 text-muted-foreground"
      fill="currentColor"
      viewBox={viewBox}
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Social-links fieldset. Reads and writes through the page-level
 * react-hook-form context so all profile fields share one dirty state and
 * one save action (see ProfilePage's SaveBar).
 */
export function SocialLinksSection() {
  const {
    register,
    formState: { errors },
  } = useFormContext<ProfileDetailsFormValues>();

  return (
    <section className="space-y-4">
      <h2 className="heading-3 text-foreground">Social</h2>

      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* GitHub */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="github"
                className="subheading-4 text-text-primary flex items-center gap-2"
              >
                <BrandIcon path={siGithub.path} />
                GitHub
              </Label>
              <div className="flex">
                <span className="inline-flex items-center shrink-0 px-3 body-3 text-muted-foreground border border-r-0 rounded-l-md bg-surface-base">
                  github.com/
                </span>
                <Input
                  id="github"
                  type="text"
                  placeholder="username"
                  className="rounded-l-none"
                  aria-invalid={errors.github ? true : undefined}
                  {...register('github', {
                    pattern: {
                      value: /^[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]$/,
                      message: 'Enter a valid GitHub username',
                    },
                  })}
                />
              </div>
              {errors.github && <p className="text-sm text-destructive">{errors.github.message}</p>}
            </div>

            {/* LinkedIn */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="linkedin"
                className="subheading-4 text-text-primary flex items-center gap-2"
              >
                <BrandIcon path={linkedinPath} viewBox="0 0 448 512" />
                LinkedIn
              </Label>
              <div className="flex">
                <span className="inline-flex items-center shrink-0 px-3 body-3 text-muted-foreground border border-r-0 rounded-l-md bg-surface-base">
                  linkedin.com/in/
                </span>
                <Input
                  id="linkedin"
                  type="text"
                  placeholder="username"
                  className="rounded-l-none"
                  aria-invalid={errors.linkedin ? true : undefined}
                  {...register('linkedin', {
                    pattern: {
                      value: /^[a-zA-Z0-9-]+$/,
                      message: 'Enter a valid LinkedIn username',
                    },
                  })}
                />
              </div>
              {errors.linkedin && (
                <p className="text-sm text-destructive">{errors.linkedin.message}</p>
              )}
            </div>

            {/* Twitter */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="twitter"
                className="subheading-4 text-text-primary flex items-center gap-2"
              >
                <BrandIcon path={siX.path} />
                Twitter / X
              </Label>
              <div className="flex">
                <span className="inline-flex items-center shrink-0 px-3 body-3 text-muted-foreground border border-r-0 rounded-l-md bg-surface-base">
                  x.com/
                </span>
                <Input
                  id="twitter"
                  type="text"
                  placeholder="username"
                  className="rounded-l-none"
                  aria-invalid={errors.twitter ? true : undefined}
                  {...register('twitter', {
                    pattern: {
                      value: /^[a-zA-Z0-9_]+$/,
                      message: 'Enter a valid Twitter username',
                    },
                  })}
                />
              </div>
              {errors.twitter && (
                <p className="text-sm text-destructive">{errors.twitter.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="website"
                className="subheading-4 text-text-primary flex items-center gap-2"
              >
                <Globe className="size-4 text-muted-foreground" />
                Website
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://yoursite.com"
                aria-invalid={errors.website ? true : undefined}
                {...register('website', {
                  pattern: {
                    value: /^https?:\/\/.+\..+/,
                    message: 'Enter a valid URL starting with https://',
                  },
                })}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

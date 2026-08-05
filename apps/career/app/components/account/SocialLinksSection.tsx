import type { CareerSocialLinksRecord } from '@hominem/db';
import { Input } from '@ponti-studios/ui/forms';
import { Button, Card, CardContent, Label } from '@ponti-studios/ui/primitives';
import { Github, Globe, Linkedin, SaveIcon, Twitter } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';

import { FormErrorAlert } from '~/components/FormErrorAlert';
import type { AccountActionResult, SocialLinksFormValues } from '~/lib/account/types';

export function SocialLinksSection({
  socialLinks,
  onSave,
}: {
  socialLinks: CareerSocialLinksRecord | null;
  onSave: (values: SocialLinksFormValues) => Promise<AccountActionResult<unknown>>;
}) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting, errors },
  } = useForm<SocialLinksFormValues>({
    defaultValues: {
      github: socialLinks?.github || '',
      linkedin: socialLinks?.linkedin || '',
      twitter: socialLinks?.twitter || '',
      website: socialLinks?.website || '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    reset({
      github: socialLinks?.github || '',
      linkedin: socialLinks?.linkedin || '',
      twitter: socialLinks?.twitter || '',
      website: socialLinks?.website || '',
    });
  }, [socialLinks, reset]);

  const onSubmit: SubmitHandler<SocialLinksFormValues> = async (formData) => {
    if (!isDirty) return;

    setSubmissionError(null);
    const result = await onSave(formData);

    if (result.success === false) {
      setSubmissionError(result.error || "We couldn't save your social links. Try again.");
      return;
    }

    reset(formData);
  };

  return (
    <section className="space-y-4">
      <h2 className="heading-3 text-foreground">Social</h2>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <FormErrorAlert title="Social links weren't saved" message={submissionError} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* GitHub */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="github"
                  className="subheading-4 text-text-primary flex items-center gap-2"
                >
                  <Github className="size-4 text-muted-foreground" />
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
                {errors.github && (
                  <p className="body-4 text-destructive">{errors.github.message}</p>
                )}
              </div>

              {/* LinkedIn */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="linkedin"
                  className="subheading-4 text-text-primary flex items-center gap-2"
                >
                  <Linkedin className="size-4 text-muted-foreground" />
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
                  <p className="body-4 text-destructive">{errors.linkedin.message}</p>
                )}
              </div>

              {/* Twitter */}
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="twitter"
                  className="subheading-4 text-text-primary flex items-center gap-2"
                >
                  <Twitter className="size-4 text-muted-foreground" />
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
                  <p className="body-4 text-destructive">{errors.twitter.message}</p>
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
                  <p className="body-4 text-destructive">{errors.website.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !isDirty}
                isLoading={isSubmitting}
                aria-label="Save social links"
              >
                <SaveIcon className="size-4" />
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

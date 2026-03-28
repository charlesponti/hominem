import type { Meta, StoryObj } from '@storybook/react-vite';

import { PasskeyEnrollmentBanner } from './passkey-enrollment-banner';

const meta: Meta<typeof PasskeyEnrollmentBanner> = {
  title: 'Patterns/Auth/PasskeyEnrollmentBanner',
  component: PasskeyEnrollmentBanner,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof PasskeyEnrollmentBanner>;

export const Default: Story = {
  render: () => (
    <div className="max-w-lg">
      {/* Note: The banner only shows if WebAuthn is supported and no passkeys exist.
          Rendered here using a static preview of the banner's internal structure. */}
      <div
        role="banner"
        className="flex items-center gap-3 border border-border bg-muted px-4 py-3 text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4 shrink-0 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <span className="grow text-muted-foreground">
          Sign in faster with a passkey — no password needed.
        </span>
        <button
          type="button"
          className="shrink-0 font-medium text-foreground underline-offset-2 hover:underline"
        >
          Add passkey
        </button>
        <button
          type="button"
          aria-label="Dismiss passkey prompt"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  ),
};

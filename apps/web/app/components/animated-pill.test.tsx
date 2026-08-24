// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AnimatedPill } from './animated-pill';

afterEach(cleanup);

describe('AnimatedPill', () => {
  it('enters from above and exits below when configured for up', () => {
    const { rerender } = render(
      <AnimatedPill isOpen direction="up">
        <span>Content</span>
      </AnimatedPill>,
    );
    const pill = screen.getByText('Content').parentElement;

    expect(pill?.className).toContain('translate-y-0');

    rerender(
      <AnimatedPill isOpen={false} direction="up">
        <span>Content</span>
      </AnimatedPill>,
    );

    expect(pill?.className).toContain('translate-y-full');
    expect(pill?.className).toContain('h-0');
    expect(pill?.className).toContain('min-h-0');
  });

  it('enters from below and exits above when configured for down', () => {
    const { rerender } = render(
      <AnimatedPill isOpen direction="down">
        <span>Content</span>
      </AnimatedPill>,
    );
    const pill = screen.getByText('Content').parentElement;

    expect(pill?.className).toContain('translate-y-0');

    rerender(
      <AnimatedPill isOpen={false} direction="down">
        <span>Content</span>
      </AnimatedPill>,
    );

    expect(pill?.className).toContain('-translate-y-full');
    expect(pill?.className).toContain('h-0');
    expect(pill?.className).toContain('min-h-0');
  });
});

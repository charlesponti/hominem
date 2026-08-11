import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../components/UploadResumeForm', () => ({
  UploadResumeForm: ({
    mode,
    onUploadComplete,
  }: {
    mode?: string;
    onUploadComplete: (response: { portfolioSlug: string }) => void;
  }) => (
    <button
      type="button"
      data-mode={mode}
      onClick={() => onUploadComplete({ portfolioSlug: 'charles-ponti' })}
    >
      Mock Upload Form
    </button>
  ),
}));

import Onboarding from './onboarding';

function renderOnboarding() {
  const router = createMemoryRouter(
    [
      {
        path: '/onboarding',
        element: <Onboarding />,
      },
      { path: '/work', element: <div>work</div> },
    ],
    { initialEntries: ['/onboarding'] },
  );

  return render(<RouterProvider router={router} />);
}

describe('Onboarding', () => {
  it('uses replace mode for resume upload', () => {
    renderOnboarding();
    expect(screen.getByRole('button', { name: /mock upload form/i })).toHaveAttribute(
      'data-mode',
      'create',
    );
  });

  it('navigates to work after upload completes', async () => {
    const user = userEvent.setup();
    navigate.mockReset();

    renderOnboarding();
    await user.click(screen.getByRole('button', { name: /mock upload form/i }));

    expect(navigate).toHaveBeenCalledWith('/work');
  });

  it('offers skip to work', () => {
    renderOnboarding();
    expect(screen.getByRole('button', { name: /skip for now/i })).toHaveAttribute('href', '/work');
  });
});

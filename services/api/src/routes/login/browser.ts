/// <reference lib="dom" />

const otpInputs = () => Array.from(document.querySelectorAll<HTMLInputElement>('[data-otp-digit]'));

const syncOtp = (form: HTMLFormElement | null) => {
  const hidden = form?.querySelector<HTMLInputElement>('[name="otp"]');
  if (hidden)
    hidden.value = otpInputs()
      .map((digit) => digit.value)
      .join('');
};

const progressButtonState = (
  button: HTMLElement,
  progress: number,
  complete: boolean,
  message: string,
  showArrow: boolean,
) => {
  button.style.setProperty('--progress', String(Math.max(0, Math.min(100, progress * 100))));
  button.dataset.complete = String(complete);
  button.toggleAttribute('data-progress-zero', progress <= 0);
  const messageElement = button.querySelector<HTMLElement>('[data-progress-message]');
  if (messageElement) messageElement.textContent = message;
  const arrow = button.querySelector<HTMLElement>('[data-progress-arrow]');
  if (arrow) arrow.hidden = !showArrow;
};

// Structural checks give a specific, actionable message while the user is
// still typing. The final "looks done" gate defers to the browser's own
// type="email" validator (isValid, from checkValidity()) instead of
// hand-rolling a regex here — that native check already handles cases this
// heuristic doesn't reason about (leading/trailing dots, doubled dots,
// invalid host characters, ...). The server's zod schema stays the actual
// authority; this only decides when to say "Ready to go!".
const emailProgress = (email: string, isValid: boolean): [number, string] => {
  if (!email) return [0, 'Enter your email'];
  if (/\s/.test(email)) return [0.2, 'Remove the spaces'];
  if (!email.includes('@')) return [0.2, 'Add the @ symbol'];
  const domain = email.split('@')[1] ?? '';
  if (!domain) return [0.4, 'Almost there! Add the domain'];
  if (!domain.includes('.')) return [0.6, "Don't forget the domain extension"];
  const extension = domain.split('.')[1] ?? '';
  if (extension.length < 2) return [0.8, 'Complete the domain extension'];
  return isValid ? [1, 'Ready to go!'] : [0.8, 'Check the email address'];
};

const updateProgressButton = (button: HTMLElement) => {
  const form = button.closest('form');
  const emailInput = form?.querySelector<HTMLInputElement>('[name="email"]');
  const otpInputsForForm = Array.from(
    form?.querySelectorAll<HTMLInputElement>('[data-otp-digit]') ?? [],
  );
  if (emailInput && otpInputsForForm.length === 0) {
    const [progress, message] = emailProgress(emailInput.value, emailInput.checkValidity());
    progressButtonState(button, progress, progress === 1, message, progress > 0);
    return;
  }
  if (otpInputsForForm.length > 0) {
    const digits = otpInputsForForm.filter((input) => input.value).length;
    progressButtonState(
      button,
      digits / otpInputsForForm.length,
      digits === otpInputsForForm.length,
      digits === 0 ? 'Enter your 6-digit code' : `${otpInputsForForm.length - digits} more to go`,
      digits > 0,
    );
  }
};

const fillOtp = (input: HTMLInputElement, value: string) => {
  const digits = value.replace(/\D/g, '');
  const inputs = otpInputs();
  const start = inputs.indexOf(input);
  if (!digits || start < 0) return;
  inputs.slice(start).forEach((digit, index) => {
    digit.value = digits[index] ?? '';
  });
  syncOtp(input.form);
  const button = input.form?.querySelector<HTMLElement>('[data-progress-button]');
  if (button) updateProgressButton(button);
  inputs[Math.min(start + digits.length, inputs.length - 1)]?.focus();
};

document.addEventListener('paste', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.matches('[data-otp-digit]')) return;
  event.preventDefault();
  fillOtp(input, event.clipboardData?.getData('text') ?? '');
});

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  if (input.matches('[data-otp-digit]')) fillOtp(input, input.value);
  const button = input.form?.querySelector<HTMLElement>('[data-progress-button]');
  if (button) updateProgressButton(button);
});

document.querySelectorAll<HTMLElement>('[data-progress-button]').forEach(updateProgressButton);

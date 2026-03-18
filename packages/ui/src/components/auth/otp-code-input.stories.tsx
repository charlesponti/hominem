import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { OtpCodeInput } from './otp-code-input';

const meta: Meta<typeof OtpCodeInput> = {
  title: 'Auth/OtpCodeInput',
  component: OtpCodeInput,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof OtpCodeInput>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="max-w-xs">
        <OtpCodeInput
          value={value}
          onChange={setValue}
          autoFocus={false}
        />
      </div>
    );
  },
};

export const WithError: Story = {
  render: () => (
    <div className="max-w-xs">
      <OtpCodeInput
        value="12"
        onChange={() => {}}
        error="Invalid code. Please try again."
        autoFocus={false}
      />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="max-w-xs">
      <OtpCodeInput
        value="123456"
        onChange={() => {}}
        disabled
        autoFocus={false}
      />
    </div>
  ),
};

export const FourDigit: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <div className="max-w-xs">
        <OtpCodeInput
          length={4}
          value={value}
          onChange={setValue}
          autoFocus={false}
        />
      </div>
    );
  },
};

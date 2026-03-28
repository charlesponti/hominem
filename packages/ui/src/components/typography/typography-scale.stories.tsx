import type { Meta, StoryObj } from '@storybook/react-vite'

const meta: Meta = {
  title: 'Typography/Scale',
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj

export const DisplayScale: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="body-4 mb-2 text-text-tertiary">display-1</p>
        <p className="display-1 text-text-primary">The quick brown fox</p>
      </div>
      <div>
        <p className="body-4 mb-2 text-text-tertiary">display-2</p>
        <p className="display-2 text-text-primary">The quick brown fox</p>
      </div>
    </div>
  ),
}

export const HeadingScale: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['heading-1', 'heading-2', 'heading-3', 'heading-4'] as const).map((cls) => (
        <div key={cls}>
          <p className="body-4 mb-1 text-text-tertiary">{cls}</p>
          <p className={`${cls} text-text-primary`}>The quick brown fox jumps</p>
        </div>
      ))}
    </div>
  ),
}

export const SubheadingScale: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['subheading-1', 'subheading-2', 'subheading-3', 'subheading-4'] as const).map((cls) => (
        <div key={cls}>
          <p className="body-4 mb-1 text-text-tertiary">{cls}</p>
          <p className={`${cls} text-text-primary`}>The quick brown fox jumps over the lazy dog</p>
        </div>
      ))}
    </div>
  ),
}

export const BodyScale: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      {(['body-1', 'body-2', 'body-3', 'body-4'] as const).map((cls) => (
        <div key={cls}>
          <p className="body-4 mb-1 text-text-tertiary">{cls}</p>
          <p className={`${cls} text-text-primary`}>
            The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.
          </p>
        </div>
      ))}
    </div>
  ),
}

export const ColorVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      {(
        [
          ['text-text-primary', 'text-primary'],
          ['text-text-secondary', 'text-secondary'],
          ['text-text-tertiary', 'text-tertiary'],
          ['text-text-disabled', 'text-disabled'],
        ] as const
      ).map(([cls, label]) => (
        <p key={cls} className={`body-2 ${cls}`}>
          {label} — The quick brown fox
        </p>
      ))}
    </div>
  ),
}

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Attachment, AttachmentEmpty, Attachments } from './attachments';

const meta: Meta<typeof Attachments> = {
  title: 'AI Elements/Attachments',
  component: Attachments,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Attachments>;

const docAttachment = {
  id: '1',
  type: 'file' as const,
  mimeType: 'application/pdf',
  name: 'report.pdf',
};

const imageAttachment = {
  id: '2',
  type: 'file' as const,
  mimeType: 'image/png',
  name: 'screenshot.png',
};

const audioAttachment = {
  id: '3',
  type: 'file' as const,
  mimeType: 'audio/mp3',
  name: 'recording.mp3',
};

export const Default: Story = {
  render: () => (
    <Attachments variant="grid" className="max-w-sm">
      <Attachment data={docAttachment} />
      <Attachment data={imageAttachment} />
      <Attachment data={audioAttachment} />
    </Attachments>
  ),
};

export const InlineVariant: Story = {
  render: () => (
    <Attachments variant="inline">
      <Attachment data={docAttachment} />
      <Attachment data={imageAttachment} />
    </Attachments>
  ),
};

export const ListVariant: Story = {
  render: () => (
    <Attachments variant="list" className="max-w-xs">
      <Attachment data={docAttachment} />
      <Attachment data={imageAttachment} />
      <Attachment data={audioAttachment} />
    </Attachments>
  ),
};

export const WithRemove: Story = {
  render: () => (
    <Attachments variant="grid" className="max-w-sm">
      <Attachment data={docAttachment} onRemove={() => {}} />
      <Attachment data={imageAttachment} onRemove={() => {}} />
    </Attachments>
  ),
};

export const Empty: Story = {
  render: () => <AttachmentEmpty />,
};

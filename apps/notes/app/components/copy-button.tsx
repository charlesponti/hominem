import type { ReactNode } from 'react';

import { Button } from '@hominem/ui/button';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  onClick: () => void;
  sectionName: string;
  copiedSections: Set<string>;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link';
  children?: ReactNode;
  shortcutKey?: string;
  disabled?: boolean;
  'aria-describedby'?: string;
}

export function CopyButton({
  onClick,
  sectionName,
  copiedSections,
  size = 'sm',
  variant = 'outline',
  children,
  shortcutKey,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
  ...props
}: CopyButtonProps) {
  const isCopied = copiedSections.has(sectionName);

  const ariaLabel = isCopied
    ? `${sectionName} copied to clipboard`
    : `Copy ${sectionName} to clipboard${shortcutKey ? `. Shortcut: ${shortcutKey}` : ''}`;

  const title = shortcutKey ? `Copy ${sectionName} (${shortcutKey})` : `Copy ${sectionName}`;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      data-copy-button
      data-section={sectionName}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      title={title}
      className="focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      {...props}
    >
      {isCopied ? (
        <Check className="size-4 mr-2 text-green-600" aria-hidden="true" />
      ) : (
        <Copy className="size-4 mr-2" aria-hidden="true" />
      )}
      <span>{children || (isCopied ? 'Copied!' : 'Copy')}</span>
      {isCopied && <span className="sr-only">Content successfully copied to clipboard</span>}
    </Button>
  );
}

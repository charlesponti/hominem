import type { ReactNode } from 'react';

import { Button } from '@hominem/ui/button';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  onClick: () => void;
  sectionName: string;
  copiedSections: Set<string>;
  size?: 'sm' | 'default' | 'lg' | undefined;
  variant?: 'outline' | 'default' | 'destructive' | 'secondary' | 'ghost' | 'link' | undefined;
  children?: ReactNode;
  shortcutKey?: string | undefined;
  disabled?: boolean | undefined;
  'aria-describedby'?: string | undefined;
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
    ? `${sectionName} copied`
    : `Copy ${sectionName}${shortcutKey ? `. Shortcut: ${shortcutKey}` : ''}`;

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
      className=""
      {...props}
    >
      {isCopied ? (
        <Check className="size-4 mr-2 text-foreground" aria-hidden="true" />
      ) : (
        <Copy className="size-4 mr-2" aria-hidden="true" />
      )}
      <span>{children || (isCopied ? 'COPIED' : 'COPY')}</span>
      {isCopied && <span className="sr-only">Content copied</span>}
    </Button>
  );
}

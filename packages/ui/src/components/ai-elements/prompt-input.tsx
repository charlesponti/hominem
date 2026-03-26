import { Paperclip, Send, Sparkles } from 'lucide-react';
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface FileUIPart {
  type: 'file';
  mimeType: string;
  name: string;
  url?: string;
  id: string;
  file?: File;
}

interface PromptInputMessage {
  text: string;
  files?: FileUIPart[];
}

interface PromptInputAttachmentsContextValue {
  files: FileUIPart[];
  add: (files: File[]) => void;
  remove: (id: string) => void;
  clear: () => void;
  openFileDialog: () => void;
}

const PromptInputAttachmentsContext = createContext<PromptInputAttachmentsContextValue | null>(
  null,
);

function usePromptInputAttachmentsContext() {
  const context = useContext(PromptInputAttachmentsContext);
  if (!context) {
    throw new Error('usePromptInputAttachments must be used within PromptInput');
  }
  return context;
}

interface PromptInputProviderProps {
  children: ReactNode;
}

export function PromptInputProvider({ children }: PromptInputProviderProps) {
  const [files, setFiles] = useState<FileUIPart[]>([]);

  const add = useCallback((newFiles: File[]) => {
    const fileParts: FileUIPart[] = newFiles.map((file) => ({
      type: 'file',
      mimeType: file.type,
      name: file.name,
      url: URL.createObjectURL(file),
      id: `${Date.now()}-${file.name}`,
      file,
    }));
    setFiles((prev) => [...prev, ...fileParts]);
  }, []);

  const remove = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.url) {
        URL.revokeObjectURL(file.url);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    files.forEach((file) => {
      if (file.url) {
        URL.revokeObjectURL(file.url);
      }
    });
    setFiles([]);
  }, [files]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (fileList) {
        add(Array.from(fileList));
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [add],
  );

  return (
    <PromptInputAttachmentsContext.Provider value={{ files, add, remove, clear, openFileDialog }}>
      {children}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileChange}
        aria-hidden="true"
      />
    </PromptInputAttachmentsContext.Provider>
  );
}

export function usePromptInputAttachments() {
  try {
    return usePromptInputAttachmentsContext();
  } catch {
    const [files, setFiles] = useState<FileUIPart[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const add = useCallback((newFiles: File[]) => {
      const fileParts: FileUIPart[] = newFiles.map((file) => ({
        type: 'file',
        mimeType: file.type,
        name: file.name,
        url: URL.createObjectURL(file),
        id: `${Date.now()}-${file.name}`,
        file,
      }));
      setFiles((prev) => [...prev, ...fileParts]);
    }, []);

    const remove = useCallback((id: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file?.url) {
          URL.revokeObjectURL(file.url);
        }
        return prev.filter((f) => f.id !== id);
      });
    }, []);

    const clear = useCallback(() => {
      files.forEach((file) => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
      setFiles([]);
    }, [files]);

    const openFileDialog = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    return { files, add, remove, clear, openFileDialog };
  }
}

export function usePromptInputController() {
  const { files, add, remove, clear, openFileDialog } = usePromptInputAttachments();
  const [inputValue, setInputValue] = useState('');

  return {
    textInput: {
      value: inputValue,
      setInput: setInputValue,
      clear: () => setInputValue(''),
    },
    attachments: { files, add, remove, clear, openFileDialog },
  };
}

export function useProviderAttachments() {
  return usePromptInputAttachmentsContext();
}

interface PromptInputProps {
  onSubmit?: (message: PromptInputMessage, event?: FormEvent) => void;
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: { code: string; message: string }) => void;
  className?: string;
  children?: ReactNode;
}

export const PromptInput = forwardRef<HTMLFormElement, PromptInputProps>(function PromptInput(
  {
    onSubmit,
    accept: _accept,
    multiple: _multiple = true,
    globalDrop = false,
    syncHiddenInput: _syncHiddenInput,
    maxFiles: _maxFiles = 10,
    maxFileSize: _maxFileSize = 10 * 1024 * 1024,
    onError: _onError,
    className,
    children,
    ...props
  },
  ref,
) {
  const [isDragOver, setIsDragOver] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const attachments = useContext(PromptInputAttachmentsContext);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const textarea = form.querySelector('textarea');
    const text = textarea?.value.trim() || '';

    if (!text) {
      return;
    }

    const message: PromptInputMessage = {
      text,
      ...(attachments?.files.length ? { files: attachments.files } : {}),
    };
    onSubmit?.(message, e);

    if (textarea) {
      textarea.value = '';
      textarea.style.height = 'auto';
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (globalDrop) {
        e.preventDefault();
        setIsDragOver(true);
      }
    },
    [globalDrop],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (globalDrop) {
        e.preventDefault();
        setIsDragOver(false);
      }
    },
    [globalDrop],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (globalDrop) {
        e.preventDefault();
        setIsDragOver(false);
      }
    },
    [globalDrop],
  );

  return (
    <form
      ref={ref || formRef}
      onSubmit={handleSubmit}
      className={cn(
        'flex flex-col gap-2',
        isDragOver && 'ring-2 ring-primary ring-offset-2',
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      {children}
    </form>
  );
});

interface PromptInputBodyProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputBody({ className, children, ...props }: PromptInputBodyProps) {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
    </div>
  );
}

interface PromptInputTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onValueChange?: (value: string) => void;
}

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  function PromptInputTextarea(
    { value, onValueChange, onChange, className, placeholder, disabled, ...props },
    ref,
  ) {
    const [isFocused, setIsFocused] = useState(false);

    const adjustHeight = useCallback((textarea: HTMLTextAreaElement) => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 240)}px`;
    }, []);

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLTextAreaElement>) => {
        onChange?.(e);
        onValueChange?.(e.target.value);
      },
      [onChange, onValueChange],
    );

    return (
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onInput={(e) => adjustHeight(e.currentTarget)}
        placeholder={placeholder || 'Type your message...'}
        disabled={disabled}
        className={cn(
          'flex w-full rounded-md border bg-background px-4 py-3 text-sm ring-offset-background',
          'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          'min-h-[44px] max-h-[240px] resize-none',
          isFocused && 'ring-2 ring-ring',
          className,
        )}
        rows={1}
        {...props}
      />
    );
  },
);

interface PromptInputHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputHeader({ className, children, ...props }: PromptInputHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface PromptInputFooterProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputFooter({ className, children, ...props }: PromptInputFooterProps) {
  return (
    <div className={cn('flex items-center justify-between px-1 py-1', className)} {...props}>
      {children}
    </div>
  );
}

interface PromptInputToolsProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputTools({ className, children, ...props }: PromptInputToolsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      {children}
    </div>
  );
}

interface PromptInputButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tooltip?:
    | string
    | { content: string; shortcut?: string; side?: 'top' | 'right' | 'bottom' | 'left' };
}

export function PromptInputButton({
  tooltip,
  className,
  children,
  ...props
}: PromptInputButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-8', className)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        {...props}
      >
        {children}
      </Button>
      {tooltip && showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-popover text-popover-foreground rounded-md whitespace-nowrap">
          {typeof tooltip === 'string' ? tooltip : tooltip.content}
        </div>
      )}
    </div>
  );
}

interface PromptInputSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  status?: 'ready' | 'streaming' | 'disabled';
}

export function PromptInputSubmit({
  status = 'ready',
  disabled,
  className,
  children,
  ...props
}: PromptInputSubmitProps) {
  const isDisabled = disabled || status === 'disabled';

  return (
    <Button
      type="submit"
      size="icon"
      disabled={isDisabled}
      className={cn('size-9 shrink-0', className)}
      {...props}
    >
      {status === 'streaming' ? (
        <Sparkles className="size-4 animate-spin" />
      ) : (
        <Send className="size-4" />
      )}
      {children}
    </Button>
  );
}

interface PromptInputActionMenuProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputActionMenu({
  className,
  children,
  ...props
}: PromptInputActionMenuProps) {
  return (
    <DropdownMenu>
      <div className={cn('flex items-center gap-1', className)} {...props}>
        {children}
      </div>
    </DropdownMenu>
  );
}

interface PromptInputActionMenuTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function PromptInputActionMenuTrigger({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-8', className)}
        {...props}
      >
        {children || <Paperclip className="size-4" />}
      </Button>
    </DropdownMenuTrigger>
  );
}

interface PromptInputActionMenuContentProps extends HTMLAttributes<HTMLDivElement> {}

export function PromptInputActionMenuContent({
  className,
  children,
  ...props
}: PromptInputActionMenuContentProps) {
  return (
    <DropdownMenuContent className={cn('', className)} {...props}>
      {children}
    </DropdownMenuContent>
  );
}

export function PromptInputActionMenuItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem className={cn('', className)} {...props}>
      {children}
    </DropdownMenuItem>
  );
}

interface PromptInputActionAddAttachmentsProps {
  label?: string;
  className?: string;
}

export function PromptInputActionAddAttachments({
  label = 'Add photos or files',
  className,
}: PromptInputActionAddAttachmentsProps) {
  const { openFileDialog } = usePromptInputAttachments();

  return (
    <PromptInputActionMenuItem
      onSelect={openFileDialog}
      className={cn('cursor-pointer', className)}
    >
      <Paperclip className="size-4 mr-2" />
      {label}
    </PromptInputActionMenuItem>
  );
}

interface PromptInputHoverCardProps extends HTMLAttributes<HTMLDivElement> {
  openDelay?: number;
  closeDelay?: number;
}

export function PromptInputHoverCard({ className, children, ...props }: PromptInputHoverCardProps) {
  return (
    <div className={cn('relative inline-block', className)} {...props}>
      {children}
    </div>
  );
}

export function PromptInputHoverCardTrigger({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('cursor-pointer', className)} {...props}>
      {children}
    </div>
  );
}

export function PromptInputHoverCardContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }) {
  return (
    <div className={cn('p-2', className)} {...props}>
      {children}
    </div>
  );
}

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

import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu';

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

function useFileAttachmentsState() {
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

  return { files, add, remove, clear };
}

export function PromptInputProvider({ children }: PromptInputProviderProps) {
  const { files, add, remove, clear } = useFileAttachmentsState();
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
    const { files, add, remove, clear } = useFileAttachmentsState();
    const fileInputRef = useRef<HTMLInputElement>(null);
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
      className={`flex flex-col gap-2 ${isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...props}
    >
      {children}
    </form>
  );
});

interface PromptInputBodyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {}

export function PromptInputBody({ children, ...props }: PromptInputBodyProps) {
  return (
    <div className="relative" {...props}>
      {children}
    </div>
  );
}

interface PromptInputTextareaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className'
> {
  onValueChange?: (value: string) => void;
}

export const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  function PromptInputTextarea(
    { value, onValueChange, onChange, placeholder, disabled, ...props },
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
        className={`flex w-full min-h-11 max-h-60 resize-none rounded-md border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${isFocused ? 'ring-2 ring-ring' : ''}`}
        rows={1}
        {...props}
      />
    );
  },
);

interface PromptInputHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {}

export function PromptInputHeader({ children, ...props }: PromptInputHeaderProps) {
  return (
    <div className="flex items-center gap-2" {...props}>
      {children}
    </div>
  );
}

interface PromptInputFooterProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {}

export function PromptInputFooter({ children, ...props }: PromptInputFooterProps) {
  return (
    <div className="flex items-center justify-between px-1 py-1" {...props}>
      {children}
    </div>
  );
}

interface PromptInputToolsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {}

export function PromptInputTools({ children, ...props }: PromptInputToolsProps) {
  return (
    <div className="flex items-center gap-1" {...props}>
      {children}
    </div>
  );
}

interface PromptInputButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  tooltip?:
    | string
    | { content: string; shortcut?: string; side?: 'top' | 'right' | 'bottom' | 'left' };
}

export function PromptInputButton({ tooltip, children, ...props }: PromptInputButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
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

interface PromptInputSubmitProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  status?: 'ready' | 'streaming' | 'disabled';
}

export function PromptInputSubmit({
  status = 'ready',
  disabled,
  children,
  ...props
}: PromptInputSubmitProps) {
  const isDisabled = disabled || status === 'disabled';

  return (
    <Button type="submit" size="icon" disabled={isDisabled} {...props}>
      {status === 'streaming' ? (
        <Sparkles className="size-4 animate-spin" />
      ) : (
        <Send className="size-4" />
      )}
      {children}
    </Button>
  );
}

interface PromptInputActionMenuProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {}

export function PromptInputActionMenu({ children, ...props }: PromptInputActionMenuProps) {
  return (
    <DropdownMenu>
      <div className="flex items-center gap-1" {...props}>
        {children}
      </div>
    </DropdownMenu>
  );
}

interface PromptInputActionMenuTriggerProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {}

export function PromptInputActionMenuTrigger({
  children,
  ...props
}: PromptInputActionMenuTriggerProps) {
  return (
    <DropdownMenuTrigger asChild>
      <Button type="button" variant="ghost" size="icon" {...props}>
        {children || <Paperclip className="size-4" />}
      </Button>
    </DropdownMenuTrigger>
  );
}

interface PromptInputActionMenuContentProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'className'
> {}

export function PromptInputActionMenuContent({
  children,
  ...props
}: PromptInputActionMenuContentProps) {
  return <DropdownMenuContent {...props}>{children}</DropdownMenuContent>;
}

export function PromptInputActionMenuItem({
  children,
  ...props
}: Omit<React.ComponentProps<typeof DropdownMenuItem>, 'className'>) {
  return <DropdownMenuItem {...props}>{children}</DropdownMenuItem>;
}

interface PromptInputActionAddAttachmentsProps {
  label?: string;
}

export function PromptInputActionAddAttachments({
  label = 'Add photos or files',
}: PromptInputActionAddAttachmentsProps) {
  const { openFileDialog } = usePromptInputAttachments();

  return (
    <PromptInputActionMenuItem onSelect={openFileDialog}>
      <Paperclip className="size-4 mr-2" />
      {label}
    </PromptInputActionMenuItem>
  );
}

interface PromptInputHoverCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className'> {
  openDelay?: number;
  closeDelay?: number;
}

export function PromptInputHoverCard({ children, ...props }: PromptInputHoverCardProps) {
  return (
    <div className="relative inline-block" {...props}>
      {children}
    </div>
  );
}

export function PromptInputHoverCardTrigger({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'className'>) {
  return (
    <div className="cursor-pointer" {...props}>
      {children}
    </div>
  );
}

export function PromptInputHoverCardContent({
  children,
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, 'className'> & { align?: 'start' | 'center' | 'end' }) {
  return (
    <div className="p-2" {...props}>
      {children}
    </div>
  );
}

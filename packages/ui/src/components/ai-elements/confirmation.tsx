'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { AlertTriangle, CheckCircle, HelpCircle, Info } from 'lucide-react';

import { cn } from '../../lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';

interface ConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  children?: ReactNode;
}

export function Confirmation({
  open,
  onOpenChange,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}: ConfirmationProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ConfirmationTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ConfirmationTrigger({
  children,
  className,
  ...props
}: ConfirmationTriggerProps) {
  return (
    <AlertDialogTrigger asChild>
      <button type="button" className={cn('', className)} {...props}>
        {children}
      </button>
    </AlertDialogTrigger>
  );
}

interface ConfirmationContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ConfirmationContent({
  children,
  className,
  ...props
}: ConfirmationContentProps) {
  return (
    <AlertDialogContent className={cn('', className)} {...props}>
      {children}
    </AlertDialogContent>
  );
}

type ConfirmationType = 'info' | 'success' | 'warning' | 'error' | 'question';

interface ConfirmationBannerProps extends HTMLAttributes<HTMLDivElement> {
  type?: ConfirmationType;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export function ConfirmationBanner({
  type = 'info',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  className,
  ...props
}: ConfirmationBannerProps) {
  const icons = {
    info: <Info className="size-5" />,
    success: <CheckCircle className="size-5 text-green-500" />,
    warning: <AlertTriangle className="size-5 text-yellow-500" />,
    error: <AlertTriangle className="size-5 text-destructive" />,
    question: <HelpCircle className="size-5" />,
  };

  const typeStyles = {
    info: 'border-primary/20 bg-primary/5',
    success: 'border-green-500/20 bg-green-500/5',
    warning: 'border-yellow-500/20 bg-yellow-500/5',
    error: 'border-destructive/20 bg-destructive/5',
    question: 'border-muted bg-muted/50',
  };

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-lg border', typeStyles[type], className)} {...props}>
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-medium">{title}</h4>
        {message && <p className="text-xs text-muted-foreground mt-1">{message}</p>}
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

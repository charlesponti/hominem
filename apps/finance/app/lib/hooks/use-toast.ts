import { useState } from 'react';

export interface ToastMessage {
  id?: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

type Toast = Required<Pick<ToastMessage, 'id'>> & ToastMessage;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: ToastMessage) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...message, id }]);

    // Auto-dismiss after duration
    if (message.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, message.duration || 5000);
    }
  };

  return {
    toast,
    toasts,
    dismiss: (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)),
  };
}

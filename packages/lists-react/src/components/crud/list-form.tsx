import { useAuthContext } from '@hominem/auth';
import { Form } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { cn } from '@hominem/ui/lib/utils';
import { Loading } from '@hominem/ui/loading';
import { TextField } from '@hominem/ui/text-field';
import { PlusCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useCreateList } from '../../hooks/use-lists';

type FormStatus = 'idle' | 'open' | 'submitting' | 'success';

const STORAGE_KEY = 'hominem:list-draft';

export function ListForm() {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isAuthenticated } = useAuthContext();
  const navigate = useNavigate();

  const { mutate: createList } = useCreateList({
    onSuccess: () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      setStatus('success');
      successTimerRef.current = setTimeout(() => {
        setName('');
        setStatus('idle');
      }, 1500);
    },
    onError: (error) => {
      setStatus('open');
      console.error('Mutation error creating list:', error);
    },
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { name?: string };
        if (parsed.name) {
          setName(parsed.name);
          setStatus('open');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleOpen = () => {
    setStatus('open');
  };

  const handleClose = () => {
    setName('');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setStatus('idle');
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
        return;
      }

      if (!isAuthenticated) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim() }));
        } catch {
          // ignore
        }

        navigate('/auth');
        return;
      }

      setStatus('submitting');
      createList({
        name: name.trim(),
        description: 'No description',
        isPublic: false,
      });
    },
    [name, isAuthenticated, navigate, createList],
  );

  const isOverlayVisible = status === 'submitting' || status === 'success';
  const showInput = status === 'open' || status === 'submitting' || status === 'success';
  const canSubmit = name.trim().length > 0 && status === 'open';

  return (
    <div className="flex gap-1">
      {showInput ? (
        <div className="relative w-full">
          <Form onSubmit={handleSubmit} className="w-full">
            <div className="flex gap-1">
              <div
                className={cn('flex-1', {
                  'opacity-0 pointer-events-none': isOverlayVisible,
                  'opacity-100': !isOverlayVisible,
                })}
              >
                <TextField
                  autoFocus={status === 'open'}
                  label="List name"
                  placeholder="Enter list name..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      handleClose();
                    }
                  }}
                  required
                  className="w-full"
                />
              </div>
              {status === 'open' && (
                <Button type="submit" disabled={!canSubmit} className="flex items-center gap-2">
                  Create
                </Button>
              )}
            </div>
          </Form>

          {status === 'submitting' ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loading size="sm" />
              <span className="ml-2 text-sm text-muted-foreground">Creating...</span>
            </div>
          ) : null}

          {status === 'success' ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-foreground">Created!</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-1 justify-end">
        <Button
          type="button"
          onClick={status === 'idle' ? handleOpen : handleClose}
          disabled={status === 'submitting'}
          variant={status !== 'idle' ? 'secondary' : 'default'}
          className="flex items-center gap-2"
        >
          {status !== 'idle' ? (
            <span> Cancel </span>
          ) : (
            <>
              <PlusCircle size={18} />
              <span>New List</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

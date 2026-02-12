import { Alert } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@hominem/ui/components/ui/popover';
import { Loading } from '@hominem/ui/loading';
import { CheckCircle2, PlusCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete';

import PlacesAutocomplete from '~/components/places/places-autocomplete';
import { createPlaceFromPrediction, useAddPlaceToList } from '~/lib/places';

interface AddPlaceControlProps {
  listId: string;
  canAdd?: boolean;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function AddPlaceControl({ listId, canAdd = true }: AddPlaceControlProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessTimer = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const addPlaceToList = useAddPlaceToList({
    onSuccess: (_result) => {
      setStatus('success');
      clearSuccessTimer();
      successTimerRef.current = setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setErrorMessage(null);
      }, 1500);
    },
    onError: (error: any) => {
      setStatus('error');
      setErrorMessage(error?.message || 'Failed to add place');
    },
  });

  const handlePlaceSelect = async (prediction: GooglePlacePrediction) => {
    setStatus('submitting');
    setErrorMessage(null);
    try {
      const place = await createPlaceFromPrediction(prediction);
      if (!place.googleMapsId) {
        throw new Error('googleMapsId is required');
      }
      addPlaceToList.mutate({
        placeId: place.id,
        listIds: [listId],
      });
    } catch (error) {
      setStatus('error');
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to process place selection. Retry.';
      setErrorMessage(message);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (status === 'submitting') {
      return;
    }
    if (!newOpen) {
      clearSuccessTimer();
      setStatus('idle');
      setErrorMessage(null);
    }
    setOpen(newOpen);
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage(null);
  };

  const getErrorMessage = () => {
    return errorMessage;
  };

  const displayError = getErrorMessage();

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          data-testid="add-to-list-button"
          disabled={!canAdd || status === 'submitting'}
          className="flex items-center gap-2 disabled:bg-muted"
          aria-label={!canAdd ? 'Cannot add places to this list' : 'Add place to list'}
        >
          <PlusCircle size={18} />
          <span>Add</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[90vw] max-w-100 p-4"
        align="start"
        aria-label="Add place to list"
        aria-busy={status === 'submitting'}
      >
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {status === 'submitting' && 'Adding place...'}
          {status === 'success' && 'Place added successfully'}
          {status === 'error' && `Error: ${displayError || 'Failed to add place'}`}
        </div>

        {status === 'submitting' ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loading size="md" />
            <span className="mt-2 text-sm text-muted-foreground">Adding place...</span>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="size-8 text-foreground mb-2" />
            <span className="text-sm font-semibold text-foreground">Added!</span>
          </div>
        ) : (
          <div className="space-y-3">
            {displayError && (
            <Alert type="error" dismissible onDismiss={handleRetry}>
              {displayError}
            </Alert>
          )}
            <PlacesAutocomplete setSelected={handlePlaceSelect} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

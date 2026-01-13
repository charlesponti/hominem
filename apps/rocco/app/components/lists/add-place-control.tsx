import { Alert } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@hominem/ui/components/ui/popover';
import { Loading } from '@hominem/ui/loading';
import { CheckCircle2, PlusCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PlacesAutocomplete from '~/components/places/places-autocomplete';
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete';
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
    onSuccess: () => {
      setStatus('success');
      clearSuccessTimer();
      successTimerRef.current = setTimeout(() => {
        setOpen(false);
        setStatus('idle');
        setErrorMessage(null);
      }, 1500);
    },
    onError: (error) => {
      setStatus('error');
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to add place. Please try again.';
      setErrorMessage(message);
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
        name: place.name,
        address: place.address || undefined,
        latitude: place.latitude || undefined,
        longitude: place.longitude || undefined,
        imageUrl: place.imageUrl || undefined,
        googleMapsId: place.googleMapsId,
        rating: place.rating || undefined,
        types: place.types || undefined,
        websiteUri: place.websiteUri || undefined,
        phoneNumber: place.phoneNumber || undefined,
        photos: place.photos || undefined,
        listIds: [listId],
      });
    } catch (error) {
      setStatus('error');
      const message =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Failed to process place selection. Please try again.';
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
    if (addPlaceToList.error) {
      const error = addPlaceToList.error;
      if (error instanceof Error) {
        return error.message;
      }
      if (typeof error === 'string') {
        return error;
      }
      if (error && typeof error === 'object' && 'message' in error) {
        return String(error.message);
      }
    }
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
          className="flex items-center gap-2 disabled:bg-indigo-200"
          aria-label={!canAdd ? 'Cannot add places to this list' : 'Add place to list'}
        >
          <PlusCircle size={18} />
          <span>Add</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[90vw] max-w-[400px] p-4"
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
            <span className="mt-2 text-sm text-gray-600">Adding place...</span>
          </div>
        ) : status === 'success' ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="size-8 text-green-600 mb-2" />
            <span className="text-sm font-semibold text-green-700">Added!</span>
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

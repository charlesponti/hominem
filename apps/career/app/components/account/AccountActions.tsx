import { Button } from '@ponti-studios/ui/primitives';
import { Download, Edit, LogOut, Trash2 } from 'lucide-react';
import { useRevalidator } from 'react-router';

import { UploadResumeForm } from '../UploadResumeForm';

export function AccountActions({
  canDownloadPdf,
  isGeneratingPdf,
  isSigningOut,
  onDeletePortfolio,
  onDownloadPdf,
  onSignOut,
}: {
  canDownloadPdf: boolean;
  isGeneratingPdf: boolean;
  isSigningOut: boolean;
  onDeletePortfolio: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const revalidator = useRevalidator();

  return (
    <section className="space-y-4">
      <div className="space-y-3">
        <UploadResumeForm
          mode="replace"
          onUploadStart={() => undefined}
          onUploadComplete={() => revalidator.revalidate()}
          onUploadError={() => undefined}
        />
        <ActionButtonRow
          icon={Download}
          label="Download PDF"
          onClick={() => onDownloadPdf()}
          variant="outline"
          disabled={isGeneratingPdf || !canDownloadPdf}
          isLoading={isGeneratingPdf}
          loadingLabel="Generating PDF..."
          helper={
            !canDownloadPdf
              ? 'Make the portfolio public in the editor before generating a downloadable PDF.'
              : undefined
          }
        />
        <ActionButtonRow
          icon={Trash2}
          label="Delete portfolio"
          onClick={() => onDeletePortfolio()}
          variant="outline"
          destructive
        />
        <ActionButtonRow
          icon={LogOut}
          label={isSigningOut ? 'Signing Out...' : 'Sign Out'}
          onClick={() => onSignOut()}
          variant="default"
          disabled={isSigningOut}
        />
      </div>
    </section>
  );
}

function ActionButtonRow({
  icon: Icon,
  label,
  helper,
  onClick,
  variant = 'outline',
  disabled = false,
  destructive = false,
  isLoading = false,
  loadingLabel,
}: {
  icon: typeof Edit;
  label: string;
  helper?: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'outline' | 'ghost';
  disabled?: boolean;
  destructive?: boolean;
  isLoading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        onClick={() => onClick()}
        variant={destructive ? 'destructive' : variant}
        disabled={disabled}
        isLoading={isLoading}
        loadingLabel={loadingLabel}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
      {helper ? <p className="body-4 px-1 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}

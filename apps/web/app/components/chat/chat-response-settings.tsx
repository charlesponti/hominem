import type { ResponseLength } from '~/lib/hooks/use-response-length';

export interface ChatResponseSettingsProps {
  value: ResponseLength;
  onChange: (value: string) => void;
  onClose: () => void;
}

export function ChatResponseSettings({ value, onChange, onClose }: ChatResponseSettingsProps) {
  return (
    <div aria-label="Response settings" className="border-b border-border-subtle p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm" htmlFor="response-length">
          Response length
          <select
            id="response-length"
            onChange={(event) => onChange(event.target.value)}
            value={value}
          >
            <option value="short">Short</option>
            <option value="medium">Medium</option>
            <option value="long">Long</option>
          </select>
        </label>
        <button
          aria-label="Close response settings"
          className="text-sm text-text-secondary hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
      <p className="mt-2 text-xs text-text-secondary">Applies to the next response.</p>
    </div>
  );
}

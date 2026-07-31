import { FilterChip } from '@ponti-studios/ui/data-display';
import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  fetchSuggestions?: (query: string) => Promise<string[]>;
}

export function TagInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  fetchSuggestions,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const listRef = useRef<HTMLUListElement>(null);

  const tagList = value;

  const addTag = useCallback(
    (raw: string) => {
      const tag = raw.trim().replace(/,$/, '').trim();
      if (!tag) return;
      if (tagList.includes(tag)) return;
      onChange([...tagList, tag]);
      setInputValue('');
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
    },
    [tagList, onChange],
  );

  const removeTag = useCallback(
    (tag: string) => {
      onChange(tagList.filter((t) => t !== tag));
    },
    [tagList, onChange],
  );

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed || !fetchSuggestions) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const results = await fetchSuggestions(trimmed);
      const filtered = results.filter((s) => s.toLowerCase() !== trimmed && !tagList.includes(s));
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
      setActiveIndex(-1);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputValue, fetchSuggestions, tagList]);

  const selectSuggestion = useCallback(
    (suggestion: string) => {
      addTag(suggestion);
      inputRef.current?.focus();
    },
    [addTag],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        selectSuggestion(suggestions[activeIndex]);
      } else {
        addTag(inputValue);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (e.key === 'Backspace' && !inputValue && tagList.length > 0) {
      removeTag(tagList[tagList.length - 1]);
    }
  };

  const handleBlur = () => {
    // Delay closing so click on suggestion registers
    setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 150);

    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  return (
    <div className="relative">
      <div
        className="void-focus flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-border bg-surface-base px-2 py-1.5 text-sm transition-colors has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50"
        onClick={() => inputRef.current?.focus()}
      >
        {tagList.map((tag) => (
          <FilterChip key={tag} label={tag} onRemove={() => removeTag(tag)} />
        ))}

        <div className="relative flex min-w-[80px] flex-1 items-center">
          <input
            ref={inputRef}
            id={id}
            type="text"
            className="w-full bg-transparent py-0.5 text-foreground outline-none placeholder:text-muted-foreground"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={tagList.length === 0 ? (placeholder ?? 'Type to add skills…') : ''}
            disabled={disabled}
            aria-label="Add a skill"
            aria-expanded={open}
            aria-autocomplete="list"
            aria-controls={open ? `${id}-suggestions` : undefined}
            aria-activedescendant={activeIndex >= 0 ? `${id}-suggestion-${activeIndex}` : undefined}
          />
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              id={`${id}-suggestion-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent blur before click
                selectSuggestion(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

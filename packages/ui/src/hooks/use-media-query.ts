import { useEffect, useState } from 'react';

interface MediaQueryOptions {
  width?: number;
  height?: number;
}

/**
 * A utility function to check if a media query matches the current viewport.
 * @param query - The media query string to check.
 * @param options - Optional width and height values for testing
 * @returns A boolean indicating whether the media query matches.
 */
export function mediaQuery(query: string, options?: MediaQueryOptions) {
  if (options?.width !== undefined) {
    // For test environment where we provide custom dimensions
    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);

    if (minWidthMatch && minWidthMatch[1]) {
      return options.width >= Number.parseInt(minWidthMatch[1], 10);
    }
    if (maxWidthMatch && maxWidthMatch[1]) {
      return options.width <= Number.parseInt(maxWidthMatch[1], 10);
    }
  }

  const mql = window.matchMedia(query);
  return mql.matches;
}

/**
 * A custom hook that listens for changes to a media query and returns its current value.
 * @param query - The media query string to listen for.
 * @returns A boolean indicating whether the media query matches.
 */
export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(e: MediaQueryListEvent | MediaQueryList) {
      setValue(e.matches);
    }

    const mql = window.matchMedia(query);
    setValue(mql.matches);
    mql.addEventListener('change', onChange);

    return () => {
      mql.removeEventListener('change', onChange);
    };
  }, [query]);

  return value;
}

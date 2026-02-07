type LoadingSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

type LoadingProps = {
  color?: string;
  size?: LoadingSize;
  className?: string;
};

const sizes = {
  sm: '1rem',
  md: '2rem',
  lg: '3rem',
  xl: '4rem',
  '2xl': '5rem',
  '3xl': '6rem',
};

export function Loading({ color, size = 'md', className }: LoadingProps) {
  return (
    <output data-testid="loading-spinner" className={className}>
      <span
        className="block border-2 border-border border-t-blue-600 border-r-blue-600"
        style={{ width: sizes[size], height: sizes[size], color }}
      />
      <span className="sr-only">Loading...</span>
    </output>
  );
}

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center max-h-[300px] mx-auto w-full">
      <Loading size="3xl" />
    </div>
  );
}

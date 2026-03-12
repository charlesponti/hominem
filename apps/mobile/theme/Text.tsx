import { Text as PrimitiveText } from '@hominem/ui/text';
import type { ColorToken } from '@hominem/ui/tokens';
import * as React from 'react';

type LegacyVariant =
  | 'extra_large'
  | 'header'
  | 'large'
  | 'cardHeader'
  | 'bodyLarge'
  | 'body'
  | 'text-md'
  | 'title'
  | 'caption'
  | 'label'
  | 'small'
  | 'mono'
  | 'defaults';

type PrimitiveVariant = 'body-1' | 'body-2' | 'body-3' | 'body-4';

interface TextProps extends Omit<React.ComponentProps<typeof PrimitiveText>, 'variant'> {
  color?: ColorToken | undefined;
  variant?: LegacyVariant | PrimitiveVariant | undefined;
}

const variantMap: Record<LegacyVariant, PrimitiveVariant> = {
  extra_large: 'body-1',
  header: 'body-1',
  large: 'body-1',
  cardHeader: 'body-1',
  bodyLarge: 'body-1',
  body: 'body-2',
  'text-md': 'body-2',
  title: 'body-2',
  caption: 'body-4',
  label: 'body-3',
  small: 'body-4',
  mono: 'body-4',
  defaults: 'body-3',
};

function isLegacyVariant(variant: LegacyVariant | PrimitiveVariant): variant is LegacyVariant {
  return variant in variantMap;
}

function Text({ variant = 'body-2', ...props }: TextProps) {
  const resolvedVariant = isLegacyVariant(variant) ? variantMap[variant] : variant;

  return <PrimitiveText variant={resolvedVariant} {...props} />;
}

export default Text;

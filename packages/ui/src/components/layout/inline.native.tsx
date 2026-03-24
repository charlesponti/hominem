import { View, type ViewProps, type ViewStyle } from 'react-native';

import { spacing } from '../../tokens';
import type { InlineAlign, InlineBaseProps, InlineJustify } from './inline.types';
import type { GapToken } from './stack.types';

const gapMap: Record<GapToken, number> = {
  none: 0,
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[5],
  xl: spacing[6],
};

const alignMap: Record<InlineAlign, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  baseline: 'baseline',
  stretch: 'stretch',
};

const justifyMap: Record<InlineJustify, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

interface InlineProps extends ViewProps, InlineBaseProps {}

function Inline({
  align = 'center',
  children,
  gap = 'sm',
  justify = 'start',
  style,
  wrap = false,
  ...props
}: InlineProps) {
  const inlineStyle: ViewStyle = {
    alignItems: alignMap[align],
    columnGap: gapMap[gap],
    flexDirection: 'row',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    justifyContent: justifyMap[justify],
  };

  return (
    <View style={[inlineStyle, style]} {...props}>
      {children}
    </View>
  );
}

export { Inline };
export type { InlineProps };

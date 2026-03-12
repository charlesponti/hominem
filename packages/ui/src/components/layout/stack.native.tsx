import * as React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

import { spacing } from '../../tokens';
import type { GapToken, StackBaseProps } from './stack.types';

const gapMap: Record<GapToken, number> = {
  none: 0,
  xs: spacing[1],
  sm: spacing[2],
  md: spacing[4],
  lg: spacing[5],
  xl: spacing[6],
};

interface StackProps extends ViewProps, StackBaseProps {}

function interleaveChildren(children: React.ReactNode, divider: React.ReactNode) {
  const items = React.Children.toArray(children);

  return items.flatMap((child, index) => {
    if (index === items.length - 1) {
      return [child];
    }

    const key = React.isValidElement(child) && child.key !== null ? String(child.key) : `${index}`;

    return [child, <React.Fragment key={`divider-${key}`}>{divider}</React.Fragment>];
  });
}

function Stack({ children, divider, gap = 'md', style, ...props }: StackProps) {
  const stackStyle: ViewStyle = {
    flexDirection: 'column',
    rowGap: gapMap[gap],
  };

  return (
    <View style={[stackStyle, style]} {...props}>
      {divider ? interleaveChildren(children, divider) : children}
    </View>
  );
}

export { Stack };
export type { StackProps };

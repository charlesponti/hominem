import type { SFSymbol, SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: SFSymbol;
  size?: number | undefined;
  tintColor?: ColorValue | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const [muted] = useThemeColor(['--color-muted-foreground']) as string[];
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor ?? muted}
      style={[styles.s0, [style, { height: size, width: size }]]}
      {...rest}
    />
  );
};

export default AppIcon;

const styles = makeStyles(() => ({
  s0: { alignItems: 'center', justifyContent: 'center' },
}));

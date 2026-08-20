import type { SFSymbol, SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
import { useThemeColor } from '~/components/theme';

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: SFSymbol;
  size?: number | undefined;
  tintColor?: ColorValue | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const [textPrimary] = useThemeColor(['--color-foreground']) as string[];
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor ?? textPrimary}
      style={[styles.s0, [style, { height: size, width: size }]]}
      {...rest}
    />
  );
};

export default AppIcon;

const styles = makeStyles((theme) => ({
  s0: { alignItems: 'center', justifyContent: 'center' },
}));

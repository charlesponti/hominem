import type { SFSymbol, SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, type ColorValue } from 'react-native';

import { useAppTheme } from '~/components/theme';

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: SFSymbol;
  size?: number | undefined;
  tintColor?: ColorValue | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const { mutedForeground: muted } = useAppTheme().colors;
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor ?? muted}
      style={[styles.container, [style, { height: size, width: size }]]}
      {...rest}
    />
  );
};

export default AppIcon;

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

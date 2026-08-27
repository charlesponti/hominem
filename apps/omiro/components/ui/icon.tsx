import { useTheme } from '@shopify/restyle';
import type { SFSymbol, SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { StyleSheet } from 'react-native';

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: SFSymbol;
  size?: number | undefined;
  tintColor?: ColorValue | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const { mutedForeground: muted } = useTheme().colors;
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

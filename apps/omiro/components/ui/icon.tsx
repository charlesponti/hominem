import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { useAppTheme } from '~/components/theme';

type IconProps = Omit<SymbolViewProps, 'size'> & {
  size?: number | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const { primary } = useAppTheme().colors;
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor ?? primary}
      style={[styles.container, [style]]}
      {...rest}
    />
  );
};

export default AppIcon;

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

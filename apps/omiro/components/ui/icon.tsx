import type { SFSymbol, SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import type { ColorValue } from 'react-native';
import { useCSSVariable } from 'uniwind';

type IconProps = Omit<SymbolViewProps, 'name' | 'size' | 'tintColor'> & {
  name: SFSymbol;
  size?: number | undefined;
  tintColor?: ColorValue | undefined;
};

const AppIcon = ({ name, size = 24, style, tintColor, ...rest }: IconProps) => {
  const [textPrimary] = useCSSVariable(['--color-foreground']) as string[];
  return (
    <SymbolView
      name={name}
      size={size}
      tintColor={tintColor ?? textPrimary}
      className="items-center justify-center shrink-0"
      style={[style, { height: size, width: size }]}
      {...rest}
    />
  );
};

export default AppIcon;
export type { IconProps };

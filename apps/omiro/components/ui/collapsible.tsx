import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, View, type LayoutChangeEvent } from 'react-native';

interface CollapsibleProps {
  children: ReactNode;
  visible: boolean;
}

export function Collapsible({ children, visible }: CollapsibleProps) {
  const height = useRef(new Animated.Value(0)).current;
  const [contentHeight, setContentHeight] = useState(0);
  const [renderChildren, setRenderChildren] = useState(visible);

  useEffect(() => {
    if (visible) setRenderChildren(true);
  }, [visible]);

  useEffect(() => {
    if (!contentHeight) return;
    Animated.timing(height, {
      toValue: visible ? contentHeight : 0,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      if (!visible) setRenderChildren(false);
    });
  }, [visible, contentHeight]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const h = event.nativeEvent.layout.height;
    if (h > 0) setContentHeight(h);
  }, []);

  return (
    <>
      {renderChildren && !contentHeight ? (
        <View style={{ position: 'absolute', opacity: 0 }}>
          <View onLayout={onLayout}>{children}</View>
        </View>
      ) : null}
      <Animated.View style={{ height: contentHeight ? height : 0, overflow: 'hidden' }}>
        {renderChildren && contentHeight > 0 ? children : null}
      </Animated.View>
    </>
  );
}

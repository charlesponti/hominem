import React, { useState, useRef } from 'react';
import { View, Button, Text, StyleSheet, Animated } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

const SWIPE_THRESHOLD = 50;

const App = () => {
  const [isCardVisible, setIsCardVisible] = useState(true);
  const translateY = useRef(new Animated.Value(0)).current;

  const handleGestureEvent = Animated.event([{ nativeEvent: { translationY: translateY } }], {
    useNativeDriver: true,
  });

  const handleStateChange = ({
    nativeEvent,
  }: {
    nativeEvent: { translationY: number; oldState: State };
  }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      if (nativeEvent.translationY > SWIPE_THRESHOLD) {
        Animated.timing(translateY, {
          toValue: 500,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setIsCardVisible(false));
      } else {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const resetCard = () => {
    setIsCardVisible(true);
    translateY.setValue(0);
  };

  if (!isCardVisible) {
    return (
      <View style={styles.container}>
        <Button title="Reset Card" onPress={resetCard} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleStateChange}>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateY }],
            },
          ]}>
          <Text>Swipe down to dismiss</Text>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'lightgray',
    padding: 20,
    borderRadius: 10,
    width: '100%',
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;

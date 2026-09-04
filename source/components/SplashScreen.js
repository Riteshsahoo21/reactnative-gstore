/* eslint-disable prettier/prettier */
import React, { useEffect } from 'react';
import { ImageBackground, StyleSheet } from 'react-native';

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home', { showPopup: false });
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ImageBackground
      source={require("../resources/assets/Splashscreen.jpeg")}
      style={styles.background}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default SplashScreen;

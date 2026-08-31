import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SplashScreen from 'react-native-splash-screen';

const Splash = () => {
  useEffect(() => {
    SplashScreen.hide(); // Hide the splash screen after the component is mounted
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to German Steel</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
  },
  text: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default Splash;

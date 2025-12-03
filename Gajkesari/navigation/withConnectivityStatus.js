import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ConnectivityStatusIcons } from '../components/ConnectivityStatus';

export const withConnectivityStatus = (WrappedComponent) => {
  return (props) => (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <WrappedComponent {...props} />
        <ConnectivityStatusIcons />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
  },
}); 
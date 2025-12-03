import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const IntentLevel = ({ level, onLevelChange }) => {
  return (
    <View style={styles.intentLevelBar}>
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
        <TouchableOpacity
          key={value}
          style={[
            styles.intentLevelIndicator,
            level >= value ? styles.activeIntentLevelIndicator : null,
          ]}
          onPress={() => onLevelChange(value)}
        >
          <Text style={styles.intentLevelNumber}>{value}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  intentLevelBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    marginTop: 8,
  },
  intentLevelIndicator: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIntentLevelIndicator: {
    backgroundColor: '#4F46E5',
  },
  intentLevelNumber: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: 'bold',
  },
});

export default IntentLevel;

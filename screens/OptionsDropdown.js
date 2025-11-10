import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const OptionsDropdown = ({ onFilterPress }) => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleDropdown = () => {
    setIsVisible(!isVisible);
  };

  const handleOptionPress = (option) => {
    console.log(`${option} option pressed`);
    if (option === 'Filter') {
      onFilterPress();
    }
    setIsVisible(false);
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.filterButton} onPress={toggleDropdown}>
        <Ionicons name="ellipsis-vertical" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Modal visible={isVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={toggleDropdown}>
          <View style={styles.optionsContainer}>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionPress('Search')}>
              <Ionicons name="search" size={20} color="#4F46E5" />
              <Text style={styles.optionText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionPress('Filter')}>
              <Ionicons name="filter" size={20} color="#4F46E5" />
              <Text style={styles.optionText}>Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleOptionPress('Fields')}>
              <Ionicons name="list" size={20} color="#4F46E5" />
              <Text style={styles.optionText}>Fields</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  filterButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingVertical: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
});

export default OptionsDropdown;
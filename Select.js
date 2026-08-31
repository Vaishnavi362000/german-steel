import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const Select = ({ options, multiple, placeholder, onSelect, selectedOption, style }) => {
  const [selectedOptions, setSelectedOptions] = useState(selectedOption ? [selectedOption] : []);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!multiple) {
      setSelectedOptions(selectedOption ? [selectedOption] : []);
    }
  }, [multiple, selectedOption?.value]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleOptionSelect = (option) => {
    if (multiple) {
      const isSelected = selectedOptions.some((selectedOption) => selectedOption.value === option.value);
      const nextSelectedOptions = isSelected
        ? selectedOptions.filter((selectedOption) => selectedOption.value !== option.value)
        : [...selectedOptions, option];

      setSelectedOptions(nextSelectedOptions);
      onSelect(nextSelectedOptions);
    } else {
      setSelectedOptions([option]);
      setModalVisible(false);
      onSelect(option);
    }
  };

  const handleClearSelection = () => {
    setSelectedOptions([]);
    onSelect(multiple ? [] : null);
  };

  const renderSelectedOptions = () => {
    if (selectedOptions.length === 0) {
      return <Text style={styles.placeholderText}>{placeholder}</Text>;
    }
    if (multiple) {
      return (
        <View style={styles.selectedOptionsContainer}>
          {selectedOptions.map((option) => (
            <View key={option.value} style={styles.selectedOption}>
              <Text style={styles.selectedOptionText}>{option.label}</Text>
              <TouchableOpacity onPress={() => handleOptionSelect(option)}>
                <Ionicons name="close" size={16} color="#666" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      );
    }
    return <Text style={styles.selectedOptionText}>{selectedOptions[0].label}</Text>;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={[styles.selectButton, style]} onPress={() => setModalVisible(true)}>
        {renderSelectedOptions()}
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)} statusBarTranslucent>
        <StatusBar style="dark" backgroundColor="transparent" translucent />
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{placeholder || 'Select an option'}</Text>
              <Text style={styles.modalSubtitle}>Search and choose one option</Text>
            </View>
            <TouchableOpacity style={styles.closeIconButton} onPress={() => setModalVisible(false)} accessibilityLabel="Close options">
              <Ionicons name="close" size={20} color="#2A3140" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#858EA0" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search options"
              placeholderTextColor="#9AA2B1"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>

          <FlatList
            style={styles.optionsList}
            data={filteredOptions}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.optionItem,
                  selectedOptions.some((selectedOption) => selectedOption.value === item.value) &&
                  styles.selectedOptionItem,
                ]}
                onPress={() => handleOptionSelect(item)}
              >
                <Text style={styles.optionText}>{item.label}</Text>
                {selectedOptions.some((selectedOption) => selectedOption.value === item.value) && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.value.toString()}
          />

        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  selectButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E1E4ED',
    borderRadius: 12,
    backgroundColor: '#FBFCFE',
  },
  selectedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2FF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  selectedOptionText: {
    fontSize: 15,
    color: '#222A39',
    marginRight: 4,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9AA2B1',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF5',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#222A39',
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#7C8494',
  },
  closeIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F2FF',
  },
  optionsList: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 50,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E1E4ED',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: '#222A39',
  },
  clearButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  selectedOptionItem: {
    backgroundColor: '#F1F2FF',
  },
  optionText: {
    fontSize: 15,
    color: '#30394B',
  },
});


export default Select;

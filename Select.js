import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Select = ({ options, multiple, placeholder, onSelect, selectedOption }) => {
  const [selectedOptions, setSelectedOptions] = useState(selectedOption ? [selectedOption] : []);
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

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
      <TouchableOpacity style={styles.selectButton} onPress={() => setModalVisible(true)}>
        {renderSelectedOptions()}
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search options"
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

          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    flex: 1,

  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  selectedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  selectedOptionText: {
    fontSize: 16,
    color: '#333',
    marginRight: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionsList: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 10,
    marginRight: 10,
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedOptionItem: {
    backgroundColor: '#f0f0f0',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
});


export default Select;

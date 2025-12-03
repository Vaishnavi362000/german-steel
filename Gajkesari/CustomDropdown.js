import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';

import { Drawer } from 'react-native-drawer';

const CustomDropdown = ({ options, selectedOption, onSelect, placeholder }) => {
        const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
    setSearchText('');
  };

  const handleAddNew = () => {
    const newOption = { label: searchText, value: searchText.toLowerCase() };
    onSelect(newOption);
    setIsOpen(false);
    setSearchText('');
  };

  const handleClear = () => {
    onSelect(null);
    setSearchText('');
  };

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderDropdownContent = () => (
    <View style={styles.dropdownContent}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search or add new"
        value={searchText}
        onChangeText={setSearchText}
      />
      <FlatList
        data={filteredOptions}
        keyExtractor={(item) => item.value}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.option} onPress={() => handleOptionSelect(item)}>
            <Text style={styles.optionText}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
      {searchText && !filteredOptions.find((option) => option.label === searchText) && (
        <TouchableOpacity style={styles.addNewOption} onPress={handleAddNew}>
          <Text style={styles.addNewOptionText}>Add New "{searchText}"</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.selectedOption} onPress={toggleDropdown}>
        {selectedOption ? (
          <View style={styles.selectedOptionContainer}>
            <Text style={styles.selectedOptionText}>{selectedOption.label}</Text>
            <TouchableOpacity style={styles.clearIcon} onPress={handleClear}>
              <Text>×</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.placeholderText}>{placeholder}</Text>
        )}
        <View style={styles.arrowIcon}>
          <Text>▼</Text>
        </View>
      </TouchableOpacity>
      <Drawer
        open={isOpen}
        onClose={toggleDropdown}
        content={renderDropdownContent()}
        openDrawerOffset={0.4}
        tapToClose={true}
        tweenHandler={(ratio) => ({
          main: { opacity: (2 - ratio) / 2 },
        })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  selectedOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  clearIcon: {
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#6B7280',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  dropdownContent: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 12,
    maxHeight: 200,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  option: {
    padding: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  addNewOption: {
    padding: 12,
    backgroundColor: '#F3F4F6',
  },
  addNewOptionText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: 'bold',
  },
});

export default CustomDropdown;
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const CustomDropdown = ({ options, data, selectedOption, value, onSelect, placeholder, loading, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Use either options or data prop, default to empty array
  const dropdownOptions = options || data || [];

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(!isOpen);
  };

  const handleOptionSelect = (option) => {
    // If value is expected (string), return option.value, otherwise return the whole option
    if (value !== undefined) {
      onSelect(option.value);
    } else {
      onSelect(option);
    }
    setIsOpen(false);
    setSearchText('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearchText('');
    setIsOpen(false);
  };

  // Find selected option when value prop is used
  const currentSelectedOption = value 
    ? dropdownOptions.find(opt => opt.value === value)
    : selectedOption;

  const filteredOptions = dropdownOptions.filter((option) => {
    // Safety check: ensure option and option.label exist and are strings
    if (!option || typeof option.label !== 'string') {
      return false;
    }
    return option.label.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[
          styles.selectedOption,
          disabled && styles.disabledOption
        ]} 
        onPress={toggleDropdown}
        disabled={disabled || loading}
      >
        {currentSelectedOption ? (
          <View style={styles.selectedOptionContainer}>
            <Text style={styles.selectedOptionText}>{currentSelectedOption.label}</Text>
            {!disabled && !loading && (
              <TouchableOpacity style={styles.clearIcon} onPress={handleClear}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.placeholderText}>
            {loading ? 'Loading...' : placeholder}
          </Text>
        )}
        <View style={styles.arrowIcon}>
          <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={disabled ? "#D1D5DB" : "#6B7280"} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdownModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              value={searchText}
              onChangeText={setSearchText}
            />
            
            <ScrollView style={styles.optionsList}>
              {filteredOptions.map((item) => (
                <TouchableOpacity 
                  key={item.value} 
                  style={styles.option} 
                  onPress={() => handleOptionSelect(item)}
                >
                  <Text style={styles.optionText}>{item.label}</Text>
                  {currentSelectedOption?.value === item.value && (
                    <Ionicons name="checkmark" size={20} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              ))}
              {filteredOptions.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No options found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 8,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },
  disabledOption: {
    backgroundColor: '#F9FAFB',
    opacity: 0.6,
  },
  selectedOptionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedOptionText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
    flex: 1,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
    margin: 16,
    marginBottom: 8,
  },
  optionsList: {
    maxHeight: 400,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default CustomDropdown;
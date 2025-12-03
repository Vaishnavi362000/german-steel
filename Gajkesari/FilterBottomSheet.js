import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const FilterBottomSheet = ({ isVisible, onClose, data, onFilter }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredColumns, setFilteredColumns] = useState([]);
  const [filters, setFilters] = useState([]);

  const columns = [
    'storeName',
    'clientFirstName',
    'clientLastName',
    'primaryContact',
    'clientType',
    'monthlySale',
  ];

  useEffect(() => {
    setFilteredColumns(columns);
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    const filtered = columns.filter((column) =>
      column.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredColumns(filtered);
  };

  const handleColumnSelect = (column) => {
    setFilters([...filters, { column, operator: null, value: '' }]);
  };

  const handleOperatorSelect = (index, operator) => {
    const updatedFilters = [...filters];
    updatedFilters[index].operator = operator;
    setFilters(updatedFilters);
  };

  const handleValueChange = (index, value) => {
    const updatedFilters = [...filters];
    updatedFilters[index].value = value;
    setFilters(updatedFilters);
  };

  const handleRemoveFilter = (index) => {
    const updatedFilters = [...filters];
    updatedFilters.splice(index, 1);
    setFilters(updatedFilters);
  };

  const handleClearAllFilters = () => {
    setFilters([]);
  };

  const handleApplyFilters = () => {
    const validFilters = filters.filter((filter) => filter.column && filter.operator && filter.value);
    if (validFilters.length > 0) {
      onFilter(validFilters);
      onClose();
    }
  };

  const renderColumnItem = ({ item }) => (
    <TouchableOpacity
      style={styles.columnItem}
      onPress={() => handleColumnSelect(item)}
    >
      <Text style={styles.columnText}>{item}</Text>
    </TouchableOpacity>
  );

  const renderFilterItem = ({ item, index }) => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>{item.column}</Text>
      <View style={styles.operatorValueContainer}>
        <View style={styles.operatorContainer}>
          <TouchableOpacity
            style={[styles.operatorButton, item.operator === 'equals' && styles.selectedOperator]}
            onPress={() => handleOperatorSelect(index, 'equals')}
          >
            <Text style={styles.operatorText}>Equals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.operatorButton, item.operator === 'contains' && styles.selectedOperator]}
            onPress={() => handleOperatorSelect(index, 'contains')}
          >
            <Text style={styles.operatorText}>Contains</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.valueInput}
          placeholder="Enter value"
          value={item.value}
          onChangeText={(value) => handleValueChange(index, value)}
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFilter(index)}>
          <Ionicons name="close-circle" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={isVisible} transparent animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.bottomSheetContainer}>
          <View style={styles.headerContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search columns..."
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAllFilters}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={filteredColumns}
            renderItem={renderColumnItem}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.columnList}
          />
          <FlatList
            data={filters}
            renderItem={renderFilterItem}
            keyExtractor={(item, index) => `${item.column}-${index}`}
            contentContainerStyle={styles.filterList}
            ListHeaderComponent={
              <View style={styles.filterHeaderContainer}>
                <Text style={styles.filterHeaderText}>Filters</Text>
              </View>
            }
          />
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  columnList: {
    maxHeight: 200,
  },
  columnItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  columnText: {
    fontSize: 16,
    color: '#1F2937',
  },
  filterList: {
    marginTop: 16,
  },
  filterHeaderContainer: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  filterHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 16,
    flex: 1,
  },
  operatorContainer: {
    flexDirection: 'row',
    marginRight: 16,
  },
  operatorButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  selectedOperator: {
    backgroundColor: '#4F46E5',
  },
  operatorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  valueInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    marginRight: 16,
    flex: 1,
  },
  removeButton: {
    padding: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  applyButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default FilterBottomSheet;
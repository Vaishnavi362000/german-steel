import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getData } from 'country-list';

const countries = getData().map((country) => country.name);

const CountryDropdown = ({ selectedCountry, onSelect }) => {
    const [isModalVisible, setModalVisible] = useState(false);
    const [searchText, setSearchText] = useState('');


    const filteredCountries = countries.filter((country) =>
      country.toLowerCase().includes(searchText.toLowerCase())
    );
  
    const handleCountrySelect = (country) => {
      onSelect(country);
      setModalVisible(false);
      setSearchText('');
    };
  
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.selectButton} onPress={() => setModalVisible(true)}>
          <Text style={selectedCountry ? styles.selectedCountry : styles.placeholderText}>
            {selectedCountry || 'Select a country'}
          </Text>
          <Ionicons name={selectedCountry ? 'close' : 'chevron-down'} size={20} color="#666" />
        </TouchableOpacity>
        <Modal visible={isModalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search countries"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
            </View>
            <FlatList
              data={filteredCountries}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCountry === item && styles.selectedCountryItem,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                >
                  <Text style={styles.countryText}>{item}</Text>
                  {selectedCountry === item && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />
          </View>
        </Modal>
      </View>
    );
  };

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
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
  selectedCountry: {
    fontSize: 16,
    color: '#333',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedCountryItem: {
    backgroundColor: '#f0f0f0',
  },
  countryText: {
    fontSize: 16,
    color: '#333',
  },
});

export default CountryDropdown;
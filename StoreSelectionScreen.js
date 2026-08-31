import { API_BASE_URL } from './config/api';
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash/debounce';
import { useNavigation } from '@react-navigation/native';

const StoreSelectionScreen = ({ route }) => {
  const { onSelect, authToken } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredStores, setFilteredStores] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMoreStores, setHasMoreStores] = useState(true);
  const navigation = useNavigation();

  const fetchStores = async (query = '', page = 0) => {
    try {
      setIsLoading(true);
      const employeeId = await AsyncStorage.getItem('employeeId');
      const response = await axios.get(
        `${API_BASE_URL}/store/getByEmployeeWithSort`,
        {
          params: {
            id: employeeId,
            storeName: query,
            sortBy: 'storeName',
            sortOrder: 'asc',
            page: page,
            size: 10
          },
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      
      const newStores = response.data.content;
      if (page === 0) {
        setFilteredStores(newStores);
      } else {
        setFilteredStores(prevStores => [...prevStores, ...newStores]);
      }
      setHasMoreStores(!response.data.last);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error fetching stores:', error);
      Alert.alert('Error', 'Failed to fetch stores. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((query) => {
      setCurrentPage(0);
      fetchStores(query, 0);
    }, 300),
    []
  );

  const handleSearchStores = (query) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleLoadMoreStores = () => {
    if (hasMoreStores && !isLoading) {
      fetchStores(searchQuery, currentPage + 1);
    }
  };

  const handleStoreSelect = (store) => {
    onSelect(store);
    navigation.goBack();
  };

  useEffect(() => {
    fetchStores();
  }, []);

  const renderStoreItem = ({ item }) => (
    <TouchableOpacity
      style={styles.storeItem}
      onPress={() => handleStoreSelect(item)}
    >
      <Text style={styles.storeName}>{item.storeName}</Text>
      <Text style={styles.storeInfo}>{item.city}, {item.state}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Customer</Text>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6C63FF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={handleSearchStores}
        />
      </View>
      <FlatList
        data={filteredStores}
        renderItem={renderStoreItem}
        keyExtractor={(item) => item.storeId.toString()}
        onEndReached={handleLoadMoreStores}
        onEndReachedThreshold={0.1}
        ListFooterComponent={() => isLoading && <ActivityIndicator size="small" color="#6C63FF" />}
        ListEmptyComponent={() => 
          !isLoading && <Text style={styles.emptyListText}>No stores found</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  storeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  storeInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default StoreSelectionScreen;
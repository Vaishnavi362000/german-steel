import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import axios from 'axios';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CreateCustomerComponent from './CreateCustomerComponent';

const CustomerListScreen = ({ authToken, shouldRefresh, setShouldRefresh }) => {
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [location, setLocation] = useState(null);

  const navigation = useNavigation();

  const fetchCustomers = useCallback(async (showOnlyDealers = false) => {
    try {
      setIsLoading(true);
      
      // Get token from AsyncStorage for authenticated requests
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        return;
      }

      console.log(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/filteredValues?page=${currentPage}&size=${pageSize}&sortBy=storeName&sortOrder=asc`);

      // Use /store/filteredValues endpoint with pagination
      // This endpoint automatically filters by city for field officers on the backend
      // Field officers will only see stores from their assigned cities
      let url = `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/filteredValues?page=${currentPage}&size=${pageSize}&sortBy=storeName&sortOrder=asc`;

      // Add search query if present
      if (searchQuery && searchQuery.trim()) {
        url += `&storeName=${encodeURIComponent(searchQuery)}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          // Bypass ngrok browser warning page
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      

      // Check if response is HTML instead of JSON (ngrok or auth issue)
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [FETCH CUSTOMERS] Server returned HTML instead of JSON - possible auth/ngrok issue');
        setCustomers([]);
        setTotalPages(0);
        return;
      }

      // Extract paginated data
      let customers = response.data.content || [];
      const totalPages = response.data.totalPages || 0;
      const totalElements = response.data.totalElements || 0;
      
      console.log('Backend Response Customers:', customers); // Added log to check sorting
      // Filter to show only dealers if requested
      if (showOnlyDealers) {
        customers = customers.filter(customer => 
          customer.clientType === 'Dealer' || 
          customer.clientType?.toLowerCase().includes('dealer') || 
          customer.clientType?.toLowerCase().includes('shop')
        );
      }

      // Ensure frontend sort by storeName (ascending)
      customers.sort((a, b) => {
        const aName = (a.storeName || '').toString().trim();
        const bName = (b.storeName || '').toString().trim();
        if (!aName && !bName) return 0;
        if (!aName) return 1; // push empty/undefined to the end
        if (!bName) return -1;
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' });
      });
      console.log('Frontend Sorted Customers (storeName asc):', customers.map(c => c.storeName));

      setCustomers(customers);
      setTotalPages(totalPages);
      
      console.log(`✅ [FETCH CUSTOMERS] Loaded ${customers.length} customers (Total: ${totalElements}, Page: ${currentPage + 1}/${totalPages})`);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery]);

  const updateLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);

      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        console.error('Employee ID not found');
        return;
      }

      // Get fresh token from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.error('Auth token not found');
        return;
      }

      const response = await axios.put(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/updateLiveLocation?id=${employeeId}&latitude=${location.coords.latitude}&longitude=${location.coords.longitude}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            // Bypass ngrok browser warning page
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      if (response.data === 'Location Updated!') {
        console.log('Location updated successfully on server');
      } else {
        console.log('Unexpected response when updating location:', response.data);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      updateLocation();
      if (shouldRefresh) {
        fetchCustomers();
        setShouldRefresh(false);
      }

      // Set up interval for periodic location updates
      const intervalId = setInterval(updateLocation, 5 * 60 * 1000); // Update every 5 minutes

      return () => clearInterval(intervalId);
    }, [updateLocation, shouldRefresh, fetchCustomers, setShouldRefresh])
  );

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, searchQuery, fetchCustomers]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(0);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <TouchableOpacity
          key={i}
          style={[styles.pageButton, currentPage === i && styles.currentPageButton]}
          onPress={() => handlePageChange(i)}
        >
          <Text style={[styles.pageButtonText, currentPage === i && styles.currentPageButtonText]}>
            {i + 1}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <>
        {totalPages > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[styles.pageButton, currentPage === 0 && styles.disabledPageButton]}
              onPress={() => currentPage > 0 && handlePageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              <Ionicons name="chevron-back" size={24} color={currentPage === 0 ? "#D1D5DB" : "#4F46E5"} />
            </TouchableOpacity>
            {pageNumbers}
            <TouchableOpacity
              style={[styles.pageButton, currentPage === totalPages - 1 && styles.disabledPageButton]}
              onPress={() => currentPage < totalPages - 1 && handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
            >
              <Ionicons name="chevron-forward" size={24} color={currentPage === totalPages - 1 ? "#D1D5DB" : "#4F46E5"} />
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };
  

  const getInitials = (firstName, lastName) => {
    const firstInitial = firstName ? firstName.charAt(0).toUpperCase() : '';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${firstInitial}${lastInitial}`;
  };

  const getLastVisitText = (lastVisitDate) => {
    if (!lastVisitDate) return 'Never visited';
    const date = new Date(lastVisitDate);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} days ago`;
  };

  const renderCustomerItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, isDealer(item.clientType) && styles.dealerCard]}
      onPress={() => navigation.navigate('CustomerDetails', { customerId: item.storeId, authToken })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(item.clientFirstName, item.clientLastName)}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.storeName}>{item.storeName}</Text>
          <View style={styles.clientTypeContainer}>
            {renderClientTypeTag(item.clientType)}
          </View>
          <Text style={styles.ownerName}>{`${item.clientFirstName} ${item.clientLastName}`}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.contactInfo}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={16} color="#6c63ff" />
            <Text style={styles.infoText}>{getLastVisitText(item.lastVisitDate)}</Text>
          </View>
        </View>
        <View style={styles.visits}>
          <View style={styles.visitItem}>
            <Ionicons name="people-outline" size={16} color="#6c63ff" />
            <Text style={styles.visitText}>Total Visits: {item.totalVisitCount}</Text>
          </View>
          <View style={styles.visitItem}>
            <Ionicons name="calendar-number-outline" size={16} color="#6c63ff" />
            <Text style={styles.visitText}>This Month: {item.visitThisMonth}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderClientTypeTag = (clientType) => {
    if (!clientType) return null;

    // Map backend values to display labels
    const typeMapping = {
      'Professional': 'Engineer/Architect/Contractor',
      'Dealer': 'Dealer/Shop',
      'Site Visit': 'Site Visit',
    };

    const displayType = typeMapping[clientType] || clientType;
    const tagColor = getClientTypeColor(clientType);

    return (
      <View style={[styles.clientTypeTag, { backgroundColor: tagColor }]}>
        <Text style={styles.clientTypeText}>{displayType}</Text>
      </View>
    );
  };

  const getClientTypeColor = (type) => {
    const colors = {
      Professional: '#4CAF50', // Green for Engineer/Architect/Contractor
      Dealer: '#2196F3', // Blue for Dealer/Shop
      'Site Visit': '#9C27B0', // Purple for Site Visit
    };
    return colors[type] || '#607D8B'; // Gray as fallback
  };

  const isDealer = (clientType) => {
    return clientType === 'Dealer' || 
           clientType?.toLowerCase().includes('dealer') || 
           clientType?.toLowerCase().includes('shop');
  };

  const openCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(true);
  };

  const closeCreateCustomerModal = () => {
    setIsCreateCustomerModalOpen(false);
  };

  const handleCustomerCreated = () => {
    fetchCustomers();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreateCustomerModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      ) : (
        <FlatList
          data={customers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item.storeId.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ color: '#6B7280', fontStyle: 'italic' }}>No customers found</Text>
            </View>
          }
          ListFooterComponent={renderPagination}
        />
      )}
      <CreateCustomerComponent
        isVisible={isCreateCustomerModalOpen}
        onClose={closeCreateCustomerModal}
        authToken={authToken}
        onCustomerCreated={handleCustomerCreated}
        navigation={navigation}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 50,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  clientTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clientTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dealerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  clientTypeContainer: {
    marginVertical: 4,
  },
  dealerBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardContent: {
    marginTop: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4B5563',
  },
  visits: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#4B5563',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  pageButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 4,
    backgroundColor: '#F3F4F6',
  },
  currentPageButton: {
    backgroundColor: '#4F46E5',
  },
  pageButtonText: {
    fontSize: 14,
    color: '#4B5563',
  },
  currentPageButtonText: {
    color: '#FFFFFF',
  },
  disabledPageButton: {
    opacity: 0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomerListScreen;

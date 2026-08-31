import { API_BASE_URL } from './config/api';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CreateCustomerComponent from './CreateCustomerComponent';
import LocationService from './LocationService';

const CustomerListScreen = ({ authToken, shouldRefresh, setShouldRefresh, route }) => {
  const [isCreateCustomerModalOpen, setIsCreateCustomerModalOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [location, setLocation] = useState(null);

  const navigation = useNavigation();

  useEffect(() => {
    if (route?.params?.openCreateCustomer) {
      setIsCreateCustomerModalOpen(true);
      navigation.setParams({ openCreateCustomer: false });
    }
  }, [navigation, route?.params?.openCreateCustomer]);

  const updateLocation = useCallback(async () => {
    try {
      const currentLocation = await LocationService.updateCurrentLocation();
      if (currentLocation) {
        setLocation(currentLocation);
      }
    } catch (error) {
      console.warn('Live location refresh skipped:', error?.message || error);
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      const employeeId = await AsyncStorage.getItem('employeeId');
      let url = `${API_BASE_URL}/store/getByEmployeeWithSort?id=${employeeId}&page=${currentPage}&size=${pageSize}&sortBy=storeName&sortOrder=asc`;

      if (searchQuery) {
        url += `&storeName=${encodeURIComponent(searchQuery)}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setCustomers(response.data.content);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, currentPage, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      updateLocation();
      if (shouldRefresh) {
        fetchCustomers();
        setShouldRefresh?.(false);
      }

      // Set up interval for periodic location updates.
      const intervalId = setInterval(updateLocation, 5 * 60 * 1000);
      return () => clearInterval(intervalId);
    }, [updateLocation, shouldRefresh, fetchCustomers, setShouldRefresh])
  );

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  const isDealer = (clientType) => {
    const normalized = String(clientType || '').toLowerCase();
    return normalized === 'dealer' || normalized === 'shop' || normalized.includes('dealer') || normalized.includes('shop');
  };

  const CustomerStatBox = ({ icon, label, value, wide = false }) => (
    <View style={[styles.customerStatBox, wide && styles.customerStatBoxWide]}>
      <View style={styles.customerStatIcon}>
        <Ionicons name={icon} size={15} color="#4F46E5" />
      </View>
      <View style={styles.customerStatTextWrap}>
        <Text style={styles.customerStatLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.88}>
          {label}
        </Text>
        <Text style={styles.customerStatValue} numberOfLines={1} ellipsizeMode="tail">
          {value}
        </Text>
      </View>
    </View>
  );

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
          <Text style={styles.storeName} numberOfLines={2} ellipsizeMode="tail">{item.storeName}</Text>
          <View style={styles.clientTypeContainer}>{renderClientTypeTag(item.clientType)}</View>
          <Text style={styles.ownerName} numberOfLines={1} ellipsizeMode="tail">
            {`${item.clientFirstName || ''} ${item.clientLastName || ''}`.trim()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color="#4F46E5" style={styles.cardChevronIcon} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.customerStatsRow}>
          <CustomerStatBox icon="calendar-outline" label="Last Visit" value={getLastVisitText(item.lastVisitDate)} wide />
          <CustomerStatBox icon="people-outline" label="Total Visits" value={item.totalVisitCount ?? 0} />
          <CustomerStatBox icon="calendar-number-outline" label="This Month" value={item.visitThisMonth ?? 0} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderClientTypeTag = (clientType) => {
    if (!clientType) return null;

    const formattedType = clientType.charAt(0).toUpperCase() + clientType.slice(1).toLowerCase();
    const tagColor = getClientTypeColor(formattedType);

    return (
      <View style={[styles.clientTypeTag, { backgroundColor: tagColor }]}>
        <Text style={styles.clientTypeText}>{formattedType}</Text>
      </View>
    );
  };

  const getClientTypeColor = (type) => {
    const colors = {
      Architect: '#4CAF50',
      Shop: '#2196F3',
      Engineer: '#FF9800',
      'Site visit': '#9C27B0',
      Builder: '#795548',
      Others: '#607D8B'
    };
    return colors[type] || colors.Others;
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
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  content: {
    flex: 1,
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
    fontSize: 14,
    lineHeight: 20,
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
    paddingBottom: 160,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
    lineHeight: 21,
  },
  ownerName: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 3,
  },
  clientTypeTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '100%',
  },
  clientTypeText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  dealerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF5722',
  },
  clientTypeContainer: {
    alignItems: 'flex-start',
    marginVertical: 3,
  },
  cardChevronIcon: {
    marginLeft: 8,
    marginTop: 6,
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
    lineHeight: 13,
    fontWeight: '700',
  },
  cardContent: {
    borderTopWidth: 1,
    borderTopColor: '#EEF2FF',
    marginTop: 8,
    paddingTop: 10,
  },
  customerStatsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  customerStatBox: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#EEF2FF',
  },
  customerStatBoxWide: {
    flex: 1.18,
  },
  customerStatIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  customerStatTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  customerStatLabel: {
    color: '#6B7280',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  customerStatValue: {
    color: '#1F2937',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    color: '#4B5563',
  },
  currentPageButtonText: {
    color: '#FFFFFF',
  },
  disabledPageButton: {
    opacity: 0.5,
  },
  loaderContainer: {
    minHeight: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});

export default CustomerListScreen;

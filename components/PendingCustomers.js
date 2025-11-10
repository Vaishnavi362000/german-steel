import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getPendingCustomers, removePendingCustomer } from '../utils/offlineStorage';

const PendingCustomers = ({ authToken, onCustomerCreated }) => {
  const [pendingCustomers, setPendingCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  const loadPendingCustomers = async () => {
    const customers = await getPendingCustomers();
    setPendingCustomers(customers);
  };

  const handleResend = async (customer) => {
    setProcessingIds(prev => [...prev, customer.id]);
    const netInfo = await NetInfo.fetch();

    if (!netInfo.isConnected) {
      alert('No internet connection available');
      setProcessingIds(prev => prev.filter(id => id !== customer.id));
      return;
    }

    try {
      // Get employeeId first
      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!employeeId) {
        throw new Error('Employee ID not found');
      }

      // First check if customer exists
      try {
        const checkResponse = await axios.get(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getByPhone?phone=${customer.primaryContact}`,
          {
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );

        // If we get here, customer exists
        if (checkResponse.data && checkResponse.data.storeId) {
          alert('A customer with this phone number already exists');
          await removePendingCustomer(customer.id);
          await loadPendingCustomers();
          onCustomerCreated();
          setProcessingIds(prev => prev.filter(id => id !== customer.id));
          return;
        }
      } catch (checkError) {
        // If we get 406 with "Store Not Found", that's good - proceed to create
        if (checkError.response?.status !== 406 || 
            !checkError.response?.data?.includes('Store Not Found')) {
          throw checkError; // Re-throw if it's not the "Store Not Found" case
        }
      }

      // Prepare payload with employeeId
      const createPayload = {
        ...customer,
        subDistrict: customer.village,
        district: customer.taluka,
        employeeId: employeeId,
      };
      delete createPayload.id; // Remove the local ID if it exists
      delete createPayload.village;
      delete createPayload.taluka;

      console.log('Creating customer with payload:', createPayload); // Debug log

      const createResponse = await axios.post(
        'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/create',
        createPayload,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (createResponse.data) {
        await removePendingCustomer(customer.id);
        await loadPendingCustomers();
        onCustomerCreated();
        
        // Only show success message if there was no error
        if (createResponse.data) {
          alert('Customer created successfully!');
        }
      }
    } catch (error) {
      console.error('Error processing pending customer:', error);
      if (!error.response || error.message === 'Network Error') {
        alert('Network error. Customer will remain in pending list.');
      } else if (error.message === 'Employee ID not found') {
        alert('Session error. Please log out and log in again.');
      } else if (error.response?.data?.includes('must not be null')) {
        alert('Error: Missing required information. Please check all fields.');
      } else {
        alert('Failed to process customer. Please try again.');
      }
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== customer.id));
    }
  };

  useEffect(() => {
    loadPendingCustomers();
  }, []);

  // Add this effect to notify parent when pending customers change
  useEffect(() => {
    if (pendingCustomers.length === 0) {
      onCustomerCreated();
    }
  }, [pendingCustomers.length]);

  if (pendingCustomers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No pending requests</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {pendingCustomers.map((customer) => (
        <View key={customer.id} style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{customer.storeName}</Text>
              <View style={styles.clientTypeBadge}>
                <Text style={styles.clientTypeText}>
                  {customer.clientType?.charAt(0).toUpperCase() + customer.clientType?.slice(1)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.resendButton,
                processingIds.includes(customer.id) && styles.resendButtonDisabled
              ]}
              onPress={() => handleResend(customer)}
              disabled={processingIds.includes(customer.id)}
            >
              {processingIds.includes(customer.id) ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.resendButtonText}>Resend</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.infoColumn}>
              <View style={styles.detailRow}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {customer.clientFirstName} {customer.clientLastName}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="call" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{customer.primaryContact}</Text>
              </View>
            </View>
            
            <View style={styles.infoColumn}>
              <View style={styles.detailRow}>
                <Ionicons name="location" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {[customer.village, customer.taluka].filter(Boolean).join(', ')}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="business" size={16} color="#6B7280" />
                <Text style={styles.detailText}>
                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  storeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  clientTypeBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  clientTypeText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },
  cardContent: {
    padding: 12,
    flexDirection: 'row',
    gap: 16,
  },
  infoColumn: {
    flex: 1,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  resendButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 4,
  },
  resendButtonDisabled: {
    backgroundColor: '#818CF8',
  },
  resendButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PendingCustomers; 
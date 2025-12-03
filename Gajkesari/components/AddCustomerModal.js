import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Select from '../Select';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const indianStates = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  // Add other states here
];

const AddCustomerModal = ({ isVisible, onClose, authToken, onCustomerCreated }) => {
  const [selectedState, setSelectedState] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomerDetails, setNewCustomerDetails] = useState({
    storeName: '',
    clientFirstName: '',
    clientLastName: '',
    primaryContact: '',
    city: '',
    state: '',
    village: '',
    taluka: '',
  });

  const handleCreateCustomer = async () => {
    if (isCreating) return;
    
    const { primaryContact, storeName } = newCustomerDetails;

    if (!storeName.trim()) {
      Alert.alert('Error', 'Store name cannot be empty.');
      return;
    }

    if (!/^\d{10}$/.test(primaryContact)) {
      Alert.alert('Error', 'Phone number must be 10 digits and numeric without spaces.');
      return;
    }

    setIsCreating(true);
    
    try {
      const response = await axios.get(`https://api.gajkesaristeels.in/store/getByPhone?phone=${primaryContact}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data && response.data.storeId) {
        Alert.alert('Error', 'A customer with the same phone number already exists.');
      } else {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const payload = {
          ...newCustomerDetails,
          subDistrict: newCustomerDetails.village,
          district: newCustomerDetails.taluka,
          employeeId: employeeId,
        };
        delete payload.village;
        delete payload.taluka;

        const createResponse = await axios.post('https://api.gajkesaristeels.in/store/create', payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const newCustomerId = createResponse.data;
        onClose();
        onCustomerCreated(newCustomerId);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      Alert.alert('Error', 'An error occurred while creating the customer. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <ScrollView>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.backButton} onPress={onClose}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create New Customer</Text>
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Store Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Name of the store"
                value={newCustomerDetails.storeName}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, storeName: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Client First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name of the client"
                value={newCustomerDetails.clientFirstName}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, clientFirstName: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Client Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name of the client"
                value={newCustomerDetails.clientLastName}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, clientLastName: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="Primary phone number"
                value={newCustomerDetails.primaryContact}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, primaryContact: text })}
                keyboardType="phone-pad"
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Village</Text>
              <TextInput
                style={styles.input}
                placeholder="Village"
                value={newCustomerDetails.village}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, village: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Taluka</Text>
              <TextInput
                style={styles.input}
                placeholder="Taluka"
                value={newCustomerDetails.taluka}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, taluka: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={newCustomerDetails.city}
                onChangeText={(text) => setNewCustomerDetails({ ...newCustomerDetails, city: text })}
              />
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>State</Text>
              <Select
                options={indianStates}
                placeholder="Select a state"
                onSelect={(option) => {
                  setSelectedState(option.value);
                  setNewCustomerDetails({ ...newCustomerDetails, state: option.value });
                }}
                selectedOption={selectedState ? { label: selectedState, value: selectedState } : null}
              />
            </View>

            <TouchableOpacity 
              style={[styles.createButton, isCreating && styles.buttonDisabled]} 
              onPress={handleCreateCustomer}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Create Customer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  createButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AddCustomerModal;

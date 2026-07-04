import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, Alert, TextInput, KeyboardAvoidingView, Platform, Modal, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Select from './Select';
import NetInfo from '@react-native-community/netinfo';
import { storePendingCustomer, getPendingCustomers } from './utils/offlineStorage';
import DatePicker from './DatePicker';
import { format } from 'date-fns';

const indianStates = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  { label: 'Arunachal Pradesh', value: 'Arunachal Pradesh' },
  { label: 'Assam', value: 'Assam' },
  { label: 'Bihar', value: 'Bihar' },
  { label: 'Chhattisgarh', value: 'Chhattisgarh' },
  { label: 'Goa', value: 'Goa' },
  { label: 'Gujarat', value: 'Gujarat' },
  { label: 'Haryana', value: 'Haryana' },
  { label: 'Himachal Pradesh', value: 'Himachal Pradesh' },
  { label: 'Jharkhand', value: 'Jharkhand' },
  { label: 'Karnataka', value: 'Karnataka' },
  { label: 'Kerala', value: 'Kerala' },
  { label: 'Madhya Pradesh', value: 'Madhya Pradesh' },
  { label: 'Maharashtra', value: 'Maharashtra' },
  { label: 'Manipur', value: 'Manipur' },
  { label: 'Meghalaya', value: 'Meghalaya' },
  { label: 'Mizoram', value: 'Mizoram' },
  { label: 'Nagaland', value: 'Nagaland' },
  { label: 'Odisha', value: 'Odisha' },
  { label: 'Punjab', value: 'Punjab' },
  { label: 'Rajasthan', value: 'Rajasthan' },
  { label: 'Sikkim', value: 'Sikkim' },
  { label: 'Tamil Nadu', value: 'Tamil Nadu' },
  { label: 'Telangana', value: 'Telangana' },
  { label: 'Tripura', value: 'Tripura' },
  { label: 'Uttar Pradesh', value: 'Uttar Pradesh' },
  { label: 'Uttarakhand', value: 'Uttarakhand' },
  { label: 'West Bengal', value: 'West Bengal' },
  { label: 'Andaman and Nicobar Islands', value: 'Andaman and Nicobar Islands' },
  { label: 'Chandigarh', value: 'Chandigarh' },
  { label: 'Dadra and Nagar Haveli and Daman and Diu', value: 'Dadra and Nagar Haveli and Daman and Diu' },
  { label: 'Delhi', value: 'Delhi' },
  { label: 'Jammu and Kashmir', value: 'Jammu and Kashmir' },
  { label: 'Ladakh', value: 'Ladakh' },
  { label: 'Lakshadweep', value: 'Lakshadweep' },
  { label: 'Puducherry', value: 'Puducherry' },
];

const clientTypeOptions = [
  { label: 'Shop', value: 'shop' },
  { label: 'Site Visit', value: 'site visit' },
  { label: 'Architect', value: 'architect' },
  { label: 'Engineer', value: 'engineer' },
  { label: 'Builder', value: 'builder' },
  { label: 'Others', value: 'others' },
];

const CreateCustomerComponent = ({ isVisible, onClose, authToken, onCustomerCreated, navigation }) => {
    const [newCustomerDetails, setNewCustomerDetails] = useState({
      storeName: '',
      clientFirstName: '',
      clientLastName: '',
      primaryContact: '',
      city: '',
      state: '',
      village: '',
      taluka: '',
      clientType: '',
      customClientType: '',
      dob: '',
    });
  
    const [selectedState, setSelectedState] = useState(null);
    const [selectedClientType, setSelectedClientType] = useState('');
    const [errors, setErrors] = useState({});
    const [existingCustomer, setExistingCustomer] = useState(null);
    const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
    const [bottomSheetAnimation] = useState(new Animated.Value(0));
    const [isCreating, setIsCreating] = useState(false);
    const [isDobPickerVisible, setIsDobPickerVisible] = useState(false);
  
    useEffect(() => {
      if (isVisible) {
        resetForm();
      }
    }, [isVisible]);
  
    const resetForm = () => {
      setNewCustomerDetails({
        storeName: '',
        clientFirstName: '',
        clientLastName: '',
        primaryContact: '',
        city: '',
        state: '',
        village: '',
        taluka: '',
        clientType: '',
        customClientType: '',
        dob: '',
      });
      setSelectedState(null);
      setSelectedClientType('');
      setErrors({});
      setExistingCustomer(null);
      setIsBottomSheetVisible(false);
    };
  
    const handleClose = () => {
      resetForm();
      onClose();
    };
  
    const handleInputChange = (name, value) => {
      setNewCustomerDetails(prev => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    };
  
    const handleCreateCustomer = async () => {
      const newErrors = {};
      Object.keys(newCustomerDetails).forEach(key => {
        if (!newCustomerDetails[key] && key !== 'customClientType' && key !== 'dob') {
          newErrors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
        }
      });
  
      if (!/^\d{10}$/.test(newCustomerDetails.primaryContact)) {
        newErrors.primaryContact = 'Invalid phone number';
      }
  
      if (!newCustomerDetails.clientType) {
        newErrors.clientType = 'Client Type is required';
      }
  
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
  
      setIsCreating(true);
      try {
        const response = await axios.get(`https://api.gajkesaristeels.in/store/getByPhone?phone=${newCustomerDetails.primaryContact}`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
  
        if (response.data && response.data.storeId) {
          setExistingCustomer(response.data);
          showBottomSheet();
        } else {
          await createNewCustomer();
        }
      } catch (error) {
        console.error('Error checking existing customer:', error);
        // Handle network errors by storing locally
        if (!error.response || error.message === 'Network Error') {
          await handleOfflineStorage();
        } else {
          // For any other error (including 406 Store Not Found and other errors),
          // proceed with creating new customer since we couldn't definitively confirm existence
          console.log('Could not confirm existing customer, proceeding with creation');
          await createNewCustomer();
        }
      } finally {
        setIsCreating(false);
      }
    };
  
    const handleOfflineStorage = async () => {
      const stored = await storePendingCustomer(newCustomerDetails);
      if (stored) {
        Alert.alert(
          'Network Error',
          'Customer details have been saved locally. They will be created when internet connection is available.',
          [{ text: 'OK', onPress: () => {
            handleClose();
            onCustomerCreated();
          }}]
        );
      } else {
        // Check pending customers to see if it failed due to duplicate
        const pendingCustomers = await getPendingCustomers();
        const isDuplicate = pendingCustomers.some(
          customer => customer.primaryContact === newCustomerDetails.primaryContact
        );

        if (isDuplicate) {
          Alert.alert(
            'Duplicate Customer',
            'A customer with this phone number is already pending for creation. Please check the pending requests list.'
          );
        } else {
          Alert.alert('Error', 'Failed to save customer details locally');
        }
      }
    };
  
    const createNewCustomer = async () => {
      try {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const payload = {
          ...newCustomerDetails,
          subDistrict: newCustomerDetails.village,
          district: newCustomerDetails.taluka,
          employeeId: employeeId,
          clientType: newCustomerDetails.clientType === 'others' ? newCustomerDetails.customClientType : newCustomerDetails.clientType,
        };
        delete payload.village;
        delete payload.taluka;
        delete payload.customClientType;
        if (!payload.dob) {
          delete payload.dob;
        }

        console.log('Create Store Payload (POST /store/create):', JSON.stringify(payload, null, 2));

        const createResponse = await axios.post('https://api.gajkesaristeels.in/store/create', payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        console.log('Create Store Response (POST /store/create):', JSON.stringify(createResponse.data, null, 2));

        const newCustomerId = createResponse.data;
        Alert.alert("Success", "Customer created successfully!");
        handleClose();
        onCustomerCreated();
        navigation.navigate('Customer', {
          screen: 'CustomerDetails',
          params: { customerId: newCustomerId, authToken }
        });
      } catch (error) {
        console.error('Error creating customer:', error);
        if (!error.response || error.message === 'Network Error') {
          await handleOfflineStorage();
        } else {
          Alert.alert('Error', 'An error occurred while creating the customer. Please try again.');
        }
      }
    };
  
    const showBottomSheet = () => {
      setIsBottomSheetVisible(true);
      Animated.timing(bottomSheetAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
  
    const hideBottomSheet = () => {
      Animated.timing(bottomSheetAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsBottomSheetVisible(false));
    };
  
    const renderInput = (name, label, keyboardType = 'default') => (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, errors[name] && styles.inputError]}
          value={newCustomerDetails[name]}
          onChangeText={(text) => handleInputChange(name, text)}
          keyboardType={keyboardType}
          placeholder={`Enter ${label.toLowerCase()}`}
        />
        {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
      </View>
    );
  
    const renderExistingCustomerBottomSheet = () => {
      const translateY = bottomSheetAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [300, 0],
      });
  
      return (
        <Modal
          transparent={true}
          visible={isBottomSheetVisible}
          onRequestClose={hideBottomSheet}
          animationType="fade"
        >
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity style={styles.bottomSheetBackdrop} onPress={hideBottomSheet} />
            <Animated.View
              style={[
                styles.bottomSheetContainer,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              <View style={styles.bottomSheetContent}>
                <Text style={styles.bottomSheetTitle}>Existing Customer Found</Text>
                {existingCustomer && (
                  <View style={styles.existingCustomerInfo}>
                    <Text style={styles.existingCustomerName}>{existingCustomer.storeName}</Text>
                    <Text style={styles.existingCustomerDetail}>{`${existingCustomer.clientFirstName} ${existingCustomer.clientLastName}`}</Text>
                    <Text style={styles.existingCustomerDetail}>{existingCustomer.primaryContact}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.viewCustomerButton}
                  onPress={() => {
                    hideBottomSheet();
                    handleClose();
                    navigation.navigate('Customer', {
                      screen: 'CustomerDetails',
                      params: { customerId: existingCustomer.storeId, authToken }
                    });
                  }}
                >
                  <Text style={styles.viewCustomerButtonText}>View Customer Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={hideBottomSheet}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      );
    };
  
    return (
      <Modal visible={isVisible} animationType="slide" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <ScrollView>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <TouchableOpacity style={styles.backButton} onPress={handleClose}>
                  <Ionicons name="arrow-back" size={24} color="#1F2937" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Create New Customer</Text>
              </View>
  
              {renderInput('storeName', 'Store Name*')}
              {renderInput('clientFirstName', 'Client First Name*')}
              {renderInput('clientLastName', 'Client Last Name*')}
              {renderInput('primaryContact', 'Phone number*', 'phone-pad')}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth (optional)</Text>
                <View style={styles.dobRow}>
                  <TouchableOpacity
                    style={[styles.input, styles.dobInput]}
                    onPress={() => setIsDobPickerVisible(true)}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: newCustomerDetails.dob ? '#1F2937' : '#9CA3AF',
                      }}
                    >
                      {newCustomerDetails.dob
                        ? (() => {
                            try {
                              const date = new Date(newCustomerDetails.dob);
                              if (isNaN(date.getTime())) return newCustomerDetails.dob;
                              return format(date, 'dd MMM yyyy');
                            } catch {
                              return newCustomerDetails.dob;
                            }
                          })()
                        : 'Select date (optional)'}
                    </Text>
                  </TouchableOpacity>
                  {!!newCustomerDetails.dob && (
                    <TouchableOpacity
                      style={styles.dobClearButton}
                      onPress={() => handleInputChange('dob', '')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear date of birth"
                    >
                      <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {renderInput('village', 'Village*')}
              {renderInput('taluka', 'Taluka*')}
              {renderInput('city', 'City*')}
  
              <View style={styles.inputContainer}>
                <Text style={styles.label}>State*</Text>
                <Select
                  options={indianStates}
                  placeholder="Select a state"
                  onSelect={(option) => {
                    setSelectedState(option.value);
                    handleInputChange('state', option.value);
                  }}
                  selectedOption={selectedState ? { label: selectedState, value: selectedState } : null}
                  style={[errors.state && styles.inputError]}
                />
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>
  
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Client Type*</Text>
                <Select
                  options={clientTypeOptions}
                  placeholder="Select a client type"
                  onSelect={(option) => {
                    setSelectedClientType(option.value);
                    handleInputChange('clientType', option.value);
                  }}
                  selectedOption={selectedClientType ? { label: selectedClientType, value: selectedClientType } : null}
                  style={[errors.clientType && styles.inputError]}
                />
                {errors.clientType && <Text style={styles.errorText}>{errors.clientType}</Text>}
              </View>
  
              {selectedClientType === 'others' && renderInput('customClientType', 'Custom Client Type*')}
  
              <TouchableOpacity 
                style={[styles.createButton, isCreating && styles.createButtonDisabled]} 
                onPress={handleCreateCustomer}
                disabled={isCreating}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={isCreating ? 'Creating customer' : 'Create customer'}
              >
                <View style={styles.createButtonContent}>
                  {isCreating && (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                      style={styles.createButtonSpinner}
                    />
                  )}
                  <Text style={styles.createButtonText}>
                    {isCreating ? 'Creating...' : 'Create Customer'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <DatePicker
            isVisible={isDobPickerVisible}
            onClose={() => setIsDobPickerVisible(false)}
            onSelect={(date) => {
              const isoDate = format(date, 'yyyy-MM-dd');
              handleInputChange('dob', isoDate);
              setIsDobPickerVisible(false);
            }}
            allowPast
          />
        </KeyboardAvoidingView>
        {renderExistingCustomerBottomSheet()}
      </Modal>
    );
  };
  
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 24,
      paddingTop: 40,
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
    dobRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dobInput: {
      flex: 1,
    },
    dobClearButton: {
      marginLeft: 10,
      padding: 6,
    },
    inputError: {
      borderColor: '#EF4444',
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      marginTop: 4,
    },
    createButton: {
      backgroundColor: '#4F46E5',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginTop: 24,
      marginBottom: 40,
    },
    createButtonDisabled: {
      opacity: 0.7,
    },
    createButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    createButtonSpinner: {
      marginRight: 10,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    bottomSheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    bottomSheetBackdrop: {
      flex: 1,
    },
    bottomSheetContainer: {
      backgroundColor: 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    bottomSheetContent: {
      // Content styles
    },
    bottomSheetTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 16,
    },
    existingCustomerInfo: {
      marginBottom: 20,
    },
    existingCustomerName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1F2937',
      marginBottom: 8,
    },
    existingCustomerDetail: {
      fontSize: 16,
      color: '#4B5563',
      marginBottom: 4,
    },
    viewCustomerButton: {
      backgroundColor: '#4F46E5',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
      marginBottom: 12,
    },
    viewCustomerButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    cancelButton: {
      backgroundColor: '#E5E7EB',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 24,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#4B5563',
    },
  });
  
  export default CreateCustomerComponent;

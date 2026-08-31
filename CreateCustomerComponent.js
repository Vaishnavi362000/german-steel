import { API_BASE_URL } from './config/api';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { CLIENT_TYPE_OPTIONS, YEAR_OF_JOINING_OPTIONS } from './clientTypeOptions';
import { applyMissingLocationDefaults, fetchEmployeeStoreLocationDefaults } from './utils/storeLocationPrefill';

import { fetchStates, fetchDistricts, fetchCities, fetchVillages, fetchCityHierarchy } from './utils/locationMasterApi';

const CreateCustomerComponent = ({ isVisible, onClose, authToken, onCustomerCreated, navigation }) => {
  const insets = useSafeAreaInsets();
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
    yearOfJoining: '',
  });

  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [villages, setVillages] = useState([]);

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedClientType, setSelectedClientType] = useState('');
  const [errors, setErrors] = useState({});
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [bottomSheetAnimation] = useState(new Animated.Value(0));
  const [isCreating, setIsCreating] = useState(false);
  const [isDobPickerVisible, setIsDobPickerVisible] = useState(false);

  // Initial load: Fetch states and try to prefill from employee defaults
  useEffect(() => {
    if (isVisible) {
      resetForm();
      loadInitialData();
    }
  }, [isVisible, authToken]);

  const loadInitialData = async () => {
    setIsLoadingLocation(true);
    try {
      const statesData = await fetchStates(authToken);
      setStates(statesData);

      const employeeId = await AsyncStorage.getItem('employeeId');
      const defaults = await fetchEmployeeStoreLocationDefaults({ employeeId, authToken });

      if (defaults && Object.keys(defaults).length > 0) {
        setNewCustomerDetails((current) => applyMissingLocationDefaults(current, defaults));

        // Prefill logic using IDs if available for full cascade resolution
        if (defaults.ids && defaults.ids.cityId) {
          const hierarchy = await fetchCityHierarchy(authToken, defaults.ids.cityId);
          if (hierarchy) {
            setSelectedState({ label: hierarchy.state.name, value: hierarchy.state.id, ...hierarchy.state });

            const dists = await fetchDistricts(authToken, hierarchy.state.id);
            setDistricts(dists);
            setSelectedDistrict({ label: hierarchy.district.name, value: hierarchy.district.id, ...hierarchy.district });

            const cits = await fetchCities(authToken, hierarchy.district.id);
            setCities(cits);
            setSelectedCity({ label: hierarchy.city.name, value: hierarchy.city.id, ...hierarchy.city });

            const vills = await fetchVillages(authToken, hierarchy.city.id);
            setVillages(vills);
          }
        } else if (defaults.state) {
          // Fallback if only text defaults are available
          const matchedState = statesData.find(s => s.label === defaults.state);
          if (matchedState) {
            setSelectedState(matchedState);
            const dists = await fetchDistricts(authToken, matchedState.value);
            setDistricts(dists);

            if (defaults.taluka) {
              const matchedDistrict = dists.find(d => d.label === defaults.taluka);
              if (matchedDistrict) {
                setSelectedDistrict(matchedDistrict);
                const cits = await fetchCities(authToken, matchedDistrict.value);
                setCities(cits);
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Location load/prefill unavailable:', error?.message || error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Cascade handlers
  const handleStateSelect = async (option) => {
    setSelectedState(option);
    handleInputChange('state', option ? option.label : '');

    // Reset downstream
    setSelectedDistrict(null);
    handleInputChange('taluka', '');
    setDistricts([]);

    setSelectedCity(null);
    handleInputChange('city', '');
    setCities([]);

    setSelectedVillage(null);
    handleInputChange('village', '');
    setVillages([]);

    if (option) {
      setIsLoadingLocation(true);
      try {
        const data = await fetchDistricts(authToken, option.value);
        setDistricts(data);
      } catch (e) {
        console.error("Failed to load districts", e);
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  const handleDistrictSelect = async (option) => {
    setSelectedDistrict(option);
    handleInputChange('taluka', option ? option.label : '');

    // Reset downstream
    setSelectedCity(null);
    handleInputChange('city', '');
    setCities([]);

    setSelectedVillage(null);
    handleInputChange('village', '');
    setVillages([]);

    if (option) {
      setIsLoadingLocation(true);
      try {
        const data = await fetchCities(authToken, option.value);
        setCities(data);
      } catch (e) {
        console.error("Failed to load cities", e);
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  const handleCitySelect = async (option) => {
    setSelectedCity(option);
    handleInputChange('city', option ? option.label : '');

    // Reset downstream
    setSelectedVillage(null);
    handleInputChange('village', '');
    setVillages([]);

    if (option) {
      setIsLoadingLocation(true);
      try {
        const data = await fetchVillages(authToken, option.value);
        setVillages(data);
      } catch (e) {
        console.error("Failed to load villages", e);
      } finally {
        setIsLoadingLocation(false);
      }
    }
  };

  const handleVillageSelect = (option) => {
    setSelectedVillage(option);
    handleInputChange('village', option ? option.label : '');
  };

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
      yearOfJoining: '',
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
      if (!newCustomerDetails[key] && key !== 'customClientType' && key !== 'dob' && key !== 'yearOfJoining') {
        newErrors[key] = `${key.charAt(0).toUpperCase() + key.slice(1)} is required`;
      }
    });

    if (!/^\d{10}$/.test(newCustomerDetails.primaryContact)) {
      newErrors.primaryContact = 'Invalid phone number';
    }

    if (!newCustomerDetails.clientType) {
      newErrors.clientType = 'Client Type is required';
    }

    if (newCustomerDetails.yearOfJoining && !/^\d{4}$/.test(String(newCustomerDetails.yearOfJoining))) {
      newErrors.yearOfJoining = 'Choose a valid year';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsCreating(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/store/getByPhone?phone=${newCustomerDetails.primaryContact}`, {
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
        [{
          text: 'OK', onPress: () => {
            handleClose();
            onCustomerCreated();
          }
        }]
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
        yearOfJoining: newCustomerDetails.yearOfJoining ? Number(newCustomerDetails.yearOfJoining) : undefined,
      };
      delete payload.village;
      delete payload.taluka;
      delete payload.customClientType;
      if (!payload.dob) {
        delete payload.dob;
      }
      if (!payload.yearOfJoining) delete payload.yearOfJoining;

      console.log('Create Store Payload (POST /store/create):', JSON.stringify(payload, null, 2));

      const createResponse = await axios.post(`${API_BASE_URL}/store/create`, payload, {
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

  const inputIcons = {
    storeName: 'storefront-outline',
    clientFirstName: 'person-outline',
    clientLastName: 'person-outline',
    primaryContact: 'call-outline',
    village: 'location-outline',
    taluka: 'map-outline',
    city: 'business-outline',
    customClientType: 'pricetag-outline',
  };

  const renderInput = (name, label, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, errors[name] && styles.inputError]}>
        <View style={styles.inputIconWrap}>
          <Ionicons name={inputIcons[name] || 'create-outline'} size={18} color="#625BF5" />
        </View>
        <TextInput
          style={styles.textInput}
          value={newCustomerDetails[name]}
          onChangeText={(text) => handleInputChange(name, text)}
          keyboardType={keyboardType}
          placeholder={`Enter ${label.replace('*', '').toLowerCase()}`}
          placeholderTextColor="#9AA2B1"
          autoCapitalize={keyboardType === 'phone-pad' ? 'none' : 'words'}
        />
      </View>
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
              { paddingBottom: Math.max(insets.bottom, 24) },
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
    <Modal visible={isVisible} animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close create customer"
            >
              <Ionicons name="arrow-back" size={21} color="#2A3140" />
            </TouchableOpacity>
            <View style={styles.headerCopy}>
              <Text style={styles.modalTitle}>Create Customer</Text>
              <Text style={styles.modalSubtitle}>Add a store and its primary contact</Text>
            </View>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={21} color="#2A3140" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            <View style={styles.formSectionCard}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="storefront-outline" size={18} color="#625BF5" />
                <Text style={styles.formSectionTitle}>Store & contact</Text>
              </View>
              {renderInput('storeName', 'Store Name*')}
              {renderInput('clientFirstName', 'Client First Name*')}
              {renderInput('clientLastName', 'Client Last Name*')}
              {renderInput('primaryContact', 'Phone number*', 'phone-pad')}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Date of Birth (optional)</Text>
                <View style={styles.dobRow}>
                  <TouchableOpacity
                    style={[styles.inputShell, styles.dobInput]}
                    onPress={() => setIsDobPickerVisible(true)}
                  >
                    <View style={styles.inputIconWrap}>
                      <Ionicons name="calendar-outline" size={18} color="#625BF5" />
                    </View>
                    <Text style={[styles.dateValue, !newCustomerDetails.dob && styles.datePlaceholder]}>
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
                    <Ionicons name="chevron-down" size={18} color="#7C8494" />
                  </TouchableOpacity>
                  {!!newCustomerDetails.dob && (
                    <TouchableOpacity
                      style={styles.dobClearButton}
                      onPress={() => handleInputChange('dob', '')}
                      accessibilityRole="button"
                      accessibilityLabel="Clear date of birth"
                    >
                      <Ionicons name="close-circle" size={20} color="#9AA2B1" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Year of Joining (optional)</Text>
                <Select
                  options={YEAR_OF_JOINING_OPTIONS}
                  placeholder="Select year"
                  onSelect={(option) => handleInputChange('yearOfJoining', option.value)}
                  selectedOption={newCustomerDetails.yearOfJoining
                    ? { label: String(newCustomerDetails.yearOfJoining), value: Number(newCustomerDetails.yearOfJoining) }
                    : null}
                />
                {errors.yearOfJoining && <Text style={styles.errorText}>{errors.yearOfJoining}</Text>}
              </View>
            </View>
            <View style={styles.formSectionCard}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="location-outline" size={18} color="#625BF5" />
                <Text style={styles.formSectionTitle}>Location</Text>
                {isLoadingLocation && <ActivityIndicator size="small" color="#625BF5" style={{ marginLeft: 8 }} />}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>State*</Text>
                <Select
                  options={states}
                  placeholder={states.length === 0 ? "Loading states..." : "Select a state"}
                  onSelect={handleStateSelect}
                  selectedOption={selectedState}
                />
                {errors.state && <Text style={styles.errorText}>{errors.state}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>District*</Text>
                <Select
                  options={districts}
                  placeholder={!selectedState ? "Select state first" : districts.length === 0 ? "Loading districts..." : "Select a district"}
                  onSelect={handleDistrictSelect}
                  selectedOption={selectedDistrict}
                />
                {errors.taluka && <Text style={styles.errorText}>{errors.taluka}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>City*</Text>
                <Select
                  options={cities}
                  placeholder={!selectedDistrict ? "Select district first" : cities.length === 0 ? "Loading cities..." : "Select a city"}
                  onSelect={handleCitySelect}
                  selectedOption={selectedCity}
                />
                {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Village*</Text>
                <Select
                  options={villages}
                  placeholder={!selectedCity ? "Select city first" : villages.length === 0 ? "Loading villages..." : "Select a village"}
                  onSelect={handleVillageSelect}
                  selectedOption={selectedVillage}
                />
                {errors.village && <Text style={styles.errorText}>{errors.village}</Text>}
              </View>
            </View>

            <View style={[styles.formSectionCard, styles.formSectionCardLast]}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="people-outline" size={18} color="#625BF5" />
                <Text style={styles.formSectionTitle}>Customer type</Text>
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Client Type*</Text>
                <Select
                  options={CLIENT_TYPE_OPTIONS}
                  placeholder="Select a client type"
                  onSelect={(option) => {
                    setSelectedClientType(option.value);
                    handleInputChange('clientType', option.value);
                  }}
                  selectedOption={selectedClientType ? { label: selectedClientType, value: selectedClientType } : null}
                />
                {errors.clientType && <Text style={styles.errorText}>{errors.clientType}</Text>}
              </View>
              {selectedClientType === 'others' && renderInput('customClientType', 'Custom Client Type*')}
            </View>

            <TouchableOpacity
              style={[styles.createButton, isCreating && styles.createButtonDisabled]}
              onPress={handleCreateCustomer}
              disabled={isCreating}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isCreating ? 'Creating customer' : 'Create customer'}
            >
              <View style={styles.createButtonContent}>
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={styles.createButtonSpinner} />
                ) : (
                  <Ionicons name="person-add-outline" size={19} color="#FFFFFF" style={styles.createButtonSpinner} />
                )}
                <Text style={styles.createButtonText}>{isCreating ? 'Creating...' : 'Create Customer'}</Text>
              </View>
            </TouchableOpacity>
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
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#F6F7FB',
  },
  modalHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEEF5',
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F2FF',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    color: '#202838',
  },
  modalSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#7C8494',
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },
  formIntroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E3E4FF',
    borderRadius: 16,
    backgroundColor: '#F4F4FF',
  },
  formIntroIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  formIntroCopy: {
    flex: 1,
  },
  formIntroTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    color: '#313A4C',
  },
  formIntroText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#737C8E',
  },
  formSectionCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#E7E9F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  formSectionCardLast: {
    marginBottom: 2,
  },
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 12,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333C4E',
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    marginBottom: 7,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#4C5669',
  },
  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E4ED',
    borderRadius: 12,
    paddingRight: 12,
    backgroundColor: '#FBFCFE',
  },
  inputIconWrap: {
    width: 44,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    backgroundColor: '#F1F2FF',
  },
  textInput: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#222A39',
  },
  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dobInput: {
    flex: 1,
  },
  dateValue: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    color: '#222A39',
  },
  datePlaceholder: {
    color: '#9AA2B1',
  },
  dobClearButton: {
    marginLeft: 8,
    padding: 6,
  },
  inputError: {
    borderColor: '#E65050',
    backgroundColor: '#FFF8F8',
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: '#D83C3C',
  },
  createButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#625BF5',
    marginTop: 2,
    boxShadow: '0 8px 16px rgba(79, 70, 229, 0.24)',
  },
  createButtonDisabled: {
    opacity: 0.65,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonSpinner: {
    marginRight: 9,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '800',
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

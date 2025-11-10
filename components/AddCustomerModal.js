import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomDropdown from '../screens/CustomDropdown';
import DobPicker from '../screens/DobPicker';

const indianStates = [
  { label: 'Andhra Pradesh', value: 'Andhra Pradesh' },
  // Add other states here
];

const clientTypeOptions = [
  { label: 'Engineer/Architect/Contractor', value: 'Professional' },
  { label: 'Dealer/Shop', value: 'Dealer' },
  { label: 'Site Visit', value: 'Site Visit' },
];

const dealerTypeOptions = [
  { label: 'ICON', value: 'ICON' },
  { label: 'NON_ICON', value: 'NON_ICON' },
];

const dealerSubTypeOptions = [
  { label: 'EXCLUSIVE', value: 'EXCLUSIVE' },
  { label: 'NON_EXCLUSIVE', value: 'NON_EXCLUSIVE' },
];

const shopOwnershipOptions = [
  { label: 'Owned', value: 'OWNED' },
  { label: 'Rented', value: 'RENTED' },
];

const projectTypeOptions = [
  { label: 'Home', value: 'HOME' },
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Govt Project', value: 'GOVT_PROJECT' },
  { label: 'Commercial Building', value: 'COMMERCIAL' },
  { label: 'Industrial', value: 'INDUSTRIAL' },
  { label: 'Others', value: 'OTHERS' },
];

const AddCustomerModal = ({ isVisible, onClose, authToken, onCustomerCreated }) => {
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedClientType, setSelectedClientType] = useState('');
  const [selectedShopOwnership, setSelectedShopOwnership] = useState(null);
  const [selectedDealerType, setSelectedDealerType] = useState(null);
  const [selectedDealerSubType, setSelectedDealerSubType] = useState(null);
  const [selectedProjectType, setSelectedProjectType] = useState(null);
  const [isDobPickerVisible, setIsDobPickerVisible] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [errors, setErrors] = useState({});

  // Location dropdown data
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [newCustomerDetails, setNewCustomerDetails] = useState({
    storeName: '',
    clientFirstName: '',
    clientLastName: '',
    primaryContact: '',
    city: '',
    state: '',
    village: '',
    taluka: '',
    latitude: '',
    longitude: '',
    clientType: '',
    // Dealer/Shop specific fields
    shopAgeYears: '',
    ownershipType: '',
    dealerType: '',
    dealerSubType: '',
    // Engineer/Architect/Contractor specific fields
    firmName: '',
    dateOfBirth: '',
    yearsOfExperience: '',
    email: '',
    // Site Visit specific fields
    siteOwner: '',
    contractorName: '',
    engineerName: '',
    projectType: '',
    projectSize: '',
  });

  const handleInputChange = (name, value) => {
    setNewCustomerDetails(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDobSelect = (date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    setNewCustomerDetails(prev => ({ ...prev, dateOfBirth: formattedDate }));
    setIsDobPickerVisible(false);
    if (errors.dateOfBirth) {
      setErrors(prev => ({ ...prev, dateOfBirth: '' }));
    }
  };

  // Location data fetching functions
  const fetchStates = async () => {
    try {
      setLoadingStates(true);
      const response = await axios.get('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/location/states', {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      const statesData = Array.isArray(response.data) ? response.data : [];
      setStates(statesData.map(state => ({ label: state, value: state })));
    } catch (error) {
      console.error('Error fetching states:', error);
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchDistricts = async (selectedState) => {
    if (!selectedState) {
      setDistricts([]);
      return;
    }
    try {
      setLoadingDistricts(true);
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/location/districts?state=${selectedState}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'IconMobile',
        },
      });
      const districtsData = Array.isArray(response.data) ? response.data : [];
      setDistricts(districtsData.map(district => ({ label: district, value: district })));
    } catch (error) {
      console.error('Error fetching districts:', error);
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  // Fetch states when modal opens
  useEffect(() => {
    if (isVisible) {
      fetchStates();
    }
  }, [isVisible]);

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState);
      // Clear dependent fields when state changes
      setSelectedDistrict(null);
    } else {
      setDistricts([]);
    }

    setNewCustomerDetails(prev => ({
      ...prev,
      district: '',
      city: '',
    }));

    setErrors(prev => ({
      ...prev,
      district: '',
      city: '',
    }));
  }, [selectedState]);

  const resetLocationData = () => {
    setSelectedState(null);
    setSelectedDistrict(null);
    setDistricts([]);
    handleInputChange('state', '');
    handleInputChange('district', '');
    handleInputChange('city', '');
  };

  const fetchCurrentLocation = async () => {
    try {
      setFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to capture GPS coordinates');
        setFetchingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setNewCustomerDetails(prev => ({
        ...prev,
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      }));
      
      if (errors.gpsLocation) {
        setErrors(prev => ({ ...prev, gpsLocation: '' }));
      }
      
      Alert.alert('Success', 'GPS coordinates captured successfully!');
    } catch (error) {
      console.error('Error fetching location:', error);
      Alert.alert('Error', 'Failed to fetch GPS coordinates. Please try again.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleCreateCustomer = async () => {
    const { primaryContact, storeName, clientType } = newCustomerDetails;

    // Required fields validation
    const newErrors = {};
    
    const requiredFields = ['storeName', 'clientFirstName', 'clientLastName', 'primaryContact', 'village', 'taluka', 'city', 'clientType'];
    
    requiredFields.forEach(field => {
      if (!newCustomerDetails[field]) {
        newErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')} is required`;
      }
    });

    if (!/^\d{10}$/.test(primaryContact)) {
      newErrors.primaryContact = 'Invalid phone number (must be 10 digits)';
    }

    // GPS coordinates are required for all customer types
    if (!newCustomerDetails.latitude || !newCustomerDetails.longitude) {
      newErrors.gpsLocation = 'GPS coordinates are required';
    }

    // Additional validation for Engineer/Architect/Contractor
    if (clientType === 'Professional') {
      if (!newCustomerDetails.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      }
      if (!newCustomerDetails.yearsOfExperience) {
        newErrors.yearsOfExperience = 'Years of experience is required';
      }
    }

    // Additional validation for Dealer/Shop
    if (clientType === 'Dealer') {
      if (!newCustomerDetails.shopAgeYears) {
        newErrors.shopAgeYears = 'Shop age is required for Dealer/Shop';
      }
      if (!newCustomerDetails.ownershipType) {
        newErrors.ownershipType = 'Shop ownership type is required';
      }
      if (!newCustomerDetails.dealerType) {
        newErrors.dealerType = 'Dealer type is required';
      }
      if (!newCustomerDetails.dealerSubType) {
        newErrors.dealerSubType = 'Dealer sub-type is required';
      }
    }

    // Additional validation for Site Visit
    if (clientType === 'Site Visit') {
      if (!newCustomerDetails.siteOwner) {
        newErrors.siteOwner = 'Site owner is required';
      }
      if (!newCustomerDetails.projectType) {
        newErrors.projectType = 'Project type is required';
      }
      if (!newCustomerDetails.projectSize) {
        newErrors.projectSize = 'Project size is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.get(`https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/getByPhone?phone=${primaryContact}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.data && response.data.storeId) {
        Alert.alert('Error', 'A customer with the same phone number already exists.');
      } else {
        const employeeId = await AsyncStorage.getItem('employeeId');
        const payload = {
          storeName: newCustomerDetails.storeName,
          clientFirstName: newCustomerDetails.clientFirstName,
          clientLastName: newCustomerDetails.clientLastName,
          primaryContact: parseInt(newCustomerDetails.primaryContact),
          city: newCustomerDetails.city || null,
          state: newCustomerDetails.state,
          district: newCustomerDetails.taluka,
          subDistrict: newCustomerDetails.village,
          latitude: newCustomerDetails.latitude ? parseFloat(newCustomerDetails.latitude) : null,
          longitude: newCustomerDetails.longitude ? parseFloat(newCustomerDetails.longitude) : null,
          clientType: newCustomerDetails.clientType,
          employeeId: parseInt(employeeId),
        };

        // Add Dealer/Shop specific fields
        if (clientType === 'Dealer') {
          if (newCustomerDetails.shopAgeYears) payload.shopAgeYears = parseInt(newCustomerDetails.shopAgeYears);
          if (newCustomerDetails.ownershipType) payload.ownershipType = newCustomerDetails.ownershipType;
          if (newCustomerDetails.dealerType) payload.dealerType = newCustomerDetails.dealerType;
          if (newCustomerDetails.dealerSubType) payload.dealerSubType = newCustomerDetails.dealerSubType;
        }

        // Add Site Visit specific fields
        if (clientType === 'Site Visit') {
          if (newCustomerDetails.siteOwner) payload.siteOwner = newCustomerDetails.siteOwner;
          if (newCustomerDetails.contractorName) payload.contractorName = newCustomerDetails.contractorName;
          if (newCustomerDetails.engineerName) payload.engineerName = newCustomerDetails.engineerName;
          if (newCustomerDetails.projectType) payload.projectType = newCustomerDetails.projectType;
          if (newCustomerDetails.projectSize) payload.projectSize = parseFloat(newCustomerDetails.projectSize);
        }

        // Step 1: Create Store
        const createResponse = await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/store/create', payload, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        const newCustomerId = createResponse.data;
        console.log('✅ [CUSTOMER] Store created with ID:', newCustomerId);

        // Step 2: For Professional customers, create professional record
        if (clientType === 'Professional') {
          try {
            const professionalPayload = {
              name: `${newCustomerDetails.clientFirstName} ${newCustomerDetails.clientLastName}`,
              contact: newCustomerDetails.primaryContact,
              role: 'Professional',
              email: newCustomerDetails.email || null,
              experience: newCustomerDetails.yearsOfExperience ? `${newCustomerDetails.yearsOfExperience} years` : null,
              storeId: newCustomerId,
            };

            console.log('🔵 [PROFESSIONAL] Creating professional record with payload:', professionalPayload);

            await axios.post('https://unbalkingly-uncharged-elizabet.ngrok-free.dev/professionals/addForStore', professionalPayload, {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            });

            console.log('✅ [PROFESSIONAL] Professional record created successfully');
          } catch (professionalError) {
            console.error('⚠️ [PROFESSIONAL] Error creating professional record:', professionalError);
            // Don't fail the whole operation if professional record creation fails
          }
        }

        onClose();
        onCustomerCreated(newCustomerId);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the customer. Please try again.');
    }
  };

  const renderInput = (name, label, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[name] && styles.inputError]}
        value={newCustomerDetails[name]}
        onChangeText={(text) => handleInputChange(name, text)}
        keyboardType={keyboardType}
        placeholder={`Enter ${label.toLowerCase().replace('*', '').trim()}`}
      />
      {errors[name] && <Text style={styles.errorText}>{errors[name]}</Text>}
    </View>
  );

  return (
    <Modal visible={isVisible} animationType="slide" onRequestClose={() => {
      resetLocationData();
      onClose();
    }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
        <ScrollView>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity style={styles.backButton} onPress={() => {
                resetLocationData();
                onClose();
              }}>
                <Ionicons name="arrow-back" size={24} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Create New Customer</Text>
            </View>

            {/* Client Type Dropdown - Must be selected first */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Client Type*</Text>
              <CustomDropdown
                options={clientTypeOptions}
                placeholder="Select a client type"
                onSelect={(option) => {
                  if (option && option.value) {
                    setSelectedClientType(option.value);
                    handleInputChange('clientType', option.value);
                  } else {
                    setSelectedClientType('');
                    handleInputChange('clientType', '');
                  }
                }}
                selectedOption={selectedClientType ? clientTypeOptions.find(o => o.value === selectedClientType) : null}
              />
              {errors.clientType && <Text style={styles.errorText}>{errors.clientType}</Text>}
            </View>

            {/* Basic Information */}
            <Text style={styles.sectionTitle}>Basic Information</Text>
            {renderInput('storeName', 'Store Name*')}
            {renderInput('clientFirstName', 'Client First Name*')}
            {renderInput('clientLastName', 'Client Last Name*')}
            {renderInput('primaryContact', 'Phone number*', 'phone-pad')}

            {/* Location Fields */}
            <Text style={styles.sectionTitle}>Location Details</Text>

            {/* State Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>State*</Text>
              <CustomDropdown
                data={states}
                placeholder={loadingStates ? "Loading states..." : "Select State"}
                value={selectedState}
                onSelect={(value) => {
                  setSelectedState(value);
                  handleInputChange('state', value || '');
                }}
                loading={loadingStates}
              />
            </View>

            {/* District Dropdown */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>District*</Text>
              <CustomDropdown
                data={districts}
                placeholder={loadingDistricts ? "Loading districts..." : "Select District"}
                value={selectedDistrict}
                onSelect={(value) => {
                  setSelectedDistrict(value);
                  handleInputChange('district', value || '');
                }}
                loading={loadingDistricts}
                disabled={!selectedState}
              />
            </View>

            {renderInput('city', 'City*')}

            {renderInput('addressLine1', 'Address Line 1 (Optional)')}

            {/* GPS Coordinates - Required for all customer types */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>GPS Coordinates*</Text>
              <View style={styles.gpsContainer}>
                {newCustomerDetails.latitude && newCustomerDetails.longitude ? (
                  <View style={styles.gpsCoordinates}>
                    <Ionicons name="location" size={20} color="#4F46E5" />
                    <View style={styles.gpsValues}>
                      <Text style={styles.gpsText}>Lat: {parseFloat(newCustomerDetails.latitude).toFixed(6)}</Text>
                      <Text style={styles.gpsText}>Long: {parseFloat(newCustomerDetails.longitude).toFixed(6)}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.gpsPlaceholder}>No GPS coordinates captured</Text>
                )}
                <TouchableOpacity 
                  style={styles.gpsButton}
                  onPress={fetchCurrentLocation}
                  disabled={fetchingLocation}
                >
                  {fetchingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="locate" size={20} color="#FFFFFF" />
                      <Text style={styles.gpsButtonText}>
                        {newCustomerDetails.latitude ? 'Update Location' : 'Capture Location'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {errors.gpsLocation && <Text style={styles.errorText}>{errors.gpsLocation}</Text>}
            </View>

            {/* Engineer/Architect/Contractor Specific Fields */}
            {selectedClientType === 'Professional' && (
              <>
                <View style={styles.professionalSection}>
                  <Text style={styles.sectionTitle}>Professional Details</Text>
                  
                  {renderInput('firmName', 'Firm Name (Optional)')}
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Date of Birth*</Text>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setIsDobPickerVisible(true)}
                    >
                      <Text style={styles.dateButtonText}>
                        {newCustomerDetails.dateOfBirth || 'Select date of birth'}
                      </Text>
                      <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
                  </View>

                  {renderInput('email', 'Email (Optional)')}
                  
                  {renderInput('yearsOfExperience', 'Years of Experience*', 'numeric')}
                </View>
              </>
            )}

            {/* Dealer/Shop Specific Fields */}
            {selectedClientType === 'Dealer' && (
              <>
                <View style={styles.dealerShopSection}>
                  <Text style={styles.sectionTitle}>Dealer/Shop Details</Text>
                  
                  {renderInput('shopAgeYears', 'Shop Age (in years)*', 'numeric')}
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Shop Ownership*</Text>
                    <CustomDropdown
                      options={shopOwnershipOptions}
                      placeholder="Select ownership type"
                      onSelect={(option) => {
                        setSelectedShopOwnership(option);
                        handleInputChange('ownershipType', option ? option.value : '');
                      }}
                      selectedOption={selectedShopOwnership}
                    />
                    {errors.ownershipType && <Text style={styles.errorText}>{errors.ownershipType}</Text>}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Dealer Type*</Text>
                    <CustomDropdown
                      options={dealerTypeOptions}
                      placeholder="Select dealer type"
                      onSelect={(option) => {
                        setSelectedDealerType(option);
                        handleInputChange('dealerType', option ? option.value : '');
                      }}
                      selectedOption={selectedDealerType}
                    />
                    {errors.dealerType && <Text style={styles.errorText}>{errors.dealerType}</Text>}
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Dealer Sub-Type*</Text>
                    <CustomDropdown
                      options={dealerSubTypeOptions}
                      placeholder="Select dealer sub-type"
                      onSelect={(option) => {
                        setSelectedDealerSubType(option);
                        handleInputChange('dealerSubType', option ? option.value : '');
                      }}
                      selectedOption={selectedDealerSubType}
                    />
                    {errors.dealerSubType && <Text style={styles.errorText}>{errors.dealerSubType}</Text>}
                  </View>
                </View>
              </>
            )}

            {/* Site Visit Specific Fields */}
            {selectedClientType === 'Site Visit' && (
              <>
                <View style={styles.siteVisitSection}>
                  <Text style={styles.sectionTitle}>Site Visit Details</Text>
                  
                  {renderInput('siteOwner', 'Site Owner Name*')}
                  
                  {renderInput('contractorName', 'Contractor Name (Optional)')}
                  
                  {renderInput('engineerName', 'Engineer Name (Optional)')}
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Project Type*</Text>
                    <CustomDropdown
                      options={projectTypeOptions}
                      placeholder="Select project type"
                      onSelect={(option) => {
                        setSelectedProjectType(option);
                        handleInputChange('projectType', option ? option.value : '');
                      }}
                      selectedOption={selectedProjectType}
                    />
                    {errors.projectType && <Text style={styles.errorText}>{errors.projectType}</Text>}
                  </View>
                  
                  {renderInput('projectSize', 'Project Size (sq ft)*', 'numeric')}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.createButton} onPress={handleCreateCustomer}>
              <Text style={styles.createButtonText}>Create Customer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      
      {/* Date of Birth Picker */}
      <DobPicker
        isVisible={isDobPickerVisible}
        onClose={() => setIsDobPickerVisible(false)}
        onSelect={handleDobSelect}
        maxDate={new Date()} // Can't select future dates
      />
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
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 16,
    marginTop: 16,
  },
  professionalSection: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  dealerShopSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  siteVisitSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  gpsContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  gpsCoordinates: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 8,
  },
  gpsValues: {
    marginLeft: 12,
    flex: 1,
  },
  gpsText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 4,
  },
  gpsPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
    textAlign: 'center',
    paddingVertical: 8,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  gpsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AddCustomerModal;

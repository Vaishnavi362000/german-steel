import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import NotesSection from './NotesSection';
import VisitsTimeline from './VisitsTimeline';
import Sites from './Sites';
import Select from './Select';
import DatePicker from './DatePicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

const clientTypeOptions = [
  { label: 'Shop', value: 'shop' },
  { label: 'Site Visit', value: 'site visit' },
  { label: 'Architect', value: 'architect' },
  { label: 'Engineer', value: 'engineer' },
  { label: 'Builder', value: 'builder' },
  { label: 'Others', value: 'others' },
];

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

const purposeOptions = [
  { label: 'First Visit', value: 'First Visit' },
  { label: 'Follow Up', value: 'Follow Up' },
  { label: 'Order', value: 'Order' },
  { label: 'Monthly Visit', value: 'Monthly Visit' },
  { label: 'Special Meet', value: 'Special Meet' },
  { label: 'Sales', value: 'Sales' },
  { label: 'Special Enquiry', value: 'Special Enquiry' },
  { label: 'Payment', value: 'Payment' },
  { label: 'Others', value: 'Others' },
];

function CustomerDetails({ route, navigation }) {
  const [customerInfoTab, setCustomerInfoTab] = useState('contact');
  const [contentTab, setContentTab] = useState('notes');
  const { customerId, authToken } = route.params;
  const [modalVisible, setModalVisible] = useState(false);
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isPickerVisible, setPickerVisible] = useState(false);
  const [intentLevel, setIntentLevel] = useState(0);
  const [isCreatingVisit, setIsCreatingVisit] = useState(false);
  const [newVisitDetails, setNewVisitDetails] = useState({
    date: new Date(),
    purpose: '',
  });
  const [isConfirmationVisible, setConfirmationVisible] = useState(false);
  const [existingVisits, setExistingVisits] = useState([]);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [customerDetails, setCustomerDetails] = useState({
    storeName: '',
    clientType: '',
    clientFirstName: '',
    clientLastName: '',
    primaryContact: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    gstNumber: '',
    monthlySale: '',
    latitude: null,
    longitude: null,
    employeeId: '',
    subDistrict: '',
    district: '',
  });

  const loadCustomerDetails = useCallback(async () => {
    try {
      const url = `https://api.gajkesaristeels.in/store/getById?id=${customerId}`;
      console.log('Fetch Store Details Request (GET /store/getById):', { url, customerId });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Fetch Store Details Response Status:', response.status);

      const data = await response.json();
      console.log('Fetch Store Details Response Body:', JSON.stringify(data, null, 2));

      setCustomerDetails(data);
      fetchIntentLevel();
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  }, [customerId, authToken]);

  useFocusEffect(
    useCallback(() => {
      loadCustomerDetails();
    }, [loadCustomerDetails])
  );

  const fetchIntentLevel = async () => {
    try {
      const response = await axios.get(`https://api.gajkesaristeels.in/intent-audit/getByStore?id=${customerId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (Array.isArray(response.data) && response.data.length > 0) {
        const latestIntentAudit = response.data.reduce((latest, current) => {
          return current.id > latest.id ? current : latest;
        });
        setIntentLevel(latestIntentAudit.newIntentLevel);
      } else {
        setIntentLevel(0);
      }
    } catch (error) {
      console.error('Error fetching intent level:', error.response || error);
    }
  };

  const getInitials = (name) => {
    const names = name.split(' ');
    const initials = names.map((name) => name.charAt(0)).join('');
    return initials.toUpperCase();
  };

  const handleCreateVisit = () => {
    createVisit();
  };

  const createVisit = async () => {
    if (!newVisitDetails.purpose || newVisitDetails.purpose.trim() === '') {
      alert('Please select a purpose for the visit.');
      return;
    }

    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const formattedDate = format(newVisitDetails.date, 'yyyy-MM-dd');
      const response = await fetch(`https://api.gajkesaristeels.in/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const visits = await response.json();
        const existingVisitsForStore = visits.filter((visit) => visit.storeId === customerId);
        const hasOngoingVisit = existingVisitsForStore.some((visit) => visit.checkinDate && !visit.checkoutDate);

        if (existingVisitsForStore.length > 0) {
          setExistingVisits(existingVisitsForStore);
          if (hasOngoingVisit) {
            setConfirmationMessage("You cannot create a visit while another visit is ongoing for this store.");
          } else {
            setConfirmationMessage("Are you sure you want to create another visit?");
          }
          setConfirmationVisible(true);
        } else {
          await createVisitAPI();
        }
      } else {
        console.error('Server error:', response.status);
      }
    } catch (error) {
      console.error('Error checking visits:', error);
    }
  };

  const createVisitAPI = async () => {
    setIsCreatingVisit(true);
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      const purpose = newVisitDetails.purpose === 'Others' ? newVisitDetails.customPurpose : newVisitDetails.purpose;
      const response = await axios.put('https://api.gajkesaristeels.in/visit/create', {
        storeId: customerId,
        employeeId: employeeId,
        visit_date: format(newVisitDetails.date, 'yyyy-MM-dd'),
        purpose: purpose,
      }, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const visitId = response.data;
      closeVisitModal();
      Alert.alert('Success', 'Visit created successfully.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('VisitScreen', { visitId, authToken }),
        },
      ], { cancelable: false });
    } catch (error) {
      console.error('Error creating visit:', error);
      Alert.alert('Error', 'Failed to create visit. Please try again.');
    } finally {
      setIsCreatingVisit(false);
    }
  };

  const closeVisitModal = () => {
    setVisitModalVisible(false);
    setNewVisitDetails({
      date: new Date(),
      purpose: '',
    });
  };

  const renderCustomerCard = () => {
    const isProfessional = ['architect', 'engineer', 'builder'].includes(customerDetails.clientType?.toLowerCase());
    
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <TouchableOpacity style={[styles.iconBtn, styles.editBtn]} onPress={() => setModalVisible(true)}>
                    <Ionicons name="create-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {getInitials(`${customerDetails.clientFirstName} ${customerDetails.clientLastName}`)}
                    </Text>
                </View>
                <Text style={styles.customerName}>{customerDetails.storeName}</Text>
                <View style={[styles.badge, isProfessional && styles.professionalBadge]}>
                    <Text style={styles.badgeText}>{customerDetails.clientType}</Text>
                </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tabBtn, customerInfoTab === 'contact' && styles.activeTab]}
                        onPress={() => setCustomerInfoTab('contact')}
                    >
                        <Text style={[styles.tabBtnText, customerInfoTab === 'contact' && styles.activeTabText]}>Contact</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, customerInfoTab === 'details' && styles.activeTab]}
                        onPress={() => setCustomerInfoTab('details')}
                    >
                        <Text style={[styles.tabBtnText, customerInfoTab === 'details' && styles.activeTabText]}>Details</Text>
                    </TouchableOpacity>
                </View>
                {customerInfoTab === 'contact' && (
                    <View>
                        <InfoRow
                            icon="location-outline"
                            label="Location"
                            value={[customerDetails.city, customerDetails.state].filter(Boolean).join(', ')}
                        />
                        <InfoRow
                            icon="mail-outline"
                            label="Email"
                            value={customerDetails.email}
                        />
                        <InfoRow
                            icon="call-outline"
                            label="Phone"
                            value={customerDetails.primaryContact}
                        />
                    </View>
                )}
                {customerInfoTab === 'details' && (
                    <View>
                        <InfoRow
                            icon="home-outline"
                            label="Address"
                            value={[customerDetails.addressLine1, customerDetails.addressLine2].filter(Boolean).join(', ')}
                        />
                        <InfoRow
                            icon="receipt-outline"
                            label="GST"
                            value={customerDetails.gstNumber}
                        />
                        <InfoRow
                            icon="calendar-outline"
                            label="DOB"
                            value={
                              customerDetails.dob
                                ? (() => {
                                    try {
                                      const date = new Date(customerDetails.dob);
                                      if (isNaN(date.getTime())) return customerDetails.dob;
                                      return format(date, 'dd MMM yyyy');
                                    } catch {
                                      return customerDetails.dob;
                                    }
                                  })()
                                : ''
                            }
                        />
                        <InfoRow
                            icon="map-outline"
                            label="PIN"
                            value={customerDetails.pincode}
                        />
                    </View>
                )}
            </View>
        </View>
    );
  };


  const InfoRow = ({ icon, label, value }) => {
    return (
      <View style={styles.infoRow}>
        <Ionicons name={icon} size={20} color="#7F00FF" style={styles.infoIcon} />
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoLabel}>{label}:</Text>
          <Text style={styles.infoText}>{value || ''}</Text>
        </View>
      </View>
    );
  };




  const renderContent = () => {
    const allowedClientTypes = ['site visit', 'engineer', 'architect', 'builder'];
    const clientType = customerDetails?.clientType?.toLowerCase() || '';
    const showSitesTab = allowedClientTypes.includes(clientType);

    const tabs = [
      { id: 'notes', icon: 'document-text-outline', label: 'Notes' },
      { id: 'visits', icon: 'time-outline', label: 'Visits' },
    ];

    if (showSitesTab) {
      tabs.push({ id: 'sites', icon: 'business-outline', label: 'Sites' });
    }

    return (
      <View style={styles.contentContainer}>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabItem, contentTab === tab.id && styles.activeTabItem]}
              onPress={() => setContentTab(tab.id)}
            >
              <Ionicons
                name={tab.icon}
                size={20}
                color={contentTab === tab.id ? '#4F46E5' : '#6B7280'}
              />
              <Text style={[styles.tabText, contentTab === tab.id && styles.activeTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tabContent}>
          {contentTab === 'notes' && (
            <NotesSection
              storeId={customerId}
              authToken={authToken}
              employeeId={customerDetails.employeeId}
            />
          )}
          {contentTab === 'visits' && (
            <View>
              <TouchableOpacity style={styles.createVisitButton} onPress={() => setVisitModalVisible(true)}>
                <Text style={styles.createVisitButtonText}>Create Visit</Text>
              </TouchableOpacity>
              <VisitsTimeline storeId={customerId} authToken={authToken} navigation={navigation} />
            </View>
          )}
          {contentTab === 'sites' && showSitesTab && (
            <Sites
              visitId={null}
              storeId={customerId}
              authToken={authToken}
            />
          )}
        </View>
      </View>
    );
  };

  const EditCustomerModal = ({ visible, onClose, customerDetails, onSave }) => {
    const [updatedDetails, setUpdatedDetails] = useState(customerDetails);
    const [activeTab, setActiveTab] = useState('general');
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedOption, setSelectedOption] = useState({ label: customerDetails.clientType, value: customerDetails.clientType });
    const [selectedIntentLevel, setSelectedIntentLevel] = useState(customerDetails.intent || 0);
    const [selectedClientType, setSelectedClientType] = useState(customerDetails.clientType);
    const [customClientType, setCustomClientType] = useState(customerDetails.clientType === 'others' ? customerDetails.customClientType : '');
    const [selectedState, setSelectedState] = useState(customerDetails.state);
    const [isDobPickerVisible, setIsDobPickerVisible] = useState(false);

    useEffect(() => {
      setUpdatedDetails(customerDetails);
      setSelectedIntentLevel(customerDetails.intent || 0);
      setSelectedOption({ label: customerDetails.clientType, value: customerDetails.clientType });
      setCustomClientType(customerDetails.clientType === 'others' ? customerDetails.customClientType : '');
    }, [customerDetails]);

    const handleSelect = (option) => {
      setSelectedOption(option);
      setUpdatedDetails(prevDetails => ({
        ...prevDetails,
        clientType: option ? (option.value === 'others' ? customClientType : option.value) : null,
      }));
      if (option?.value === 'others') {
        setCustomClientType(customClientType);
      } else {
        setCustomClientType('');
      }
    };

    const handleInputChange = (field, value) => {
      setUpdatedDetails((prevDetails) => ({
        ...prevDetails,
        [field]: value,
      }));

      if (field === 'state') {
        setSelectedState(value);
      }

      if (field === 'clientType') {
        setSelectedClientType(value);
        if (selectedOption && selectedOption.value === 'others') {
          setCustomClientType(value);
        }
      }
    };

    const handleSave = () => {
      const finalUpdatedDetails = {
        ...updatedDetails,
        clientType: selectedOption ? (selectedOption.value === 'others' ? customClientType : selectedOption.value) : null,
        customClientType: selectedOption?.value === 'others' ? customClientType : null,
        intent: selectedIntentLevel,
      };
      onSave(finalUpdatedDetails);
      onClose();
    };

    const handleIntentLevelChange = (level) => {
      setSelectedIntentLevel(level);
      setUpdatedDetails(prevDetails => ({
        ...prevDetails,
        intent: level,
      }));
    };

    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setUpdatedDetails((prevDetails) => ({
        ...prevDetails,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      }));
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      alert(`Location fetched: Latitude: ${location.coords.latitude}, Longitude: ${location.coords.longitude}`);
    };

    const getSitesLabel = () => {
        const isProfessional = ['architect', 'engineer', 'builder'].includes(selectedClientType?.toLowerCase());
        return isProfessional ? 'Projects' : 'Sites';
    };

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit Customer Details</Text>
          <ScrollView>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'general' && styles.activeTab]}
                onPress={() => setActiveTab('general')}
              >
                <Text style={[styles.tabText, activeTab === 'general' && styles.activeTabText]}>
                  General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'location' && styles.activeTab]}
                onPress={() => setActiveTab('location')}
              >
                <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>
                  Location
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              {activeTab === 'general' && (
                <View style={styles.modalContent}>
                  <Text style={styles.label}>Shop Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Shop Name"
                    value={updatedDetails.storeName}
                    onChangeText={(value) => handleInputChange('storeName', value)}
                  />
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name"
                    value={updatedDetails.clientFirstName}
                    onChangeText={(value) => handleInputChange('clientFirstName', value)}
                  />
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Last Name"
                    value={updatedDetails.clientLastName}
                    onChangeText={(value) => handleInputChange('clientLastName', value)}
                  />
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    value={updatedDetails.primaryContact?.toString()}
                    onChangeText={(value) => handleInputChange('primaryContact', value)}
                    keyboardType="phone-pad"
                  />
                  <Text style={styles.label}>Date of Birth</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setIsDobPickerVisible(true)}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        color: updatedDetails.dob ? '#1F2937' : '#9CA3AF',
                      }}
                    >
                      {updatedDetails.dob
                        ? (() => {
                            try {
                              const date = new Date(updatedDetails.dob);
                              if (isNaN(date.getTime())) return updatedDetails.dob;
                              return format(date, 'dd MMM yyyy');
                            } catch {
                              return updatedDetails.dob;
                            }
                          })()
                        : 'Select date'}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.label}>Monthly Sales</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Monthly Sales"
                    value={updatedDetails.monthlySale?.toString()}
                    onChangeText={(value) => handleInputChange('monthlySale', value)}
                    keyboardType="numeric"
                  />
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={updatedDetails.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                  />
                  <Text style={styles.label}>Client Type</Text>
                  <Select
                    options={clientTypeOptions}
                    placeholder="Select an option"
                    onSelect={(option) => {
                      setSelectedClientType(option.value);
                      handleInputChange('clientType', option.value);
                      handleSelect(option);
                    }}
                    selectedOption={selectedOption || (customClientType ? { label: customClientType, value: 'others' } : null)}
                  />
                  {selectedOption && selectedOption.value === 'others' && (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter custom client type"
                      value={customClientType}
                      onChangeText={(value) => {
                        setCustomClientType(value);
                        setSelectedClientType(value);
                        handleInputChange('clientType', value);
                      }}
                    />
                  )}
                  <Text style={styles.label}>GST Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="GST Number"
                    value={updatedDetails.gstNumber}
                    onChangeText={(value) => handleInputChange('gstNumber', value)}
                  />
                </View>
              )}
              {activeTab === 'location' && (
                <View style={styles.modalContent}>
                  <Text style={styles.label}>Address Line 1</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Address Line 1"
                    value={updatedDetails.addressLine1}
                    onChangeText={(value) => handleInputChange('addressLine1', value)}
                  />
                  <Text style={styles.label}>Address Line 2</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Address Line 2"
                    value={updatedDetails.addressLine2}
                    onChangeText={(value) => handleInputChange('addressLine2', value)}
                  />
                  <Text style={styles.label}>Village</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Village"
                    value={updatedDetails.subDistrict}
                    onChangeText={(value) => handleInputChange('subDistrict', value)}
                  />
                  <Text style={styles.label}>Taluka</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Taluka"
                    value={updatedDetails.district}
                    onChangeText={(value) => handleInputChange('district', value)}
                  />
                  <Text style={styles.label}>City</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="City"
                    value={updatedDetails.city}
                    onChangeText={(value) => handleInputChange('city', value)}
                  />
                  <Text style={styles.label}>State</Text>
                  <Select
                    options={indianStates}
                    placeholder="Select a state"
                    onSelect={(option) => {
                      setSelectedState(option.value);
                      handleInputChange('state', option.value);
                    }}
                    selectedOption={selectedState ? { label: selectedState, value: selectedState } : null}
                  />
                  <Text style={styles.label}>Pincode</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Pincode"
                    value={updatedDetails.pincode?.toString()}
                    onChangeText={(value) => handleInputChange('pincode', value)}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity style={[styles.footerButton, styles.saveButton]} onPress={getLocation}>
                    <Text style={styles.locationButtonText}>Choose Current Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
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
          <View style={styles.modalFooter}>
            <TouchableOpacity style={[styles.footerButton, styles.saveButton]} onPress={handleSave}>
              <Text style={[styles.footerButtonText, styles.saveButtonText]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerButton, styles.cancelButton]} onPress={onClose}>
              <Text style={[styles.footerButtonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const ConfirmationBottomSheet = () => (
    <Modal
      visible={isConfirmationVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setConfirmationVisible(false)}
    >
      <View style={styles.confirmationContainer}>
        <View style={styles.confirmationContent}>
          <View style={styles.confirmationHeader}>
            <Text style={styles.confirmationTitle}>Ongoing Visits</Text>
            <TouchableOpacity style={styles.closeButton} onPress={() => setConfirmationVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.bottomSheetScrollView}>
            {existingVisits.map((ongoingVisit, index) => (
              <View key={index} style={styles.existingVisitCard}>
                <View style={styles.existingVisitHeader}>
                  <Text style={styles.existingVisitStoreName}>{ongoingVisit.storeName}</Text>
                  <Text style={styles.existingVisitDate}>{format(new Date(ongoingVisit.visit_date), 'MMMM d, yyyy')}</Text>
                </View>
                <View style={styles.existingVisitDetails}>
                  <View style={styles.existingVisitItem}>
                    <Ionicons name="location-outline" size={20} color="#6200EE" />
                    <Text style={styles.existingVisitText}>{ongoingVisit.city}</Text>
                  </View>
                  <View style={styles.existingVisitItem}>
                    <Ionicons name="bookmark-outline" size={20} color="#6200EE" />
                    <Text style={styles.existingVisitText}>{ongoingVisit.purpose || 'N/A'}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewVisitButton}
                  onPress={() => {
                    setConfirmationVisible(false);
                    setVisitModalVisible(false);
                    navigation.navigate('VisitScreen', { visitId: ongoingVisit.id, authToken });
                  }}
                >
                  <Text style={styles.viewVisitButtonText}>View Visit</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.confirmationMessage}>{confirmationMessage}</Text>
          {!existingVisits.some(visit => visit.checkinDate && !visit.checkoutDate) && (
            <View style={styles.confirmationButtons}>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.cancelButton]}
                onPress={() => setConfirmationVisible(false)}
              >
                <Text style={styles.confirmationButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmationButton, styles.confirmButton]}
                onPress={() => {
                  setConfirmationVisible(false);
                  createVisitAPI();
                }}
                disabled={isCreatingVisit}
              >
                {isCreatingVisit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.createVisitButtonText}>Create Visit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  // Check if today is the customer's birthday
  const isBirthday = (() => {
    if (!customerDetails.dob) return false;
    try {
      const today = new Date();
      const dob = new Date(customerDetails.dob);
      return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
    } catch {
      return false;
    }
  })();

  return (
    <View style={styles.container}>
      {isBirthday && (
        <View style={styles.birthdayCard}>
          <View style={styles.birthdayCardContent}>
            <Ionicons name="gift" size={32} color="#EC4899" />
            <View style={styles.birthdayTextContainer}>
              <Text style={styles.birthdayTitle}>🎉 Happy Birthday! 🎉</Text>
              <Text style={styles.birthdayMessage}>
                Today is {customerDetails.clientFirstName} {customerDetails.clientLastName}'s birthday!
              </Text>
            </View>
          </View>
        </View>
      )}
      {renderCustomerCard()}
      {renderContent()}
      <EditCustomerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        customerDetails={customerDetails}
        onSave={(updatedDetails) => {
          console.log('Update Store Payload (PUT /store/edit):', JSON.stringify(updatedDetails, null, 2));
          setCustomerDetails(updatedDetails);
          axios.put(`https://api.gajkesaristeels.in/store/edit?id=${customerId}`, updatedDetails, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          })
            .then((response) => {
              console.log('Update Store Response (PUT /store/edit):', JSON.stringify(response.data, null, 2));
              console.log('Store Updated Successfully');
              setModalVisible(false);
            })
            .catch((error) => {
              console.error('Error updating store:', error);
              Alert.alert('Error', 'Failed to update customer details');
            });
        }}
      />
      <Modal
        visible={visitModalVisible}
        animationType="slide"
        onRequestClose={closeVisitModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity style={styles.closeButton} onPress={closeVisitModal}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Create Visit</Text>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Store Name</Text>
            <Text style={styles.storeNameText}>{customerDetails.storeName}</Text>

            <Text style={styles.label}>Visit Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.dateButtonText}>
                {format(newVisitDetails.date, 'MMMM d, yyyy')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Purpose</Text>
            <View style={styles.purposeOptions}>
              {purposeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.purposeOption,
                    newVisitDetails.purpose === option.value && styles.selectedPurposeOption,
                  ]}
                  onPress={() => setNewVisitDetails({ ...newVisitDetails, purpose: option.value })}
                >
                  <Text style={styles.purposeOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {newVisitDetails.purpose === 'Others' && (
              <>
                <Text style={styles.label}>Custom Purpose</Text>
                <TextInput
                  style={[styles.input, styles.customPurposeInput]}
                  placeholder="Enter custom purpose"
                  value={newVisitDetails.customPurpose}
                  onChangeText={(text) => setNewVisitDetails({ ...newVisitDetails, customPurpose: text })}
                  multiline
                />
              </>
            )}

            <TouchableOpacity 
              style={[styles.createVisitButton, styles.confirmationButton]} 
              onPress={handleCreateVisit}
            >
              <Text style={styles.createVisitButtonText}>Create Visit</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <DatePicker
        isVisible={isPickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(date) => {
          setSelectedDate(date);
          setNewVisitDetails(prev => ({ ...prev, date }));
          setPickerVisible(false);
        }}
      />

      <ConfirmationBottomSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    backgroundColor: '#4F46E5',
    padding: 20,
    alignItems: 'center',
  },
  iconBtn: {
    position: 'absolute',
    top: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    padding: 8,
    zIndex: 1,
  },
  editBtn: {
    right: 12,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  customerName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  professionalBadge: {
    backgroundColor: '#4A90E2',
  },
  badgeText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardBody: {
    padding: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabBtnText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  infoIcon: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTabItem: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flex: 1,
  },
  createVisitButton: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createVisitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  modalContent: {
    flexGrow: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  footerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#4B5563',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  dateButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  purposeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  purposeOption: {
    width: '48%',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  selectedPurposeOption: {
    backgroundColor: '#E0E7FF',
  },
  purposeOptionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  selectedPurposeOptionText: {
    color: '#4F46E5',
    fontWeight: 'bold',
  },
  customPurposeInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    margin: 0,
  },
  confirmationContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
  },
  confirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  bottomSheetScrollView: {
    maxHeight: '60%',
  },
  existingVisitCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  existingVisitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  existingVisitStoreName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  existingVisitDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  existingVisitDetails: {
    marginBottom: 12,
    gap: 8,
  },
  existingVisitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  existingVisitText: {
    fontSize: 14,
    color: '#4B5563',
  },
  viewVisitButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  viewVisitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmationMessage: {
    fontSize: 14,
    color: '#4B5563',
    marginVertical: 16,
    textAlign: 'center',
  },
  confirmationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#4F46E5',
  },
  confirmationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  storeNameText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  birthdayCard: {
    backgroundColor: '#FDF2F8',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#EC4899',
    shadowColor: '#EC4899',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  birthdayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  birthdayTextContainer: {
    flex: 1,
  },
  birthdayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#EC4899',
    marginBottom: 4,
  },
  birthdayMessage: {
    fontSize: 14,
    color: '#9F1239',
  },
});

export default CustomerDetails;


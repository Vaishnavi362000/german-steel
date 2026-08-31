import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotesSection from './NotesSection';
import VisitsTimeline from './VisitsTimeline';
import Sites from './Sites';
import Select from './Select';
import DatePicker from './DatePicker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import {
  getMobileActionLocation,
  getMobileLocationErrorContent,
} from './MobileLocationService';
import { CLIENT_TYPE_OPTIONS, YEAR_OF_JOINING_OPTIONS } from './clientTypeOptions';

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
      const url = `${API_BASE_URL}/store/getById?id=${customerId}`;
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
      const response = await axios.get(`${API_BASE_URL}/intent-audit/getByStore?id=${customerId}`, {
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
      const response = await fetch(`${API_BASE_URL}/visit/getByDateRangeAndEmployee?id=${employeeId}&start=${formattedDate}&end=${formattedDate}`, {
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
      const response = await axios.put(`${API_BASE_URL}/visit/create`, {
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
    const isDealer = ['dealer', 'shop'].some((type) => customerDetails.clientType?.toLowerCase().includes(type));
    const lastVisit = customerDetails.lastVisitDate || customerDetails.latestVisitDate;
    const lastVisitText = lastVisit ? format(new Date(lastVisit), 'dd MMM yyyy') : 'Never visited';
    const totalVisits = customerDetails.totalVisits ?? customerDetails.visitCount ?? customerDetails.totalVisitCount ?? 0;
    const monthlyVisits = customerDetails.thisMonthVisits ?? customerDetails.visitThisMonth ?? 0;

    return (
      <View style={styles.card}>
        <View style={styles.customerHeroCard}>
          <View style={styles.customerHeroMain}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(customerDetails.storeName || `${customerDetails.clientFirstName} ${customerDetails.clientLastName}`)}
              </Text>
            </View>
            <View style={styles.customerHeroInfo}>
              <Text style={styles.customerName} numberOfLines={1}>{customerDetails.storeName || 'Customer'}</Text>
              <View style={styles.badgeContainer}>
                <View style={[styles.badge, isProfessional && styles.professionalBadge]}>
                  <Text style={styles.badgeText}>{customerDetails.clientType || 'Customer'}</Text>
                </View>
              </View>
              <View style={styles.ownerRow}>
                <Ionicons name="person-outline" size={12} color="#E0E7FF" />
                <Text style={styles.ownerText} numberOfLines={1}>
                  {[customerDetails.clientFirstName, customerDetails.clientLastName].filter(Boolean).join(' ')}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.heroEditButton} onPress={() => setModalVisible(true)}>
              <Ionicons name="create-outline" size={19} color="#4F46E5" />
            </TouchableOpacity>
          </View>
          <View style={styles.customerHeroDivider} />
          <View style={styles.customerStatsRow}>
            <View style={styles.customerStatItem}>
              <View style={styles.customerStatTop}>
                <Ionicons name="calendar-outline" size={15} color="#FFFFFF" />
                <Text style={styles.customerStatValue} numberOfLines={1}>{lastVisitText}</Text>
              </View>
              <Text style={styles.customerStatLabel}>Last Visit</Text>
            </View>
            <View style={styles.customerStatDivider} />
            <View style={styles.customerStatItem}>
              <View style={styles.customerStatTop}>
                <Ionicons name="analytics-outline" size={15} color="#FFFFFF" />
                <Text style={styles.customerStatValue}>{totalVisits}</Text>
              </View>
              <Text style={styles.customerStatLabel}>Total Visits</Text>
            </View>
            <View style={styles.customerStatDivider} />
            <View style={styles.customerStatItem}>
              <View style={styles.customerStatTop}>
                <Ionicons name="calendar-number-outline" size={15} color="#FFFFFF" />
                <Text style={styles.customerStatValue}>{monthlyVisits}</Text>
              </View>
              <Text style={styles.customerStatLabel}>This Month</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardBody}>
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tabBtn, customerInfoTab === 'contact' && styles.activeInfoTab]}
                        onPress={() => setCustomerInfoTab('contact')}
                    >
                        <Text style={[styles.tabBtnText, customerInfoTab === 'contact' && styles.activeTabText]}>Contact</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabBtn, customerInfoTab === 'details' && styles.activeInfoTab]}
                        onPress={() => setCustomerInfoTab('details')}
                    >
                        <Text style={[styles.tabBtnText, customerInfoTab === 'details' && styles.activeTabText]}>Details</Text>
                    </TouchableOpacity>
                    {isDealer && (
                        <TouchableOpacity
                            style={[styles.tabBtn, customerInfoTab === 'dealerInfo' && styles.activeInfoTab]}
                            onPress={() => setCustomerInfoTab('dealerInfo')}
                        >
                            <Text style={[styles.tabBtnText, customerInfoTab === 'dealerInfo' && styles.activeTabText]}>Dealer Info</Text>
                        </TouchableOpacity>
                    )}
                </View>
                {customerInfoTab === 'contact' && (
                    <View>
                        <InfoRow
                            icon="person-outline"
                            label="Customer / Owner Name"
                            value={[customerDetails.clientFirstName, customerDetails.clientLastName].filter(Boolean).join(' ')}
                        />
                        <InfoRow
                            icon="calendar-number-outline"
                            label="Year of Joining"
                            value={customerDetails.yearOfJoining ? String(customerDetails.yearOfJoining) : ''}
                        />
                        <InfoRow
                            icon="call-outline"
                            label="Phone"
                            value={customerDetails.primaryContact}
                        />
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
                {customerInfoTab === 'dealerInfo' && isDealer && (
                    <View>
                        <InfoRow icon="storefront-outline" label="Customer Type" value={customerDetails.clientType} />
                        <InfoRow icon="cash-outline" label="Monthly Sale" value={customerDetails.monthlySale} />
                        <InfoRow icon="receipt-outline" label="GST" value={customerDetails.gstNumber} />
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
      { id: 'notes', icon: 'document-text-outline', label: 'Discussion' },
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
              <VisitsTimeline storeId={customerId} authToken={authToken} navigation={navigation} embedded />
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
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);

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
        yearOfJoining: updatedDetails.yearOfJoining ? Number(updatedDetails.yearOfJoining) : undefined,
      };
      if (!finalUpdatedDetails.yearOfJoining) delete finalUpdatedDetails.yearOfJoining;
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
      if (isFetchingLocation) return;

      try {
        setIsFetchingLocation(true);
        const location = await getMobileActionLocation({
          requirePrecise: false,
          timeoutMs: 60000,
          cacheMaxAgeMs: 300000,
          cacheRequiredAccuracy: 1000,
          balancedRequiredAccuracy: 1000,
        });

        setUpdatedDetails((prevDetails) => ({
          ...prevDetails,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
        setSelectedLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        Alert.alert(
          'Location fetched',
          `Latitude: ${location.coords.latitude}, Longitude: ${location.coords.longitude}`
        );
      } catch (error) {
        console.error('Error fetching customer location:', error.message);
        const content = getMobileLocationErrorContent(error, 'choose current customer location');
        const buttons = content.canOpenSettings
          ? [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'OK', style: 'cancel' },
          ]
          : [{ text: 'OK' }];
        Alert.alert(content.title, content.message, buttons);
      } finally {
        setIsFetchingLocation(false);
      }
    };

    const getSitesLabel = () => {
        const isProfessional = ['architect', 'engineer', 'builder'].includes(selectedClientType?.toLowerCase());
        return isProfessional ? 'Projects' : 'Sites';
    };

    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
        <SafeAreaView style={editCustomerStyles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={editCustomerStyles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={editCustomerStyles.header}>
              <TouchableOpacity
                style={editCustomerStyles.headerButton}
                onPress={onClose}
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color="#1F2937" />
              </TouchableOpacity>
              <View style={editCustomerStyles.headerCopy}>
                <Text style={editCustomerStyles.title}>Edit Customer</Text>
                <Text style={editCustomerStyles.subtitle}>Update customer information</Text>
              </View>
              <TouchableOpacity
                style={editCustomerStyles.headerButton}
                onPress={onClose}
                accessibilityLabel="Close edit customer"
              >
                <Ionicons name="close" size={22} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={editCustomerStyles.tabContainer}>
              <TouchableOpacity
                style={[editCustomerStyles.tabItem, activeTab === 'general' && editCustomerStyles.activeTab]}
                onPress={() => setActiveTab('general')}
              >
                <Ionicons name="person-outline" size={16} color={activeTab === 'general' ? '#4F46E5' : '#7C8494'} />
                <Text style={[editCustomerStyles.tabText, activeTab === 'general' && editCustomerStyles.activeTabText]}>
                  General
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[editCustomerStyles.tabItem, activeTab === 'location' && editCustomerStyles.activeTab]}
                onPress={() => setActiveTab('location')}
              >
                <Ionicons name="location-outline" size={16} color={activeTab === 'location' ? '#4F46E5' : '#7C8494'} />
                <Text style={[editCustomerStyles.tabText, activeTab === 'location' && editCustomerStyles.activeTabText]}>
                  Location
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={editCustomerStyles.formScroll}
              contentContainerStyle={editCustomerStyles.formScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'general' && (
                <View style={[styles.modalContent, editCustomerStyles.formCard]}>
                  <Text style={[styles.label, editCustomerStyles.label]}>Shop Name</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Shop Name"
                    value={updatedDetails.storeName}
                    onChangeText={(value) => handleInputChange('storeName', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>First Name</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="First Name"
                    value={updatedDetails.clientFirstName}
                    onChangeText={(value) => handleInputChange('clientFirstName', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Last Name</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Last Name"
                    value={updatedDetails.clientLastName}
                    onChangeText={(value) => handleInputChange('clientLastName', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Phone</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Phone"
                    value={updatedDetails.primaryContact?.toString()}
                    onChangeText={(value) => handleInputChange('primaryContact', value)}
                    keyboardType="phone-pad"
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Date of Birth</Text>
                  <TouchableOpacity
                    style={[styles.input, editCustomerStyles.input, editCustomerStyles.dateInput]}
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
                  <Text style={[styles.label, editCustomerStyles.label]}>Year of Joining</Text>
                  <View style={editCustomerStyles.selectWrapper}>
                    <Select
                      options={YEAR_OF_JOINING_OPTIONS}
                      placeholder="Select year"
                      onSelect={(option) => handleInputChange('yearOfJoining', option.value)}
                      selectedOption={updatedDetails.yearOfJoining
                        ? { label: String(updatedDetails.yearOfJoining), value: Number(updatedDetails.yearOfJoining) }
                        : null}
                    />
                  </View>
                  <Text style={[styles.label, editCustomerStyles.label]}>Monthly Sales</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Monthly Sales"
                    value={updatedDetails.monthlySale?.toString()}
                    onChangeText={(value) => handleInputChange('monthlySale', value)}
                    keyboardType="numeric"
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Email</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Email"
                    value={updatedDetails.email}
                    onChangeText={(value) => handleInputChange('email', value)}
                    keyboardType="email-address"
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Client Type</Text>
                  <View style={editCustomerStyles.selectWrapper}>
                    <Select
                      options={CLIENT_TYPE_OPTIONS}
                      placeholder="Select an option"
                      onSelect={(option) => {
                        setSelectedClientType(option.value);
                        handleInputChange('clientType', option.value);
                        handleSelect(option);
                      }}
                      selectedOption={selectedOption || (customClientType ? { label: customClientType, value: 'others' } : null)}
                    />
                  </View>
                  {selectedOption && selectedOption.value === 'others' && (
                    <TextInput
                      style={[styles.input, editCustomerStyles.input]}
                      placeholder="Enter custom client type"
                      value={customClientType}
                      onChangeText={(value) => {
                        setCustomClientType(value);
                        setSelectedClientType(value);
                        handleInputChange('clientType', value);
                      }}
                    />
                  )}
                  <Text style={[styles.label, editCustomerStyles.label]}>GST Number</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="GST Number"
                    value={updatedDetails.gstNumber}
                    onChangeText={(value) => handleInputChange('gstNumber', value)}
                  />
                </View>
              )}
              {activeTab === 'location' && (
                <View style={[styles.modalContent, editCustomerStyles.formCard]}>
                  <Text style={[styles.label, editCustomerStyles.label]}>Address Line 1</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Address Line 1"
                    value={updatedDetails.addressLine1}
                    onChangeText={(value) => handleInputChange('addressLine1', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Address Line 2</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Address Line 2"
                    value={updatedDetails.addressLine2}
                    onChangeText={(value) => handleInputChange('addressLine2', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Village</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Village"
                    value={updatedDetails.subDistrict}
                    onChangeText={(value) => handleInputChange('subDistrict', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>Taluka</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Taluka"
                    value={updatedDetails.district}
                    onChangeText={(value) => handleInputChange('district', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>City</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="City"
                    value={updatedDetails.city}
                    onChangeText={(value) => handleInputChange('city', value)}
                  />
                  <Text style={[styles.label, editCustomerStyles.label]}>State</Text>
                  <View style={editCustomerStyles.selectWrapper}>
                    <Select
                      options={indianStates}
                      placeholder="Select a state"
                      onSelect={(option) => {
                        setSelectedState(option.value);
                        handleInputChange('state', option.value);
                      }}
                      selectedOption={selectedState ? { label: selectedState, value: selectedState } : null}
                    />
                  </View>
                  <Text style={[styles.label, editCustomerStyles.label]}>Pincode</Text>
                  <TextInput
                    style={[styles.input, editCustomerStyles.input]}
                    placeholder="Pincode"
                    value={updatedDetails.pincode?.toString()}
                    onChangeText={(value) => handleInputChange('pincode', value)}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={[editCustomerStyles.locationButton, isFetchingLocation && styles.disabledButton]}
                    onPress={getLocation}
                    disabled={isFetchingLocation}
                  >
                    {isFetchingLocation ? <ActivityIndicator size="small" color="#4F46E5" /> : <Ionicons name="locate-outline" size={19} color="#4F46E5" />}
                    <Text style={editCustomerStyles.locationButtonText}>
                      {isFetchingLocation ? 'Fetching Location...' : 'Choose Current Location'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
            <View style={editCustomerStyles.footer}>
              <TouchableOpacity style={editCustomerStyles.saveButton} onPress={handleSave}>
                <Ionicons name="checkmark" size={19} color="#FFFFFF" />
                <Text style={editCustomerStyles.saveButtonText}>Save changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={editCustomerStyles.cancelButton} onPress={onClose}>
                <Text style={editCustomerStyles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={23} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <TouchableOpacity style={styles.headerEditButton} onPress={() => setModalVisible(true)}>
          <Ionicons name="create-outline" size={17} color="#4F46E5" />
          <Text style={styles.headerEditButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.pageScroll}
        contentContainerStyle={styles.pageScrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
      {isBirthday && (
        <View style={styles.birthdayCard}>
          <View style={styles.birthdayCardContent}>
            <Ionicons name="gift" size={32} color="#EC4899" />
            <View style={styles.birthdayTextContainer}>
              <Text style={styles.birthdayTitle}>🎉 Happy Birthday! 🎉</Text>
              <Text style={styles.birthdayMessage}>
                Today is {[customerDetails.clientFirstName, customerDetails.clientLastName].filter(Boolean).join(' ')}'s birthday!
              </Text>
            </View>
          </View>
        </View>
      )}
      {renderCustomerCard()}
      {renderContent()}
      </ScrollView>
      <EditCustomerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        customerDetails={customerDetails}
        onSave={(updatedDetails) => {
          console.log('Update Store Payload (PUT /store/edit):', JSON.stringify(updatedDetails, null, 2));
          setCustomerDetails(updatedDetails);
          axios.put(`${API_BASE_URL}/store/edit?id=${customerId}`, updatedDetails, {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  backButton: {
    alignItems: 'flex-start',
    padding: 8,
    width: 56,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  headerEditButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    width: 56,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  headerEditButtonText: {
    color: '#4F46E5',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  customerHeroCard: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    elevation: 3,
    overflow: 'hidden',
    padding: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  customerHeroMain: {
    alignItems: 'center',
    flexDirection: 'row',
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
  addDetailsButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 1,
  },
  addDetailsButtonText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#4F46E5',
    fontSize: 22,
    fontWeight: '800',
  },
  customerHeroInfo: {
    flex: 1,
    minWidth: 0,
  },
  customerName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 7,
  },
  storeNamePill: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  storeNamePillLabel: {
    color: '#C7D2FE',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  storeNamePillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  professionalBadge: {
    backgroundColor: '#EEF2FF',
  },
  badgeText: {
    color: '#4F46E5',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dealerTypeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
  },
  exclusiveBadge: {
    backgroundColor: '#10B981',
  },
  nonExclusiveBadge: {
    backgroundColor: '#F59E0B',
  },
  dealerTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  ownerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 0,
  },
  ownerText: {
    color: '#E0E7FF',
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  customerHeroDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    height: 1,
    marginTop: 18,
    marginBottom: 12,
  },
  customerStatsRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  customerStatItem: {
    flex: 1,
    minWidth: 0,
  },
  customerStatTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    minWidth: 0,
  },
  customerStatValue: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },
  customerStatLabel: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 5,
    textAlign: 'center',
  },
  customerStatDivider: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    marginHorizontal: 8,
    width: 1,
  },
  cardBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    elevation: 2,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#EEF2FF',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 2,
    paddingVertical: 13,
  },
  activeInfoTab: {
    borderBottomColor: '#4F46E5',
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
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  activeInfoTabText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  infoTabContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
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
  infoRowActionButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#DDE3FF',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginLeft: 10,
    width: 38,
  },
  productCategoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  productCategoryChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  productCategoryText: {
    fontSize: 12,
    color: '#4F46E5',
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
    marginTop: 20,
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
    paddingBottom: 120,
  },
  modalContentContainer: {
    paddingBottom: 24,
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
  sitesSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E7FF',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  sitesSummaryHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sitesSummaryHeading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  sitesSummaryIcon: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  sitesSummaryTitleWrap: {
    flex: 1,
  },
  sitesSummaryTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  sitesSummarySubtitle: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  sitesCountBadge: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    justifyContent: 'center',
    minWidth: 32,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  sitesCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sitesLoadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  sitesLoadingText: {
    color: '#4B5563',
    fontSize: 13,
    marginLeft: 8,
  },
  sitesSummaryBody: {
    gap: 10,
    marginBottom: 12,
  },
  sitesNamesPanel: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  sitesTotalPanel: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  sitesMetricLabelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  sitesSummaryLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sitesSummaryValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  siteNameList: {
    gap: 8,
  },
  siteNamePill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  siteNameDot: {
    backgroundColor: '#4F46E5',
    borderRadius: 4,
    height: 7,
    marginRight: 8,
    width: 7,
  },
  siteNamePillText: {
    color: '#111827',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  sitesEmptyValue: {
    color: '#6B7280',
    fontWeight: '500',
  },
  sitesTotalValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  sitesErrorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginBottom: 10,
  },
  addSiteButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  addSiteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addDetailsModalContainer: {
    backgroundColor: '#F3F4F6',
    flex: 1,
  },
  addDetailsHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  addDetailsCloseButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addDetailsTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
  },
  addDetailsContent: {
    padding: 16,
    paddingBottom: 16,
  },
  editSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 2,
  },
  editSectionTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  addDetailsInputContainer: {
    marginBottom: 16,
  },
  addDetailsLabel: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  addDetailsInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 10,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  noMissingDetailsCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 34,
  },
  noMissingDetailsTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  noMissingDetailsText: {
    color: '#6B7280',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  addDetailsFooter: {
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  addDetailsSaveButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 46,
  },
  addDetailsSaveButtonDisabled: {
    opacity: 0.65,
  },
  addDetailsSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
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
  siteManagerContainer: {
    backgroundColor: '#F7F9FC',
    flex: 1,
  },
  siteManagerHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  siteManagerCloseButton: {
    alignItems: 'flex-start',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  siteManagerTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
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
  professionalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#93C5FD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  professionalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  professionalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  professionalInfo: {
    flex: 1,
  },
  professionalName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  professionalRole: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  professionalDetails: {
    gap: 10,
  },
  professionalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  professionalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    width: 80,
  },
  professionalDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  consumptionCardName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  consumptionCardRole: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  consumptionDetailLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  consumptionDetailValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  siteContactsSection: {
    marginTop: 2,
  },
  siteContactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  siteContactsTitleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteContactsIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  siteContactsTitle: {
    color: '#293241',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  siteContactsSubtitle: {
    color: '#7C8494',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 1,
  },
  siteContactsCountBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  siteContactsCountText: {
    color: '#4338CA',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  siteContactCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E9EF',
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#182230',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  siteContactHeading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  siteContactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  siteContactAvatarText: {
    color: '#4F46E5',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  siteContactIdentity: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  siteContactCallButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#DDE3FF',
    borderRadius: 11,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    marginLeft: 8,
    width: 38,
  },
  siteContactName: {
    maxWidth: '100%',
    color: '#293241',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  siteContactRoleBadge: {
    maxWidth: '100%',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#F2F4F7',
  },
  siteContactRoleText: {
    color: '#626C7C',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  siteContactPrimaryMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
  },
  siteContactMetaRow: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 126,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  siteContactMetaText: {
    flex: 1,
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  siteContactDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F4',
  },
  siteContactDetailItem: {
    flexBasis: '46%',
    flexGrow: 1,
    minWidth: 126,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  siteContactDetailTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  siteContactDetailLabel: {
    color: '#7C8494',
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    marginBottom: 1,
  },
  siteContactDetailValue: {
    color: '#293241',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    paddingBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    backgroundColor: '#4F46E5',
  },
  heroEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.55,
  },
  birthdayCard: {
    backgroundColor: '#FFF5F8',
    borderColor: '#FBCFE8',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  birthdayCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthdayMessage: {
    color: '#9D174D',
    fontSize: 13,
    marginTop: 2,
  },
  birthdayTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  birthdayTitle: {
    color: '#831843',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
});

const editCustomerStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F5F8',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E7EAF0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 16,
  },
  headerButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  title: {
    color: '#202938',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
  },
  subtitle: {
    color: '#7C8494',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E7EAF0',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabItem: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 40,
  },
  activeTab: {
    backgroundColor: '#EEF2FF',
  },
  tabText: {
    color: '#7C8494',
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#4F46E5',
  },
  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7EAF0',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderColor: '#DCE1EA',
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  dateInput: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  selectWrapper: {
    marginBottom: 16,
  },
  locationButton: {
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  locationButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E7EAF0',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 11,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  cancelButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '800',
  },
});

export default CustomerDetails;


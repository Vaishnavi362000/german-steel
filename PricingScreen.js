import { API_BASE_URL } from './config/api';
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, TextInput, 
  StyleSheet, ScrollView, ActivityIndicator, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { localPricingDate, isValidPricingAmount, hasPricingBrand } from './utils/pricingValidation';

const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempDate, setTempDate] = useState(dateRange?.start);
  const today = localPricingDate();

  const applyDate = () => {
    const d = tempDate || today;
    onDateRangeChange?.({ start: d, end: d });
    setCalendarVisible(false);
  };

  const formatted = new Date(`${dateRange.start}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.dateRangeSelectorContainer}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Pricing date: ${formatted}`} style={styles.dateRangeButton} onPress={() => { setTempDate(dateRange.start); setCalendarVisible(true); }}>
        <Ionicons name="calendar-outline" size={24} color="#6C63FF" />
        <Text style={styles.dateRangeText}>{formatted}</Text>
      </TouchableOpacity>

      <Modal visible={isCalendarVisible} transparent animationType="slide" onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.calendarContainer}>
            <Calendar
              current={tempDate || today}
              maxDate={today}
              onDayPress={(day) => setTempDate(day.dateString)}
              markedDates={{
                [(tempDate || today)]: { selected: true, selectedColor: '#6C63FF' },
              }}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setCalendarVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.applyButton]} onPress={applyDate}>
                <Text style={styles.buttonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const PricingScreen = ({ authToken }) => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const submitLock = useRef(false);
  const fetchSequence = useRef(0);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pricingData, setPricingData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ 
    start: localPricingDate(),
    end: localPricingDate()
  });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [brandNameError, setBrandNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('main');
  const [otherBrand, setOtherBrand] = useState('');

  const brands = [
    ...[
      'Gajkesari', 'SRJ', 'Metaroll', 'Rajuri', 'Kalika', 'Polaad',
      'Uma', 'Shakti gold', 'GSPL', 'Roopam',
    ].sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' })),
    'Others',
  ];

  useEffect(() => {
    if (isFocused) fetchPricingData();
    return () => { fetchSequence.current += 1; };
  }, [dateRange, authToken, isFocused]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  // When modal opens, show brand selection if no brand is selected
  useEffect(() => {
    if (isBottomSheetOpen && !brandName) {
      setView('selectBrand');
    } else if (isBottomSheetOpen && brandName) {
      setView('main');
    }
  }, [isBottomSheetOpen]);

  const fetchPricingData = async () => {
    const sequence = ++fetchSequence.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      
      if (!authToken || !employeeId) throw new Error('Please sign in again to view pricing.');
      
      const response = await axios.get(
        `${API_BASE_URL}/brand/getByDateRangeForEmployee?start=${dateRange.start}&end=${dateRange.end}&id=${employeeId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      
      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse || !Array.isArray(response.data)) throw new Error('Unexpected pricing response. Please try again.');
      if (sequence === fetchSequence.current) setPricingData(response.data);
    } catch (error) {
      if (sequence === fetchSequence.current) {
        setPricingData([]);
        setLoadError('Could not load pricing. Please try again.');
      }
    } finally {
      if (sequence === fetchSequence.current) setIsLoading(false);
    }
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleSubmitPricing = async () => {
    if (submitLock.current) return;
    setSubmitError('');
    if (!validateForm()) return;
    if (dateRange.start !== localPricingDate()) {
      setSubmitError('Prices can only be added for today. Close this form and select today.');
      return;
    }
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const employeeId = await AsyncStorage.getItem('employeeId');
      if (!authToken || !employeeId) throw new Error('Please sign in again.');
      // Recheck today's records before saving, including prices added on another device.
      const existing = await axios.get(`${API_BASE_URL}/brand/getByDateRangeForEmployee?start=${localPricingDate()}&end=${localPricingDate()}&id=${employeeId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!Array.isArray(existing.data)) throw new Error('Could not check existing prices. Please try again.');
      if (hasPricingBrand(existing.data, brandName)) {
        setBrandNameError('A price for this brand has already been added today.');
        return;
      }
      const response = await axios.post(
        `${API_BASE_URL}/brand/create`,
        {
          brandName: brandName.trim(),
          price: Number(price),
          employeeDto: { id: employeeId },
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [PRICING] Server returned HTML instead of JSON');
        setSubmitError('Authentication issue. Please sign in again.');
        return;
      }

      if (response.data) {
        setBrandName('');
        setPrice('');
        setIsBottomSheetOpen(false);
        setSuccessMessage('Price added successfully.');
        fetchPricingData();
      } else {
        setSubmitError('The server did not confirm the save. Check the list before trying again.');
      }
    } catch (error) {
      setSubmitError('Could not save the price. Check your connection and try again.');
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    if (!brandName.trim()) {
      setBrandNameError('Brand name is required');
      isValid = false;
    } else {
      setBrandNameError('');
    }

    if (!price.trim()) {
      setPriceError('Price is required');
      isValid = false;
    } else if (!isValidPricingAmount(price)) {
      setPriceError('Enter a price greater than zero, with up to 2 decimal places.');
      isValid = false;
    } else {
      setPriceError('');
    }

    // Prevent adding price for the same brand twice on the same day
    // We only allow a single entry per brand per selected date (dateRange.start)
    const hasDuplicateForDay = hasPricingBrand(pricingData, brandName);

    if (hasDuplicateForDay) {
      setBrandNameError('You have already added a price for this brand today');
      isValid = false;
    }

    return isValid;
  };

  const renderPricingItem = ({ item }) => (
    <View style={styles.pricingItem}>
      <Text style={styles.brandName}>{item.brandName}</Text>
      <Text style={styles.price}>₹{item.price} per ton</Text>
    </View>
  );

  const renderInputField = (label, value, setValue, error, placeholder, keyboardType = 'default') => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );

  const handleSelectBrand = (brand) => {
    setBrandNameError('');
    if (brand === 'Others') {
      setView('addOtherBrand');
    } else {
      setBrandName(brand);
      setBrandNameError('');
      setView('main');
    }
  };

  const handleAddOtherBrand = () => {
    if (otherBrand.trim()) {
      setBrandName(otherBrand.trim());
      setBrandNameError('');
      setOtherBrand('');
      setView('main');
    } else {
      setBrandNameError('Enter a brand name.');
    }
  };

  const handleCloseModal = () => {
    setIsBottomSheetOpen(false);
    // Reset form fields when closing modal
    setBrandName('');
    setPrice('');
    setBrandNameError('');
    setPriceError('');
    setOtherBrand('');
    setSubmitError('');
    setView('selectBrand');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButtonHeader}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#6C63FF" />
        </TouchableOpacity>
        <Text style={styles.title}>Pricing</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.content}>
        <DateRangeSelector
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
        />
        {successMessage ? <Text accessibilityRole="alert" style={{ color: '#047857', paddingHorizontal: 16, marginBottom: 12 }}>{successMessage}</Text> : null}
        {loadError ? <View style={{ padding: 16 }}>
          <Text accessibilityRole="alert" style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity accessibilityRole="button" onPress={fetchPricingData}><Text style={styles.price}>Retry</Text></TouchableOpacity>
        </View> : null}
        {isLoading ? (
          <ActivityIndicator style={styles.loadingIndicator} size="large" color="#6C63FF" />
        ) : (
          <FlatList
            style={styles.pricingList}
            data={pricingData}
            renderItem={renderPricingItem}
            keyExtractor={(item) => item.id.toString()}
            ListEmptyComponent={!loadError ? <Text style={styles.emptyText}>No prices recorded for this date.</Text> : null}
            contentContainerStyle={styles.listContent}
          />
        )}
        {(() => {
          const today = localPricingDate();
          if (dateRange.start !== today) return null;
          return (
            <TouchableOpacity style={styles.addButton} onPress={() => setIsBottomSheetOpen(true)}>
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.addButtonText}>Add Pricing</Text>
            </TouchableOpacity>
          );
        })()}
      </View>

      <Modal
        visible={isBottomSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalBackground}>
          <View style={styles.bottomSheet}>
            {view === 'main' && (
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetHeaderText}>Add Pricing</Text>
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
            )}
            <ScrollView style={styles.sheetBody}>
              {view === 'main' && (
                <>
                  <TouchableOpacity
                    style={styles.brandSelector}
                    onPress={() => setView('selectBrand')}
                  >
                    <Text style={styles.brandSelectorText}>{brandName || 'Select Brand'}</Text>
                    <Ionicons name="chevron-forward" size={24} color="#6C63FF" />
                  </TouchableOpacity>
                  {brandNameError ? <Text accessibilityRole="alert" style={styles.errorText}>{brandNameError}</Text> : null}
                  {renderInputField('Price per ton', price, setPrice, priceError, 'Enter price', 'numeric')}
                  {submitError ? <Text accessibilityRole="alert" style={styles.errorText}>{submitError}</Text> : null}
                </>
              )}
              {view === 'selectBrand' && (
                <>
                  <View style={styles.sectionHeader}>
                    <View style={{ width: 24 }} />
                    <Text style={styles.sectionTitle}>Select Brand</Text>
                    <TouchableOpacity onPress={handleCloseModal}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  {brands.map((brand) => (
                    <TouchableOpacity
                      key={brand}
                      style={styles.brandOption}
                      onPress={() => handleSelectBrand(brand)}
                    >
                      <Text style={styles.brandOptionText}>{brand}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
              {view === 'addOtherBrand' && (
                <>
                  <View style={styles.sectionHeader}>
                    <TouchableOpacity 
                      onPress={() => {
                        setOtherBrand('');
                        setView('selectBrand');
                      }} 
                      style={styles.backButton}
                    >
                      <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.sectionTitle}>Add Other Brand</Text>
                    <TouchableOpacity onPress={handleCloseModal}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>
                  {renderInputField('Brand Name', otherBrand, setOtherBrand, brandNameError, 'Enter brand name')}
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddOtherBrand}>
                    <Text style={styles.submitButtonText}>Add Brand</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
            {view === 'main' && (
              <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmitPricing}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Pricing</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    paddingTop: 14,
    backgroundColor: '#FFFFFF',
  },
  dateRangeSelectorContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F2F4',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  dateRangeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  pricingItem: {
    backgroundColor: '#F1F2F4',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  price: {
    fontSize: 14,
    color: '#6C63FF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexGrow: 1,
  },
  pricingList: {
    flex: 1,
  },
  loadingIndicator: {
    flex: 1,
  },
  addButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  sheetBody: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
  },
  inputError: {
    borderColor: 'red',
    borderWidth: 1,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 5,
  },
  submitButton: {
    backgroundColor: '#6C63FF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A5A5A5',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  brandSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  brandSelectorText: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
  },
  brandOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  brandOptionText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '90%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f2f2f2',
  },
  applyButton: {
    backgroundColor: '#6C63FF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default PricingScreen;

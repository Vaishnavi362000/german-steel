import React, { useState, useEffect } from 'react';
import { 
  View, Text, TouchableOpacity, FlatList, TextInput, 
  StyleSheet, Alert, ScrollView, ActivityIndicator, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [tempDate, setTempDate] = useState(dateRange?.start);
  const today = new Date().toISOString().split('T')[0];

  const applyDate = () => {
    const d = tempDate || today;
    onDateRangeChange?.({ start: d, end: d });
    setCalendarVisible(false);
  };

  const formatted = new Date(dateRange.start).toLocaleDateString();

  return (
    <View style={styles.dateRangeSelectorContainer}>
      <TouchableOpacity style={styles.dateRangeButton} onPress={() => setCalendarVisible(true)}>
        <Ionicons name="calendar-outline" size={24} color="#6C63FF" />
        <Text style={styles.dateRangeText}>{formatted}</Text>
      </TouchableOpacity>

      <Modal visible={isCalendarVisible} transparent animationType="slide">
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
  const [pricingData, setPricingData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [price, setPrice] = useState('');
  const [brandNameError, setBrandNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [view, setView] = useState('main');
  const [otherBrand, setOtherBrand] = useState('');
  const [employeeData, setEmployeeData] = useState(null);
  const [metric, setMetric] = useState('per ton');

  const brands = [
    'Gajkesari', 'SRJ', 'Metaroll', 'Rajuri', 'Kalika', 'Polaad', 
    'Uma', 'Shakti gold', 'GSPL', 'Roopam', 'Others'
  ];

  const metrics = [
    'per ton', 'per kg', 'per bag', 'per piece', 'per unit'
  ];

  useEffect(() => {
    fetchEmployeeData();
    fetchPricingData();
  }, [dateRange]);

  const fetchEmployeeData = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await axios.get(
        'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/employee/me',
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (!isHtmlResponse) {
        setEmployeeData(response.data);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const fetchPricingData = async () => {
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const employeeId = await AsyncStorage.getItem('employeeId');
      
      if (!token) {
        console.error('Auth token not found');
        setPricingData([]);
        return;
      }
      
      const response = await axios.get(
        `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/brand/getByDateRangeForEmployee?start=${dateRange.start}&end=${dateRange.end}&id=${employeeId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );
      
      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [PRICING] Server returned HTML instead of JSON');
        setPricingData([]);
        return;
      }
      
      setPricingData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching pricing data:', error);
      setPricingData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (newDateRange) => {
    setDateRange(newDateRange);
  };

  const handleSubmitPricing = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const employeeId = await AsyncStorage.getItem('employeeId');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        return;
      }
      
      // Prevent duplicate price entry for same brand and city by same employee (check against TODAY on server)
      try {
        const today = new Date().toISOString().split('T')[0];
        const dupResp = await axios.get(
          `https://unbalkingly-uncharged-elizabet.ngrok-free.dev/brand/getByDateRangeForEmployee?start=${today}&end=${today}&id=${employeeId}`,
          { headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true', 'User-Agent': 'IconMobile' } }
        );
        const todayData = Array.isArray(dupResp.data) ? dupResp.data : [];
        const normalizedBrand = (brandName || '').trim().toLowerCase();
        const city = (employeeData?.assignedCity?.[0] || '').trim().toLowerCase();
        const duplicate = todayData.some((p) => {
          const pBrand = (p?.brandName || '').trim().toLowerCase();
          const pCity = (p?.city || '').trim().toLowerCase();
          const pEmpId = String(p?.employeeDto?.id || p?.employeeId || '');
          return pBrand === normalizedBrand && pCity === city && pEmpId === String(employeeId);
        });
        if (duplicate) {
          setIsSubmitting(false);
          Alert.alert('Duplicate', 'You have already added a price for this brand and city today.');
          return;
        }
      } catch (_) {}

      const payload = {
        brandName: brandName.trim(),
        price: parseFloat(price),
        city: employeeData?.assignedCity?.[0] || '', // Get first assigned city or empty string
        state: employeeData?.state || '', // Get state from employee data
        metric: metric, // Selected metric
        employeeDto: { id: parseInt(employeeId) },
      };

      console.log('🔵 [PRICING] Creating pricing with payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(
        'https://unbalkingly-uncharged-elizabet.ngrok-free.dev/brand/create',
        payload,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'IconMobile',
          },
        }
      );

      console.log('✅ [PRICING] API Response:', JSON.stringify(response.data, null, 2));

      // Check if response is HTML instead of JSON
      const isHtmlResponse = typeof response.data === 'string' && 
        (response.data.includes('<!DOCTYPE html>') || response.data.includes('<html>'));
      
      if (isHtmlResponse) {
        console.log('⚠️ [PRICING] Server returned HTML instead of JSON');
        Alert.alert('Error', 'Authentication issue. Please try logging in again.');
        return;
      }

      if (response.data) {
        setBrandName('');
        setPrice('');
        setIsBottomSheetOpen(false);
        Alert.alert('Success', 'Pricing added successfully');
        fetchPricingData();
      }
    } catch (error) {
      console.error('Error adding pricing:', error);
      Alert.alert('Error', error.response?.data || 'Failed to add pricing. Please try again.');
    } finally {
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
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      setPriceError('Please enter a valid price');
      isValid = false;
    } else {
      setPriceError('');
    }

    return isValid;
  };

  const renderPricingItem = ({ item }) => (
    <View style={styles.pricingItem}>
      <Text style={styles.brandName}>{item.brandName}</Text>
      <Text style={styles.price}>₹{item.price} {item.metric || 'per ton'}</Text>
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
      Alert.alert('Error', 'Please enter a brand name');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pricing</Text>
      <DateRangeSelector
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#6C63FF" />
      ) : (
        <FlatList
          data={pricingData}
          renderItem={renderPricingItem}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No pricing data available</Text>}
        />
      )}
      {(() => {
        const today = new Date().toISOString().split('T')[0];
        const isTodaySelected = dateRange.start === today;
        if (!isTodaySelected) {
          return (
            null
          );
        }
        return (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsBottomSheetOpen(true)}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Pricing</Text>
          </TouchableOpacity>
        );
      })()}

      <Modal
        visible={isBottomSheetOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsBottomSheetOpen(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetHeaderText}>Add Pricing</Text>
              <TouchableOpacity onPress={() => setIsBottomSheetOpen(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
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
                  {/* Price and Metric Row */}
                  <View style={styles.priceMetricContainer}>
                    <Text style={styles.priceMetricLabel}>Price {metric}</Text>
                    <View style={styles.priceMetricRow}>
                      <View style={styles.priceContainer}>
                        <TextInput
                          style={[styles.priceInput, priceError ? styles.inputError : null]}
                          value={price}
                          onChangeText={setPrice}
                          placeholder="Enter price"
                          keyboardType="numeric"
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.metricSelector}
                        onPress={() => setView('selectMetric')}
                      >
                        <Text style={styles.metricSelectorText}>{metric}</Text>
                        <Ionicons name="chevron-forward" size={20} color="#6C63FF" />
                      </TouchableOpacity>
                    </View>
                    {priceError ? <Text style={styles.errorText}>{priceError}</Text> : null}
                  </View>
                  
                  {/* City and State Display */}
                  <View style={styles.locationContainer}>
                    <Text style={styles.locationLabel}>Location</Text>
                    <View style={styles.locationRow}>
                      <View style={styles.locationField}>
                        <Text style={styles.locationFieldLabel}>City</Text>
                        <Text style={styles.locationFieldValue}>
                          {employeeData?.assignedCity?.[0] || 'Not available'}
                        </Text>
                      </View>
                      <View style={styles.locationField}>
                        <Text style={styles.locationFieldLabel}>State</Text>
                        <Text style={styles.locationFieldValue}>
                          {employeeData?.state || 'Not available'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}
              {view === 'selectBrand' && (
                <>
                  <Text style={styles.sectionTitle}>Select Brand</Text>
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
                  <Text style={styles.sectionTitle}>Add Other Brand</Text>
                  {renderInputField('Brand Name', otherBrand, setOtherBrand, '', 'Enter brand name')}
                  <TouchableOpacity style={styles.submitButton} onPress={handleAddOtherBrand}>
                    <Text style={styles.submitButtonText}>Add Brand</Text>
                  </TouchableOpacity>
                </>
              )}
              {view === 'selectMetric' && (
                <>
                  <Text style={styles.sectionTitle}>Select Metric</Text>
                  {metrics.map((metricOption) => (
                    <TouchableOpacity
                      key={metricOption}
                      style={styles.metricOption}
                      onPress={() => {
                        setMetric(metricOption);
                        setView('main');
                      }}
                    >
                      <Text style={styles.metricOptionText}>{metricOption}</Text>
                    </TouchableOpacity>
                  ))}
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
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  dateRangeSelectorContainer: {
    marginBottom: 16,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dateRangeText: {
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  pricingItem: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 16,
    color: '#6C63FF',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
  addButton: {
    backgroundColor: '#6C63FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
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
  locationContainer: {
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  locationField: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  locationFieldLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  locationFieldValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  priceMetricContainer: {
    marginBottom: 20,
  },
  priceMetricLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  priceMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  priceContainer: {
    flex: 2,
  },
  priceInput: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 5,
    fontSize: 16,
    height: 50,
  },
  metricSelector: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5, // Match input field border radius
    height: 50, // Exact height to match input field
  },
  metricSelectorText: {
    fontSize: 16,
  },
  metricOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  metricOptionText: {
    fontSize: 16,
  },
});

export default PricingScreen;